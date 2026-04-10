package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.service.ServerCacheService;
import com.monitoring.monitoring_backend.service.PrometheusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    @Autowired
    private ServerCacheService serverCacheService;

    @Autowired
    private PrometheusService prometheusService;

    @GetMapping("/live")
    public Map<String, Map<String, Object>> getLiveMetrics() {
        try {
            Map<String, Map<String, Object>> allMetrics = new HashMap<>();
            List<Server> servers = serverCacheService.getAllServers();

            for (Server server : servers) {
                Map<String, Object> metrics = new HashMap<>();
                String ip = server.getIpAddress();

                metrics.put("cpu", Math.round(prometheusService.getCpuUsage(ip) * 10.0) / 10.0);
                metrics.put("ram", Math.round(prometheusService.getMemoryUsage(ip) * 10.0) / 10.0);

                // New Application Metrics (Scraped via Actuator)
                if (server.getJobName() != null) {
                    metrics.put("http_requests", prometheusService.getHttpRequestCount(server.getJobName()));
                }

                allMetrics.put(server.getHostname(), metrics);
            }
            return allMetrics;
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Map<String, Object>> errorMap = new HashMap<>();
            Map<String, Object> errorDetails = new HashMap<>();
            errorDetails.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            errorMap.put("diagnostic_error", errorDetails);
            return errorMap;
        }
    }
}