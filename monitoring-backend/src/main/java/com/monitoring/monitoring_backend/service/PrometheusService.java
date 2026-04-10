package com.monitoring.monitoring_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.net.URI;
import java.time.Duration;

@Service
public class PrometheusService {
    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();
    private String lastError = "None";

    @Value("${prometheus.url}")
    private String prometheusUrl;

    public PrometheusService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    public String getLastError() {
        return lastError;
    }

    // Existing core query method
    public String queryPrometheusRaw(String query) {
        try {
            URI uri = org.springframework.web.util.UriComponentsBuilder.fromUriString(prometheusUrl)
                    .path("/api/v1/query")
                    .queryParam("query", query)
                    .build()
                    .toUri();
            
            return webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(2))
                    .block();
        } catch (Exception e) {
            lastError = "Connection Failed: " + e.getMessage();
            return null;
        }
    }




    public String queryPrometheusRange(String query, String start, String end, String step) {
        try {
            URI uri = org.springframework.web.util.UriComponentsBuilder.fromUriString(prometheusUrl)
                    .path("/api/v1/query_range")
                    .queryParam("query", query)
                    .queryParam("start", start)
                    .queryParam("end", end)
                    .queryParam("step", step)
                    .build()
                    .toUri();
            
            return webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
        } catch (Exception e) {
            lastError = e.getMessage();
            throw new RuntimeException("Prometheus range query failed: " + e.getMessage(), e);
        }
    }

    // New numeric execution method
    public Double executeNumericQuery(String query) {
        try {
            String response = queryPrometheusRaw(query);
            if (response == null) {
                return 0.0;
            }
            JsonNode root = mapper.readTree(response);
            JsonNode result = root.path("data").path("result");

            if (result.isArray() && !result.isEmpty()) {
                JsonNode first = result.get(0);
                if (first.isObject() && first.has("value")) {
                    // Instant vector: {"metric": {}, "value": [timestamp, "value"]}
                    return first.path("value").get(1).asDouble();
                } else if (result.size() >= 2 && result.get(1).isTextual()) {
                    // Scalar result: [timestamp, "value"]
                    return result.get(1).asDouble();
                }
            } else if (result.isObject() && result.has("value")) {
                // Some versions/types might return a single object
                return result.path("value").get(1).asDouble();
            }
        } catch (Exception e) {
            lastError = "Numeric Query Parse Failed: " + e.getMessage();
        }
        return 0.0;
    }

    private String sanitizeIp(String ip) {
        if (ip == null) return "localhost";
        return ip.split("/")[0].trim();
    }

    public Double getCpuUsage(String ip) {
        String cleanIp = sanitizeIp(ip);
        String query = "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\",instance=~\"" + cleanIp
                + ":9100|localhost:9090|" + cleanIp + ":9090\"}[5m])) * 100)";
        return executeNumericQuery(query);
    }

    public Double getMemoryUsage(String ip) {
        String cleanIp = sanitizeIp(ip);
        String query = "(1 - (node_memory_MemAvailable_bytes{instance=~\"" + cleanIp
                + ":9100|localhost:9090|" + cleanIp + ":9090\"} / node_memory_MemTotal_bytes{instance=~\"" + cleanIp
                + ":9100|localhost:9090|" + cleanIp + ":9090\"})) * 100";
        return executeNumericQuery(query);
    }

    /**
     * Generic method to get any numeric metric by a specific label.
     * Useful for application-level metrics (e.g., job="my-app").
     */
    public Double getMetricByLabel(String metricName, String labelName, String labelValue) {
        String query = metricName + "{" + labelName + "=\"" + labelValue + "\"}";
        return executeNumericQuery(query);
    }

    /**
     * Gets the total HTTP requests for a specific application/job.
     * (Requires Spring Boot Actuator with prometheus registry)
     */
    public Double getHttpRequestCount(String jobName) {
        // sum(http_server_requests_seconds_count{job="my-app"})
        String query = "sum(rate(http_server_requests_seconds_count{job=\"" + jobName + "\"}[1m]))";
        return executeNumericQuery(query);
    }

    public Double getDiskUsage(String ip) {
        String cleanIp = sanitizeIp(ip);
        String query = "(1 - (node_filesystem_avail_bytes{instance=~\"" + cleanIp
                + ":9100|localhost:9090\",mountpoint=\"/\"} / " +
                "node_filesystem_size_bytes{instance=~\"" + cleanIp + ":9100|localhost:9090\",mountpoint=\"/\"})) * 100";
        return executeNumericQuery(query);
    }

    public Double getNetworkTraffic(String ip) {
        String cleanIp = sanitizeIp(ip);
        String query = "sum(rate(node_network_receive_bytes_total{instance=~\"" + cleanIp + ":9100|localhost:9090|" + cleanIp
                + ":9090\"}[5m]))";
        return executeNumericQuery(query);
    }

    /**
     * Queries Prometheus for active firing alerts.
     */
    public String getPrometheusAlerts() {
        try {
            URI uri = org.springframework.web.util.UriComponentsBuilder.fromUriString(prometheusUrl)
                    .path("/api/v1/alerts")
                    .build()
                    .toUri();
            
            return webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(2))
                    .block();
        } catch (Exception e) {
            lastError = "Alerts Query Failed: " + e.getMessage();
            return null;
        }
    }
}