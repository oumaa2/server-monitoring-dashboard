package com.monitoring.monitoring_backend.service;

import com.monitoring.monitoring_backend.entity.MetricsHistory;
import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.repository.MetricsHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class MetricScheduler {

    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private ServerCacheService serverCacheService;

    @Autowired
    private MetricsHistoryRepository metricsRepository;

    // Run every 5 minutes (300,000 milliseconds)
    @Scheduled(fixedRate = 300000)
    public void collectAndSaveMetrics() {
        List<Server> servers = serverCacheService.getAllServers();

        for (Server server : servers) {
            // 1. Collect CPU
            saveMetric(server.getId(), "cpu", prometheusService.getCpuUsage(server.getIpAddress()));

            // 2. Collect RAM
            saveMetric(server.getId(), "ram", prometheusService.getMemoryUsage(server.getIpAddress()));

            // 3. New Application Metric (Scraped via Actuator)
            if (server.getJobName() != null) {
                saveMetric(server.getId(), "http_requests", prometheusService.getHttpRequestCount(server.getJobName()));
            }
        }
        System.out.println(">>> Batch metrics saved to DB for " + servers.size() + " servers.");
    }

    private void saveMetric(Integer serverId, String name, Double value) {
        if (value != null) {
            MetricsHistory mh = new MetricsHistory();
            mh.setServerId(serverId);
            mh.setMetricName(name);
            mh.setMetricValue(value);
            metricsRepository.save(mh);
        }
    }
}