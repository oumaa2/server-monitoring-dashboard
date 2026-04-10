package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.service.PrometheusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Autowired
    private com.monitoring.monitoring_backend.service.ServerCacheService serverCacheService;

    @Autowired
    private PrometheusService prometheusService;

    @GetMapping("/status")
    public List<Map<String, Object>> getGlobalHealth() {
        List<Server> servers = serverCacheService.getAllServers();
        List<Map<String, Object>> healthReport = new ArrayList<>();

        for (Server server : servers) {
            Map<String, Object> status = new HashMap<>();
            status.put("hostname", server.getHostname());
            status.put("ip", server.getIpAddress());

            // Use a standard Prometheus query string
            String query = "up{instance=\"" + server.getIpAddress() + ":9100\"}";
            try {
                String result = prometheusService.queryPrometheusRaw(query);
                // Prometheus returns "1" for UP and "0" for DOWN
                status.put("isUp", result != null && result.contains("\"1\""));
            } catch (Exception e) {
                status.put("isUp", false);
                status.put("error", "Connection failed: " + e.getMessage());
                System.out.println("DEBUG: Failed to connect to Prometheus at " + server.getIpAddress() + " Error: "
                        + e.getMessage());
            }

            healthReport.add(status);
        }
        return healthReport;
    }
}