package com.monitoring.monitoring_backend.service;

import com.monitoring.monitoring_backend.entity.LogEntry;
import com.monitoring.monitoring_backend.repository.LogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Convenience service for manual application-level logging.
 * Writes business events (user actions, config changes, errors) to the logs table
 * so they appear on the Logs page alongside infrastructure and SSH-tailed logs.
 */
@Service
public class AppLogService {

    private final LogRepository logRepository;
    private final DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public AppLogService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    // ── Shortcut methods ────────────────────────────────────────────────────────

    public void info(String service, String serverName, String message) {
        save("INFO", service, serverName, message, null, null);
    }

    public void warn(String service, String serverName, String message) {
        save("WARN", service, serverName, message, null, null);
    }

    public void error(String service, String serverName, String message) {
        save("ERROR", service, serverName, message, null, null);
    }

    public void error(String service, String serverName, String message, Exception ex) {
        String stackTrace = null;
        if (ex != null) {
            java.io.StringWriter sw = new java.io.StringWriter();
            ex.printStackTrace(new java.io.PrintWriter(sw));
            stackTrace = sw.toString();
        }
        save("ERROR", service, serverName, message, null, stackTrace);
    }

    // ── Core save ───────────────────────────────────────────────────────────────

    private void save(String level, String service, String serverName, String message, String details, String stackTrace) {
        try {
            LogEntry log = new LogEntry();
            log.setTimestamp(LocalDateTime.now().format(dtf));
            log.setLevel(level);
            log.setService(service);
            log.setServerName(serverName != null ? serverName : "monitoring-backend");
            log.setMessage(message);
            log.setDetails(details);
            log.setStackTrace(stackTrace);
            logRepository.save(log);
        } catch (Exception e) {
            // DB might be offline — fail silently to avoid crashing the caller
            System.err.println(">>> [AppLogService] Failed to save log (DB offline): " + message);
        }
    }
}
