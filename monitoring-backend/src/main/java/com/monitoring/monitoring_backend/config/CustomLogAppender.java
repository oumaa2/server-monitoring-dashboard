package com.monitoring.monitoring_backend.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.AppenderBase;
import com.monitoring.monitoring_backend.entity.LogEntry;
import com.monitoring.monitoring_backend.repository.LogRepository;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Set;

/**
 * Logback appender that captures WARN and ERROR log events from the application
 * and persists them as LogEntry records in the database.
 * 
 * This gives automatic visibility into Spring Boot errors/warnings on the Logs page
 * without needing manual log calls everywhere.
 */
@Component
public class CustomLogAppender extends AppenderBase<ILoggingEvent> implements ApplicationContextAware {

    private static LogRepository logRepository;
    private static volatile boolean ready = false;

    private final DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    /** Noisy packages to skip — these generate too many warnings during normal operation */
    private static final Set<String> EXCLUDED_LOGGERS = Set.of(
            "org.apache.catalina",
            "org.apache.coyote",
            "org.apache.tomcat",
            "org.hibernate",
            "com.zaxxer.hikari",
            "org.springframework.boot.autoconfigure",
            "org.springframework.web.servlet.DispatcherServlet",
            "org.springframework.web.reactive"
    );

    @Override
    public void setApplicationContext(ApplicationContext ctx) {
        try {
            logRepository = ctx.getBean(LogRepository.class);
            ready = true;
        } catch (Exception e) {
            // Repository not available yet — will be set later
        }
    }

    @Override
    protected void append(ILoggingEvent event) {
        // Only capture WARN and ERROR
        if (!ready || logRepository == null) return;
        if (event.getLevel().toInt() < Level.WARN.toInt()) return;

        // Skip noisy framework loggers
        String loggerName = event.getLoggerName();
        for (String excluded : EXCLUDED_LOGGERS) {
            if (loggerName.startsWith(excluded)) return;
        }

        try {
            LogEntry log = new LogEntry();
            log.setTimestamp(dtf.format(Instant.ofEpochMilli(event.getTimeStamp())));
            log.setLevel(event.getLevel().toString());
            log.setService("spring-boot");
            log.setServerName("monitoring-backend");
            log.setMessage("[" + shortenLogger(loggerName) + "] " + event.getFormattedMessage());

            // Capture stack trace if present
            IThrowableProxy tp = event.getThrowableProxy();
            if (tp != null) {
                log.setStackTrace(ThrowableProxyUtil.asString(tp));
            }

            logRepository.save(log);
        } catch (Exception e) {
            // Silently ignore — DB might be offline, and we must not cause recursive logging
        }
    }

    /** Shortens "com.monitoring.monitoring_backend.controller.ServerController" → "ServerController" */
    private String shortenLogger(String name) {
        int lastDot = name.lastIndexOf('.');
        return lastDot >= 0 ? name.substring(lastDot + 1) : name;
    }
}
