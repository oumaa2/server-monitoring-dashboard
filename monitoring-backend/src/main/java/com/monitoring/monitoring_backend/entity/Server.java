package com.monitoring.monitoring_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "servers")
@Data // Automatically generates getters and setters via Lombok
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String hostname;

    @Column(name = "ip_address", nullable = false)
    private String ipAddress;

    @Column(name = "job_name")
    private String jobName;

    @Column(nullable = false)
    private String role;

    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "log_path")
    private String logPath;

    @Column(name = "service_name")
    private String serviceName;

    @Column(name = "start_script_path")
    private String startScriptPath;

    @Column(name = "stop_script_path")
    private String stopScriptPath;

    @Column(name = "ssh_username")
    private String sshUsername;

    @Column(name = "ssh_password")
    private String sshPassword;

    @Column(name = "ssh_port")
    private Integer sshPort = 22;

    @Column(name = "protocol")
    private String protocol = "ssh";

    /**
     * Post-load hook to ensure nulls fetched from old database rows are backfilled with defaults
     * in memory to prevent NullPointerExceptions during unboxing.
     */
    @PostLoad
    private void backfillDefaults() {
        if (this.sshPort == null) this.sshPort = 22;
        if (this.protocol == null || this.protocol.trim().isEmpty()) this.protocol = "ssh";
    }

    // Explicit getters to handle JSON-loaded nulls that bypass @PostLoad
    public Integer getSshPort() {
        return sshPort != null ? sshPort : 22;
    }

    public String getProtocol() {
        return (protocol != null && !protocol.trim().isEmpty()) ? protocol : "ssh";
    }
}
