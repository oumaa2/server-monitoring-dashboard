package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.entity.LogEntry;
import com.monitoring.monitoring_backend.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    @Autowired
    private LogRepository logRepository;

    @GetMapping
    public org.springframework.http.ResponseEntity<Map<String, Object>> getAllLogs(
            @RequestParam(name = "level", required = false) String level,
            @RequestParam(name = "service", required = false) String service,
            @RequestParam(name = "server", required = false) String server) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            List<LogEntry> logs = logRepository.findAll();
            
            List<LogEntry> filtered = logs.stream()
                .filter(l -> level == null || level.equalsIgnoreCase("All Levels") || level.equalsIgnoreCase(l.getLevel()))
                .filter(l -> service == null || service.equalsIgnoreCase("All Services") || service.equalsIgnoreCase(l.getService()))
                .filter(l -> server == null || server.equalsIgnoreCase("All Servers") || server.equalsIgnoreCase(l.getServerName()))
                .sorted((a, b) -> {
                    if (a.getTimestamp() == null && b.getTimestamp() == null) return 0;
                    if (a.getTimestamp() == null) return 1;
                    if (b.getTimestamp() == null) return -1;
                    return b.getTimestamp().compareTo(a.getTimestamp());
                })
                .toList();

            response.put("logs", filtered);
            response.put("total", filtered.size());
            response.put("page", 0);
            response.put("pageSize", filtered.size());
            return org.springframework.http.ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("logs", Collections.emptyList());
            response.put("total", 0);
            response.put("error", "Database offline. Showing empty logs.");
            return org.springframework.http.ResponseEntity.ok(response);
        }
    }

    @PostMapping
    public LogEntry createLog(@RequestBody LogEntry log) {
        return logRepository.save(log);
    }
}
