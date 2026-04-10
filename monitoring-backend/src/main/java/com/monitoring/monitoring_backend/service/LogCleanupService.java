package com.monitoring.monitoring_backend.service;

import com.monitoring.monitoring_backend.repository.LogRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class LogCleanupService {

    private final LogRepository logRepository;
    private final DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public LogCleanupService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    /**
     * Purge logs older than 7 days.
     * Runs every day at 1:00 AM.
     */
    @Scheduled(cron = "0 0 1 * * ?")
    public void purgeOldLogs() {
        String cutoff = LocalDateTime.now().minusDays(7).format(dtf);
        System.out.println(">>> [Retention] Starting log purge for entries before: " + cutoff);
        try {
            logRepository.deleteByTimestampBefore(cutoff);
            System.out.println(">>> [Retention] Log purge completed successfully.");
        } catch (Exception e) {
            System.err.println(">>> [Retention Error] Failed to purge logs: " + e.getMessage());
        }
    }
}
