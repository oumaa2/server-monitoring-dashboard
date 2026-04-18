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

    @Autowired
    private com.monitoring.monitoring_backend.repository.ServerRepository serverRepository;

    @Autowired
    private com.monitoring.monitoring_backend.service.SSHCommandService sshCommandService;

    @GetMapping
    public org.springframework.http.ResponseEntity<Map<String, Object>> getAllLogs(
            @RequestParam(name = "level", required = false) String level,
            @RequestParam(name = "service", required = false) String service,
            @RequestParam(name = "server", required = false) String server,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            // Clean up filter parameters
            String levelParam = (level == null || level.equalsIgnoreCase("All Levels")) ? null : level;
            String serviceParam = (service == null || service.equalsIgnoreCase("All Services")) ? null : service;
            String serverParam = (server == null || server.equalsIgnoreCase("All Servers")) ? null : server;
            String searchParam = (search == null || search.trim().isEmpty()) ? null : search;

            org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.PageRequest.of(page, size, 
                    org.springframework.data.domain.Sort.by("timestamp").descending());

            org.springframework.data.domain.Page<LogEntry> logPage = 
                logRepository.findWithFilters(levelParam, serviceParam, serverParam, searchParam, pageable);

            response.put("logs", logPage.getContent());
            response.put("total", logPage.getTotalElements());
            response.put("totalPages", logPage.getTotalPages());
            response.put("currentPage", logPage.getNumber());
            response.put("pageSize", logPage.getSize());
            
            return org.springframework.http.ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("logs", Collections.emptyList());
            response.put("total", 0);
            response.put("error", "Error fetching logs: " + e.getMessage());
            return org.springframework.http.ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping
    public LogEntry createLog(@RequestBody LogEntry log) {
        return logRepository.save(log);
    }

    @PostMapping("/inspect")
    public org.springframework.http.ResponseEntity<Map<String, Object>> inspectLog(
            @RequestBody Map<String, String> request) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            Integer serverId = Integer.parseInt(request.get("serverId"));
            String folderPath = request.get("folderPath");
            
            com.monitoring.monitoring_backend.entity.Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new RuntimeException("Server not found"));
            
            String result = sshCommandService.inspectRemoteFolder(
                server.getIpAddress(),
                server.getSshPort(),
                server.getSshUsername(),
                server.getSshPassword(),
                folderPath
            );
            
            response.put("result", result);
            return org.springframework.http.ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return org.springframework.http.ResponseEntity.status(500).body(response);
        }
    }
}
