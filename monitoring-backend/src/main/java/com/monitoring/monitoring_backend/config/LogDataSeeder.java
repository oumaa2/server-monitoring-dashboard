package com.monitoring.monitoring_backend.config;

import com.monitoring.monitoring_backend.entity.LogEntry;
import com.monitoring.monitoring_backend.repository.LogRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;

@Configuration
public class LogDataSeeder {

    @Bean
    CommandLineRunner migrateLogConfig(com.monitoring.monitoring_backend.repository.ServerRepository serverRepository) {
        return args -> {
            try {
                updateServer(serverRepository, "192.168.56.101", "/var/log/syslog", "prometheus");
                updateServer(serverRepository, "192.168.56.102", "/opt/wildfly/standalone/log/server.log", "wildfly");
                updateServer(serverRepository, "192.168.56.104", "/var/log/postgresql/postgresql-15-main.log", "postgres");
            } catch (Exception e) {
                System.err.println(">>> [Config Migration Failed] Database offline, skipping migration: " + e.getMessage());
            }
        };
    }

    private void updateServer(com.monitoring.monitoring_backend.repository.ServerRepository repo, String ip, String path, String svc) {
        repo.findByIpAddress(ip).ifPresent(s -> {
            if (s.getLogPath() == null || s.getLogPath().isEmpty()) {
                s.setLogPath(path);
                s.setServiceName(svc);
                repo.save(s);
                System.out.println(">>> [Config Migration] Updated " + s.getHostname() + " with log path: " + path);
            }
        });
    }

    @Bean
    CommandLineRunner seedLogs(LogRepository repository) {
        return args -> {
            try {
                // Only seed if we don't have enough logs (to avoid deleting real data)
                if (repository.count() > 10) {
                    return;
                }
                
                DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                Random random = new Random();
                
                String[] servers = {"master-node", "postgresql-server", "wildfly-server"};
                String[][] servicesPerServer = {
                    {"prometheus", "node-exporter", "api-gateway"},
                    {"postgres-db", "node-exporter", "backup-service"},
                    {"wildfly-app", "node-exporter", "security-service"}
                };
                
                
                String[] infoMessages = {
                    "System health check completed successfully.",
                    "User authentication successful.",
                    "Scheduled data synchronization started.",
                    "Cache cleared for service performance optimization.",
                    "Listening on port 8080.",
                    "Component initialized in 450ms.",
                    "Heartbeat pulse sent to master node."
                };

                String[] warnMessages = {
                    "High memory usage detected (88%).",
                    "Database connection pool reaching capacity.",
                    "Slow query detected: SELECT * FROM audit_logs...",
                    "Disk space low on /var/log (15% remaining).",
                    "Retry attempt 2/3 for external API call.",
                    "Prometheus scraper timeout on target-03."
                };

                String[] errorMessages = {
                    "Failed to validate JWT token for user-9921.",
                    "NullPointerException in AuthProvider.java:124.",
                    "Connection refused to postgresql-server:5432.",
                    "OutOfMemoryError: Java heap space.",
                    "Deadlock detected in transaction manager.",
                    "Critical failure in message queue consumer."
                };

                // Seed 60 logs
                for (int i = 0; i < 60; i++) {
                    int serverIdx = random.nextInt(servers.length);
                    String server = servers[serverIdx];
                    String[] serverServices = servicesPerServer[serverIdx];
                    String service = serverServices[random.nextInt(serverServices.length)];
                    
                    int levelRand = random.nextInt(100);
                    String level;
                    String message;
                    String trace = null;
                    
                    if (levelRand < 70) { // 70% INFO
                        level = "INFO";
                        message = infoMessages[random.nextInt(infoMessages.length)];
                    } else if (levelRand < 85) { // 15% WARN
                        level = "WARN";
                        message = warnMessages[random.nextInt(warnMessages.length)];
                    } else if (levelRand < 95) { // 10% ERROR
                        level = "ERROR";
                        message = errorMessages[random.nextInt(errorMessages.length)];
                        trace = "java.lang.RuntimeException: " + message + "\n" +
                                "    at com.monitoring.service.CoreWorker.execute(CoreWorker.java:" + (100 + i) + ")\n" +
                                "    at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)";
                    } else { // 5% DEBUG
                        level = "DEBUG";
                        message = "Debugging internal state for " + service + " - iteration " + i;
                    }

                    LogEntry log = new LogEntry();
                    log.setTimestamp(LocalDateTime.now().minusMinutes(60 - i).format(dtf));
                    log.setLevel(level);
                    log.setService(service);
                    log.setServerName(server);
                    log.setMessage(message);
                    log.setStackTrace(trace);
                    repository.save(log);
                }
            } catch (Exception e) {
                System.err.println(">>> [Log Seeding Failed] Database offline, skipping seeding: " + e.getMessage());
            }
        };
    }
}
