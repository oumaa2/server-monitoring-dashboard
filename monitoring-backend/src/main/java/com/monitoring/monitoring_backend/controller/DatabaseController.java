package com.monitoring.monitoring_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.monitoring.monitoring_backend.service.PrometheusService;
import com.monitoring.monitoring_backend.service.PostgresMetricsService;
import com.monitoring.monitoring_backend.repository.ServerRepository;
import com.monitoring.monitoring_backend.entity.Server;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DatabaseController {

    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private PostgresMetricsService postgresMetricsService;

    @Autowired
    private ServerRepository serverRepository;

    @GetMapping("/databases/deep-metrics")
    public Map<String, Object> getDeepDatabaseMetrics() {
        return postgresMetricsService.getDeepMetrics();
    }

    @GetMapping("/databases")
    public Object getDatabases() {
        try {
            List<Map<String, Object>> databases = new ArrayList<>();
            List<Server> servers = serverRepository.findAll();

            for (Server s : servers) {
                try {
                    String role = s.getRole() != null ? s.getRole().toLowerCase() : "";
                    String stack = s.getServiceName() != null ? s.getServiceName() : "";
                    String stackLower = stack.toLowerCase();

                    if (role.contains("database") || stackLower.contains("postgres") || stackLower.contains("oracle")) {
                        Map<String, Object> db = new HashMap<>();
                        db.put("server", s.getHostname());
                        String ip = s.getIpAddress();

                        if (stackLower.contains("oracle") || role.contains("oracle")) {
                            // --- Oracle Logic ---
                            db.put("name", "Oracle XE Primary");
                            db.put("type", "Oracle");
                            db.put("version", "19c/XE");

                            // Status (oracledb_up)
                            Double up = prometheusService.executeNumericQuery("oracledb_up{instance=~\"" + ip + ":9161\"}");
                            db.put("status", (up != null && up == 1.0) ? "healthy" : "critical");

                            // Connections (Sessions)
                            Double sessions = prometheusService.executeNumericQuery("sum(oracledb_sessions_value{instance=~\"" + ip + ":9161\"})");
                            db.put("connections", sessions != null && !sessions.isNaN() ? sessions.intValue() : 0);

                            // Size (Sum of all datafiles in bytes)
                            Double sizeBytes = prometheusService.executeNumericQuery("sum(oracledb_datafile_bytes{instance=~\"" + ip + ":9161\"})");
                            db.put("size", formatSize(sizeBytes));
                            
                            // TPS Fallback (Oracle activity executes)
                            Double executes = prometheusService.executeNumericQuery("sum(rate(oracledb_activity_execute_count{instance=~\"" + ip + ":9161\"}[5m]))");
                            db.put("tps", executes != null && !executes.isNaN() ? Math.round(executes * 10.0) / 10.0 : 0.0);

                        } else {
                            // --- PostgreSQL Logic (Existing) ---
                            db.put("name", "PostgreSQL Primary");
                            db.put("type", "PostgreSQL");
                            db.put("version", "16.1-LIVE");

                            Double connections = prometheusService.executeNumericQuery("sum(pg_stat_database_numbackends{instance=~\"" + ip + ":9187\"})");
                            db.put("connections", connections != null && !connections.isNaN() ? connections.intValue() : 0);

                            Double tps = prometheusService.executeNumericQuery("sum(irate(pg_stat_database_xact_commit{instance=~\"" + ip + ":9187\"}[5m]))");
                            db.put("tps", tps != null && !tps.isNaN() ? Math.round(tps * 10.0) / 10.0 : 0.0);

                            Double sizeBytes = prometheusService.executeNumericQuery("sum(pg_database_size_bytes{instance=~\"" + ip + ":9187\"})");
                            db.put("size", formatSize(sizeBytes));

                            Double up = prometheusService.executeNumericQuery("up{instance=~\"" + ip + ":9187\"}");
                            boolean isHealthy = (up != null && up == 1.0) || (connections != null && connections > 0);
                            db.put("status", isHealthy ? "healthy" : "critical");
                        }
                        
                        databases.add(db);
                    }
                } catch (Exception e) {
                    System.err.println("Error processing DB server " + s.getHostname() + ": " + e.getMessage());
                }
            }
            return databases;
        } catch (Exception e) {
            System.err.println("GLOBAL DB API ERROR: " + e.getMessage());
            return new ArrayList<>(); // Return empty list instead of error object to avoid frontend crash
        }
    }

    private String formatSize(Double sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) return "0.0 MB";
        if (sizeBytes < 1024L * 1024L * 1024L) {
            double sizeMB = sizeBytes / (1024.0 * 1024.0);
            return String.format("%.1f MB", sizeMB);
        } else {
            double sizeGB = sizeBytes / (1024.0 * 1024.0 * 1024.0);
            return String.format("%.1f GB", sizeGB);
        }
    }
}
