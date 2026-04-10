package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.service.PrometheusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private com.monitoring.monitoring_backend.service.ServerCacheService serverCacheService;

    @GetMapping("/stats")
    public List<Map<String, Object>> getApplicationStats() {
        List<Map<String, Object>> apps = new ArrayList<>();
        List<com.monitoring.monitoring_backend.entity.Server> servers = serverCacheService.getAllServers();

        for (com.monitoring.monitoring_backend.entity.Server s : servers) {
            String role = s.getRole() != null ? s.getRole().toLowerCase() : "";
            String stack = s.getServiceName() != null ? s.getServiceName().toLowerCase() : "";
            String hostname = s.getHostname() != null ? s.getHostname().toLowerCase() : "";
            
            // Only include Web/App servers that are not databases
            boolean isWebOrApp = role.contains("web") || role.contains("app") || stack.contains("wildfly");
            boolean isDb = role.contains("database") || role.contains("oracle");
            boolean isMonitoring = role.contains("monitoring");
            
            // Specifically exclude target-01 as requested (infrastructure-only node)
            boolean isTarget01 = hostname.contains("target-01");

            if (isWebOrApp && !isDb && !isMonitoring && !isTarget01) {
                apps.add(getWildFlyStats(s));
            }
        }

        return apps;
    }


    private Map<String, Object> getWildFlyStats(com.monitoring.monitoring_backend.entity.Server s) {
        Map<String, Object> stats = new HashMap<>();
        String job = "wildfly";
        String ip = s.getIpAddress();

        stats.put("id", "app-wildfly-" + s.getId());
        stats.put("name", s.getServiceName() != null ? s.getServiceName() : "WildFly News Aggregator");
        stats.put("stack", "WildFly 30 / " + s.getHostname());

        // Status check
        Double up = prometheusService.executeNumericQuery("up{job=\"" + job + "\",instance=\"" + ip + ":9990\"}");
        stats.put("status", (up != null && up == 1.0) ? "running" : "stopped");

        // Requests per minute (RPM)
        Double rpm = prometheusService
                .executeNumericQuery("sum(rate(wildfly_undertow_request_count_total{instance=\"" + ip + ":9990\"}[1m])) * 60");
        stats.put("rpm", Math.round(rpm != null ? rpm : 0.0));

        // Avg Response Time (ms)
        Double latency = prometheusService.executeNumericQuery(
                "avg(wildfly_undertow_processing_time_total_seconds{instance=\"" + ip + ":9990\"} / wildfly_undertow_request_count_total{instance=\"" + ip + ":9990\"}) * 1000");
        stats.put("responseMs", (latency != null && !latency.isNaN()) ? Math.round(latency) : 0);

        // Error Percentage
        Double errorPct = prometheusService.executeNumericQuery(
                "sum(rate(wildfly_undertow_error_count_total{instance=\"" + ip + ":9990\"}[5m])) / sum(rate(wildfly_undertow_request_count_total{instance=\"" + ip + ":9990\"}[5m])) * 100");
        stats.put("errorPct", (errorPct != null && !errorPct.isNaN()) ? Math.round(errorPct * 10.0) / 10.0 : 0.0);

        // JVM Heap Usage
        Double heapUsed = prometheusService.executeNumericQuery("base_memory_usedHeap_bytes{instance=\"" + ip + ":9990\"}");
        Double heapMax = prometheusService.executeNumericQuery("base_memory_maxHeap_bytes{instance=\"" + ip + ":9990\"}");

        if (heapUsed != null && heapMax != null && heapMax > 0) {
            stats.put("heapUsage", Math.round((heapUsed / heapMax) * 100));
            stats.put("heapDisplay", String.format("%.1f GB / %.1f GB", heapUsed / 1e9, heapMax / 1e9));
        } else {
            stats.put("heapUsage", 0);
            stats.put("heapDisplay", "N/A");
        }

        // Thread Pools
        Double activeThreads = prometheusService
                .executeNumericQuery("vendor_thread_pool_active_count{instance=\"" + ip + ":9990\"}");
        Double totalThreads = prometheusService
                .executeNumericQuery("vendor_thread_pool_current_thread_count_total{instance=\"" + ip + ":9990\"}");

        stats.put("threadsActive", activeThreads != null ? activeThreads.intValue() : 0);
        stats.put("threadsTotal", totalThreads != null ? totalThreads.intValue() : 0);

        stats.put("color", "#3B82F6"); // Blue
        return stats;
    }
}
