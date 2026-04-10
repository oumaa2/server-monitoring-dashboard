package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.service.PrometheusService;
import com.monitoring.monitoring_backend.service.SettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private com.monitoring.monitoring_backend.repository.AlertRepository alertRepository;

    @Autowired
    private com.monitoring.monitoring_backend.service.ServerCacheService serverCacheService;

    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private SettingsService settingsService;

    @GetMapping("/hello")
    public String hello() {
        return "Hello World";
    }

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        List<Server> servers = serverCacheService.getAllServers();
        stats.put("totalServers", servers.size());

        Map<String, Object> alertsData = getAlerts();
        @SuppressWarnings("unchecked")
        Map<String, Integer> summary = (Map<String, Integer>) alertsData.get("summary");
        stats.put("activeAlerts", summary != null ? summary.get("total") : 0);

        Double rps = prometheusService.executeNumericQuery(
                "sum(rate(http_requests_total[5m]))");
        if (rps == null || rps == 0.0) {
            rps = prometheusService.executeNumericQuery("sum(rate(prometheus_http_requests_total[5m]))");
        }
        stats.put("requestsPerSec", rps != null ? rps : 0.0);

        Double errorRate = prometheusService.executeNumericQuery(
                "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100");
        if (errorRate == null || errorRate.isNaN()) {
            errorRate = prometheusService.executeNumericQuery(
                    "sum(rate(prometheus_http_requests_total{code=~\"5..\"}[5m])) / sum(rate(prometheus_http_requests_total[5m])) * 100");
        }
        stats.put("errorRate", errorRate != null && !errorRate.isNaN() ? errorRate : 0.0);

        Double latency = prometheusService.executeNumericQuery(
                "avg(prometheus_http_request_duration_seconds_sum / prometheus_http_request_duration_seconds_count) * 1000");
        if (latency == null || latency.isNaN()) {
            latency = prometheusService.executeNumericQuery(
                    "avg(wildfly_undertow_processing_time_total_seconds / wildfly_undertow_request_count_total) * 1000");
        }
        stats.put("avgLatency", latency != null && !latency.isNaN() ? latency : 0.0);

        stats.put("avgCpu", prometheusService.executeNumericQuery(
                "100 - (avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"));
        stats.put("avgMemory", prometheusService.executeNumericQuery(
                "(1 - (avg(node_memory_MemAvailable_bytes) / avg(node_memory_MemTotal_bytes))) * 100"));

        stats.put("lastError", prometheusService.getLastError());
        return stats;
    }

    private String sanitizeIp(String ip) {
        if (ip == null) return "localhost";
        // Remove CIDR suffix if any (e.g., 192.168.56.101/32)
        return ip.split("/")[0].trim();
    }

    private boolean isServerUp(Server s) {
        String ip = sanitizeIp(s.getIpAddress());
        String role = s.getRole() != null ? s.getRole().toLowerCase() : "";
        String stack = s.getServiceName() != null ? s.getServiceName().toLowerCase() : "";
        
        try {
            String upQuery;
            
            // strict exporter port mapping based on role/stack
            if (role.contains("database") || stack.contains("postgres")) {
                upQuery = "pg_up{instance=~\"" + ip + ":9187\"}";
            } else if (stack.contains("oracle")) {
                upQuery = "oracledb_up{instance=~\"" + ip + ":9161\"}";
            } else if (role.contains("web") || stack.contains("wildfly")) {
                upQuery = "up{instance=~\"" + ip + ":9990\"}";
            } else if (role.contains("monitoring") || stack.contains("prometheus")) {
                upQuery = "(up{instance=~\"(localhost|" + ip + "):9090\"} or up{instance=~\"(localhost|" + ip + "):9100\"})";
            } else {
                // fallback to OS node_exporter
                upQuery = "up{instance=~\"(localhost|" + ip + "):9100\"}";
            }
            
            String result = prometheusService.queryPrometheusRaw(upQuery);
            return result != null && result.contains("\"1\"");
        } catch (Exception e) {
            return false;
        }
    }

    @GetMapping(value = "/history", produces = "application/json")
    public String getHistory(
            @RequestParam(name = "hostname", required = false) String hostname,
            @RequestParam(name = "type") String type,
            @RequestParam(name = "range", required = false, defaultValue = "24h") String range,
            @RequestParam(name = "step", required = false, defaultValue = "1m") String step) {
        try {
            String query = "";
            String ipFilter = "";

            if (hostname != null && !hostname.isEmpty()) {
                Optional<Server> server = serverCacheService.getAllServers().stream()
                        .filter(s -> s.getHostname().equals(hostname))
                        .findFirst();
                if (server.isPresent()) {
                    String ip = sanitizeIp(server.get().getIpAddress());
                    String label = ip + ":9100";
                    if (server.get().getRole().equalsIgnoreCase("monitoring") || hostname.contains("master")) {
                        label = "localhost:9090";
                    }
                    ipFilter = ",instance=\"" + label + "\"";
                }
            }

            switch (type) {
                case "cpu":
                    query = "100 - (avg" + (ipFilter.isEmpty() ? "" : " by(instance)")
                            + " (rate(node_cpu_seconds_total{mode=\"idle\"" + ipFilter + "}[5m])) * 100)";
                    break;
                case "memory":
                    if (ipFilter.isEmpty()) {
                        query = "(1 - (avg(node_memory_MemAvailable_bytes) / avg(node_memory_MemTotal_bytes))) * 100";
                    } else {
                        query = "(1 - (node_memory_MemAvailable_bytes{" + ipFilter.substring(1)
                                + "} / node_memory_MemTotal_bytes{" + ipFilter.substring(1) + "})) * 100";
                    }
                    break;
                case "network":
                    query = "sum(rate(node_network_receive_bytes_total{"
                            + (ipFilter.isEmpty() ? "" : ipFilter.substring(1))
                            + "}[5m]))";
                    break;
                case "disk":
                    query = "(1 - (sum(node_filesystem_avail_bytes{mountpoint=\"/\"" + ipFilter
                            + "}) / sum(node_filesystem_size_bytes{mountpoint=\"/\"" + ipFilter + "}))) * 100";
                    break;
                case "traffic":
                    query = "(sum(rate(prometheus_http_requests_total"
                            + (ipFilter.isEmpty() ? "" : "{" + ipFilter.substring(1) + "}") + "[5m])) "
                            + "or vector(0)) + (sum(rate(wildfly_undertow_request_count_total"
                            + (ipFilter.isEmpty() ? "" : "{" + ipFilter.substring(1) + "}") + "[5m])) "
                            + "or vector(0))";
                    break;
                case "error_rate":
                    // To avoid division by zero (NaN), we filter denominator > 0. If it drops to
                    // empty, or vector(0) returns 0.
                    query = "(sum(rate(prometheus_http_requests_total{code=~\"5..\"" + ipFilter
                            + "}[5m])) / (sum(rate(prometheus_http_requests_total"
                            + (ipFilter.isEmpty() ? "" : "{" + ipFilter.substring(1) + "}")
                            + "[5m])) > 0) * 100) or vector(0)";
                    break;
                default:
                    return "{\"error\": \"Invalid type\"}";
            }

            Double promNow = prometheusService.executeNumericQuery("time()");
            long end = (promNow != null && promNow > 0) ? promNow.longValue() : System.currentTimeMillis() / 1000;
            long start = end - parseRange(range);

            return prometheusService.queryPrometheusRange(query, String.valueOf(start), String.valueOf(end), step);
        } catch (Exception e) {
            return "{\"status\":\"error\", \"source\":\"controller\", \"error\":\"" + e.getMessage() + "\"}";
        }
    }

    private long parseRange(String range) {
        if (range.endsWith("h"))
            return Long.parseLong(range.replace("h", "")) * 3600;
        if (range.endsWith("d"))
            return Long.parseLong(range.replace("d", "")) * 86400;
        if (range.endsWith("m"))
            return Long.parseLong(range.replace("m", "")) * 60;
        return 3600;
    }

    @GetMapping("/summary")
    public List<Map<String, Object>> getDashboardSummary() {
        List<Server> servers = serverCacheService.getAllServers();
        List<Map<String, Object>> summary = new ArrayList<>();

        for (Server server : servers) {
            Map<String, Object> data = new HashMap<>();
            String ip = sanitizeIp(server.getIpAddress());
            data.put("id", server.getId());
            data.put("name", server.getHostname());
            data.put("role", server.getRole());
            data.put("ip", ip);
            data.put("stack", server.getServiceName() != null ? server.getServiceName() : "Standard");

            boolean isUp = isServerUp(server);
            data.put("status", isUp ? "online" : "offline");

            if (isUp) {
                double cpu = prometheusService.executeNumericQuery(
                    "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\",instance=~\"" + ip + ":9100|localhost:9090|" + ip + ":9090\"}[5m])) * 100)");
                double ram = prometheusService.executeNumericQuery(
                    "(1 - (node_memory_MemAvailable_bytes{instance=~\"" + ip + ":9100|localhost:9090|" + ip + ":9090\"} / node_memory_MemTotal_bytes{instance=~\"" + ip + ":9100|localhost:9090|" + ip + ":9090\"})) * 100");
                double disk = prometheusService.executeNumericQuery(
                    "(1 - (node_filesystem_avail_bytes{instance=~\"" + ip + ":9100|localhost:9090\",mountpoint=\"/\"} / node_filesystem_size_bytes{instance=~\"" + ip + ":9100|localhost:9090\",mountpoint=\"/\"})) * 100");
                double networkBytes = prometheusService.executeNumericQuery(
                    "sum(rate(node_network_receive_bytes_total{instance=~\"" + ip + ":9100|localhost:9090|" + ip + ":9090\"}[5m]))");

                data.put("cpu", Math.round(cpu * 10.0) / 10.0);
                data.put("memory", Math.round(ram * 10.0) / 10.0);
                data.put("disk", Math.round(disk * 10.0) / 10.0);
                data.put("network", formatNetwork(networkBytes));
            } else {
                data.put("cpu", 0);
                data.put("memory", 0);
                data.put("disk", 0);
                data.put("network", "0 MB/s");
            }
            data.put("lastCheck", "Just now");
            summary.add(data);
        }
        return summary;
    }

    @GetMapping("/alerts")
    public Map<String, Object> getAlerts() {
        List<Map<String, Object>> allAlerts = new ArrayList<>();
        List<com.monitoring.monitoring_backend.entity.Alert> allAcks = new ArrayList<>();
        try {
            allAcks = alertRepository.findAll();
        } catch (Exception e) {
            System.err.println("DB Warning: " + e.getMessage());
        }
        // 1. Native Prometheus Alerts
        try {
            String rawAlerts = prometheusService.getPrometheusAlerts();
            if (rawAlerts != null) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(rawAlerts);
                com.fasterxml.jackson.databind.JsonNode alertsNode = root.path("data").path("alerts");
                
                if (alertsNode.isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode a : alertsNode) {
                        Map<String, Object> alert = new HashMap<>();
                        com.fasterxml.jackson.databind.JsonNode labels = a.path("labels");
                        com.fasterxml.jackson.databind.JsonNode annotations = a.path("annotations");
                        
                        String alertId = UUID.randomUUID().toString();
                        alert.put("id", alertId);
                        alert.put("title", labels.path("alertname").asText("Unknown Alert"));
                        alert.put("severity", labels.path("severity").asText("warning"));
                        alert.put("source", "Prometheus");
                        alert.put("description", annotations.path("description").asText(annotations.path("summary").asText("No description available.")));
                        alert.put("triggeredAt", a.path("activeAt").asText(java.time.OffsetDateTime.now().toString()));
                        
                        String resourceIp = labels.path("instance").asText("Unknown");
                        boolean isAck = false;
                        try {
                            isAck = allAcks.stream()
                                .anyMatch(ack -> ack.isAcknowledged() && 
                                               ack.getTitle().equals(labels.path("alertname").asText()) && 
                                               resourceIp.equals(ack.getAffectedResourceIp()));
                        } catch (Exception e) {}

                        alert.put("status", isAck ? "acknowledged" : a.path("state").asText("firing"));
                        
                        Map<String, String> resource = new HashMap<>();
                        resource.put("type", "infrastructure");
                        resource.put("name", labels.path("instance").asText("Infrastructure"));
                        resource.put("ip", resourceIp);
                        alert.put("affectedResource", resource);
                        alert.put("metric", labels.path("alertname").asText());
                        
                        allAlerts.add(alert);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing Prometheus alerts: " + e.getMessage());
        }

        // 2. Derived Alerts (Backend Checks)
        List<Server> servers = serverCacheService.getAllServers();
        String nowIso = java.time.OffsetDateTime.now().toString();
        for (Server s : servers) {
            boolean isUp = isServerUp(s);
            if (!isUp) {
                Map<String, Object> alert = new HashMap<>();
                String alertId = "node-down-" + s.getHostname();
                alert.put("id", alertId);
                alert.put("title", "Node Exporter Down");
                alert.put("severity", "critical");
                alert.put("source", "Backend Monitor");
                alert.put("description", "Node Exporter is unreachable on " + s.getHostname());
                alert.put("triggeredAt", nowIso);
                
                boolean isAck = false;
                try {
                    isAck = allAcks.stream()
                        .anyMatch(ack -> ack.isAcknowledged() && 
                                       ack.getTitle().equals("Node Exporter Down") && 
                                       s.getIpAddress().equals(ack.getAffectedResourceIp()));
                } catch (Exception e) {}
                
                alert.put("status", isAck ? "acknowledged" : "active");
                
                Map<String, String> resource = new HashMap<>();
                resource.put("type", "server");
                resource.put("name", s.getHostname());
                resource.put("ip", s.getIpAddress());
                alert.put("affectedResource", resource);
                alert.put("metric", "up");
                
                allAlerts.add(alert);
            } else {
                String ip = s.getIpAddress();

                // Use user-configurable thresholds from SettingsService
                double cpuT  = settingsService.getCpuThreshold();
                double memT  = settingsService.getMemThreshold();
                double diskT = settingsService.getDiskThreshold();

                // CPU alert
                double cpu = prometheusService.getCpuUsage(ip);
                if (cpu > cpuT) {
                    Map<String, Object> alert = new HashMap<>();
                    String alertId = "high-cpu-" + s.getHostname();
                    alert.put("id", alertId);
                    alert.put("title", "High CPU Usage (" + Math.round(cpu) + "%)");
                    alert.put("severity", cpu > 95 ? "critical" : "warning");
                    alert.put("source", "Backend Monitor");
                    alert.put("description", "CPU usage exceeded " + (int) cpuT + "% threshold on " + s.getHostname());
                    alert.put("triggeredAt", nowIso);
                    boolean isAck = false;
                    try {
                        isAck = allAcks.stream()
                            .anyMatch(ack -> ack.isAcknowledged() && 
                                           ack.getTitle().startsWith("High CPU Usage") && 
                                           s.getIpAddress().equals(ack.getAffectedResourceIp()));
                    } catch (Exception e) {}
                    alert.put("status", isAck ? "acknowledged" : "active");
                    Map<String, String> res = new HashMap<>();
                    res.put("type", "server"); res.put("name", s.getHostname()); res.put("ip", s.getIpAddress());
                    alert.put("affectedResource", res);
                    alert.put("threshold", (int) cpuT);
                    alert.put("currentValue", Math.round(cpu));
                    alert.put("metric", "node_cpu_usage");
                    allAlerts.add(alert);
                }

                // RAM alert
                double ram = prometheusService.getMemoryUsage(ip);
                if (ram > memT) {
                    Map<String, Object> alert = new HashMap<>();
                    String alertId = "high-mem-" + s.getHostname();
                    alert.put("id", alertId);
                    alert.put("title", "High Memory Usage (" + Math.round(ram) + "%)");
                    alert.put("severity", ram > 95 ? "critical" : "warning");
                    alert.put("source", "Backend Monitor");
                    alert.put("description", "Memory usage exceeded " + (int) memT + "% threshold on " + s.getHostname());
                    alert.put("triggeredAt", nowIso);
                    boolean isAck = false;
                    try {
                        isAck = allAcks.stream()
                            .anyMatch(ack -> ack.isAcknowledged() && 
                                           ack.getTitle().startsWith("High Memory Usage") && 
                                           s.getIpAddress().equals(ack.getAffectedResourceIp()));
                    } catch (Exception e) {}
                    alert.put("status", isAck ? "acknowledged" : "active");
                    Map<String, String> res = new HashMap<>();
                    res.put("type", "server"); res.put("name", s.getHostname()); res.put("ip", s.getIpAddress());
                    alert.put("affectedResource", res);
                    alert.put("threshold", (int) memT);
                    alert.put("currentValue", Math.round(ram));
                    alert.put("metric", "node_memory_usage");
                    allAlerts.add(alert);
                }

                // Disk alert
                double disk = prometheusService.getDiskUsage(ip);
                if (disk > diskT) {
                    Map<String, Object> alert = new HashMap<>();
                    String alertId = "high-disk-" + s.getHostname();
                    alert.put("id", alertId);
                    alert.put("title", "High Disk Usage (" + Math.round(disk) + "%)");
                    alert.put("severity", disk > 95 ? "critical" : "warning");
                    alert.put("source", "Backend Monitor");
                    alert.put("description", "Disk usage exceeded " + (int) diskT + "% threshold on " + s.getHostname());
                    alert.put("triggeredAt", nowIso);
                    boolean isAck = false;
                    try {
                        isAck = allAcks.stream()
                            .anyMatch(ack -> ack.isAcknowledged() && 
                                           ack.getTitle().startsWith("High Disk Usage") && 
                                           s.getIpAddress().equals(ack.getAffectedResourceIp()));
                    } catch (Exception e) {}

                    alert.put("status", isAck ? "acknowledged" : "active");
                    Map<String, String> res = new HashMap<>();
                    res.put("type", "server"); res.put("name", s.getHostname()); res.put("ip", s.getIpAddress());
                    alert.put("affectedResource", res);
                    alert.put("threshold", (int) diskT);
                    alert.put("currentValue", Math.round(disk));
                    alert.put("metric", "node_disk_usage");
                    allAlerts.add(alert);
                }
            }
        }

        // 4. PostgreSQL Database Storage Alert (separate from disk — tracks actual DB data size)
        try {
            double dbT = settingsService.getDbStorageThreshold();

            // Total size of all PostgreSQL databases in bytes
            Double dbSizeBytes = prometheusService.executeNumericQuery("sum(pg_database_size_bytes)");
            // Total disk capacity on target-03 (the DB server)
            Double diskTotalBytes = prometheusService.executeNumericQuery(
                "sum(node_filesystem_size_bytes{instance=~\"192.168.56.104:9100\",mountpoint=\"/\"})");

            if (dbSizeBytes != null && diskTotalBytes != null && diskTotalBytes > 0) {
                double dbUsagePct = (dbSizeBytes / diskTotalBytes) * 100.0;
                // Format size for display
                String sizeStr = dbSizeBytes < 1024 * 1024 * 1024
                    ? String.format("%.1f MB", dbSizeBytes / (1024.0 * 1024.0))
                    : String.format("%.2f GB", dbSizeBytes / (1024.0 * 1024.0 * 1024.0));

                if (dbUsagePct > dbT) {
                    Map<String, Object> alert = new HashMap<>();
                    String alertId = "high-db-storage";
                    alert.put("id", alertId);
                    alert.put("title", "PostgreSQL Storage High (" + sizeStr + " — " + String.format("%.1f", dbUsagePct) + "% of disk)");
                    alert.put("severity", dbUsagePct > 95 ? "critical" : "warning");
                    alert.put("source", "Backend Monitor");
                    alert.put("description", "PostgreSQL database size has reached " + String.format("%.1f", dbUsagePct) +
                        "% of disk capacity (threshold: " + (int) dbT + "%). Current size: " + sizeStr);
                    alert.put("triggeredAt", nowIso);
                    boolean isAck = false;
                    try {
                        isAck = allAcks.stream()
                            .anyMatch(ack -> ack.isAcknowledged() && 
                                           ack.getTitle().startsWith("PostgreSQL Storage High") && 
                                           "target-03".equals(ack.getAffectedResourceIp()));
                    } catch (Exception e) {}
                    alert.put("status", isAck ? "acknowledged" : "active");
                    Map<String, String> res = new HashMap<>();
                    res.put("type", "database");
                    res.put("name", "PostgreSQL Primary");
                    res.put("ip", "target-03");
                    alert.put("affectedResource", res);
                    alert.put("threshold", (int) dbT);
                    alert.put("currentValue", Math.round(dbUsagePct));
                    alert.put("metric", "pg_database_size_bytes");
                    allAlerts.add(alert);
                }
            }
        } catch (Exception e) {
            System.err.println("Error checking PostgreSQL storage: " + e.getMessage());
        }

        // 3. Final Wrap
        Map<String, Object> response = new HashMap<>();
        response.put("alerts", allAlerts);
        
        Map<String, Integer> summary = new HashMap<>();
        summary.put("critical", (int) allAlerts.stream().filter(a -> "critical".equals(a.get("severity"))).count());
        summary.put("warning", (int) allAlerts.stream().filter(a -> "warning".equals(a.get("severity"))).count());
        summary.put("info", (int) allAlerts.stream().filter(a -> "info".equals(a.get("severity"))).count());
        summary.put("total", allAlerts.size());
        
        response.put("summary", summary);
        
        return response;
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public Map<String, Object> acknowledgeAlert(
            @PathVariable("id") String alertId,
            @RequestBody Map<String, Object> alertData) {
        
        try {
            com.monitoring.monitoring_backend.entity.Alert alert = new com.monitoring.monitoring_backend.entity.Alert();
            alert.setTitle((String) alertData.get("title"));
            alert.setSeverity((String) alertData.get("severity"));
            alert.setDescription((String) alertData.get("description"));
            alert.setSource((String) alertData.get("source"));
            alert.setAcknowledged(true);
            alert.setAcknowledgedBy("Admin");
            
            @SuppressWarnings("unchecked")
            Map<String, String> resource = (Map<String, String>) alertData.get("affectedResource");
            if (resource != null) {
                alert.setAffectedResourceType(resource.get("type"));
                alert.setAffectedResourceName(resource.get("name"));
                alert.setAffectedResourceIp(resource.get("ip"));
            }
            
            alertRepository.save(alert);
            
            Map<String, Object> res = new HashMap<>();
            res.put("status", "success");
            res.put("message", "Alert acknowledged");
            return res;
        } catch (Exception e) {
            Map<String, Object> res = new HashMap<>();
            res.put("status", "error");
            res.put("error", e.getMessage());
            return res;
        }
    }

    private String formatNetwork(double bytesPerSecond) {
        if (bytesPerSecond < 1024)
            return String.format("%.0f B/s", bytesPerSecond);
        double kbps = bytesPerSecond / 1024;
        if (kbps < 1024)
            return String.format("%.1f KB/s", kbps);
        double mbps = kbps / 1024;
        return String.format("%.1f MB/s", mbps);
    }
}
