package com.monitoring.monitoring_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "metrics_history")
@Data
public class MetricsHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // BigSerial in DB = Long in Java

    @Column(name = "server_id", nullable = false)
    private Integer serverId;

    @Column(name = "metric_name", nullable = false)
    private String metricName; // This will store "cpu" or "ram"

    @Column(name = "metric_value", nullable = false, columnDefinition = "numeric")
    private Double metricValue;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
}