package com.monitoring.monitoring_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Data
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String severity; // critical, warning, info

    private String source;

    @Column(name = "triggered_at")
    private LocalDateTime triggeredAt = LocalDateTime.now();

    @Column(name = "is_acknowledged")
    private boolean isAcknowledged = false;

    @Column(name = "acknowledged_by")
    private String acknowledgedBy;

    @Column(name = "affected_resource_type")
    private String affectedResourceType;

    @Column(name = "affected_resource_name")
    private String affectedResourceName;

    @Column(name = "affected_resource_ip")
    private String affectedResourceIp;
}
