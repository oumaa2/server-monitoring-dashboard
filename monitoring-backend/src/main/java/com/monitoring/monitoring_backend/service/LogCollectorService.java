package com.monitoring.monitoring_backend.service;

import com.monitoring.monitoring_backend.entity.LogEntry;
import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class LogCollectorService {

    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private com.monitoring.monitoring_backend.service.ServerCacheService serverCacheService;

    @Autowired
    private LogRepository logRepository;

    @Autowired
    private SettingsService settingsService;

    private final DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    // Tracks the last known status of each server to detect changes
    private final Map<String, String> lastStatusMap = new HashMap<>();

    /**
     * Polls infrastructure metrics every 60 seconds and generates logs for state changes or warnings.
     */
    @Scheduled(fixedRate = 60000)
    public void collectRealLogs() {
        List<Server> servers = serverCacheService.getAllServers();

        for (Server server : servers) {
            // 1. Monitor Server Health (Up/Down)
            checkServerHealth(server);

            // 2. Monitor Resource Thresholds (Warnings)
            checkResourceWarnings(server);
        }
    }

    private void checkServerHealth(Server server) {
        String hostname = server.getHostname();
        String instanceLabel = server.getIpAddress() + ":9100";
        String upQuery = "up{instance=\"" + instanceLabel + "\"}";
        
        boolean isUp = false;
        try {
            String result = prometheusService.queryPrometheusRaw(upQuery);
            isUp = result != null && result.contains("\"1\"");
        } catch (Exception e) {
            isUp = false;
        }

        String currentStatus = isUp ? "ONLINE" : "OFFLINE";
        String lastStatus = lastStatusMap.get(hostname + "_health");

        // Only log on transition
        if (lastStatus != null && !lastStatus.equals(currentStatus)) {
            String level = isUp ? "INFO" : "ERROR";
            String msg = String.format("Server %s is now %s", hostname, currentStatus);
            createLog(level, "infrastructure-monitor", hostname, msg, null);
        }
        
        lastStatusMap.put(hostname + "_health", currentStatus);
    }

    private void checkResourceWarnings(Server server) {
        String hostname = server.getHostname();
        String ip = server.getIpAddress();

        double memT = settingsService.getMemThreshold();
        double diskT = settingsService.getDiskThreshold();

        // Check RAM
        double ram = prometheusService.getMemoryUsage(ip);
        if (ram > memT) {
            handleThresholdLog(hostname, "RAM", ram, "WARN");
        } else {
            lastStatusMap.remove(hostname + "_RAM_warn");
        }

        // Check Disk
        double disk = prometheusService.getDiskUsage(ip);
        if (disk > diskT) {
            handleThresholdLog(hostname, "Disk", disk, "WARN");
        } else {
            lastStatusMap.remove(hostname + "_Disk_warn");
        }

        // Check DB Storage specifically for target-03 database server
        if ("target-03".equals(hostname)) {
            try {
                double dbT = settingsService.getDbStorageThreshold();
                Double dbSizeBytes = prometheusService.executeNumericQuery("sum(pg_database_size_bytes)");
                Double diskTotalBytes = prometheusService.executeNumericQuery(
                    "sum(node_filesystem_size_bytes{instance=~\"192.168.56.104:9100\",mountpoint=\"/\"})");
                
                if (dbSizeBytes != null && diskTotalBytes != null && diskTotalBytes > 0) {
                    double dbUsagePct = (dbSizeBytes / diskTotalBytes) * 100.0;
                    if (dbUsagePct > dbT) {
                        handleThresholdLog(hostname, "DB_Storage_Capacity", dbUsagePct, "WARN");
                    } else {
                        lastStatusMap.remove(hostname + "_DB_Storage_Capacity_warn");
                    }
                }
            } catch (Exception e) {
                // Ignore query failures gracefully
            }
        }
    }

    private void handleThresholdLog(String hostname, String resource, double value, String level) {
        String key = hostname + "_" + resource + "_warn";
        // Only log once per hour for the same warning to avoid spam
        if (!lastStatusMap.containsKey(key)) {
            String msg = String.format("High %s usage detected on %s: %.1f%%", resource, hostname, value);
            createLog(level, "resource-monitor", hostname, msg, null);
            lastStatusMap.put(key, "logged");
        }
    }

    private void createLog(String level, String service, String serverName, String msg, String trace) {
        LogEntry log = new LogEntry();
        log.setTimestamp(LocalDateTime.now().format(dtf));
        log.setLevel(level);
        log.setService(service);
        log.setServerName(serverName);
        log.setMessage(msg);
        log.setStackTrace(trace);
        try {
            logRepository.save(log);
            System.out.println(">>> Real log generated: [" + level + "] " + msg);
        } catch (Exception e) {
            System.err.println(">>> Failed to save log to database (DB offline): " + msg);
        }
    }
}
