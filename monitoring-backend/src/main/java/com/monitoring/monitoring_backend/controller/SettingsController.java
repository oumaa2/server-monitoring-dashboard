package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.service.SettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    @Autowired
    private SettingsService settingsService;

    @Autowired
    private com.monitoring.monitoring_backend.service.AppLogService appLog;

    /** Get current thresholds */
    @GetMapping("/thresholds")
    public Map<String, Object> getThresholds() {
        Map<String, Object> result = new HashMap<>();
        result.put("cpuThreshold",  settingsService.getCpuThreshold());
        result.put("memThreshold",  settingsService.getMemThreshold());
        result.put("diskThreshold", settingsService.getDiskThreshold());
        result.put("dbStorageThreshold", settingsService.getDbStorageThreshold());
        return result;
    }

    /** Update thresholds — called when user saves Settings → Alerts */
    @PostMapping("/thresholds")
    public Map<String, Object> updateThresholds(@RequestBody Map<String, Double> body) {
        double cpu  = body.getOrDefault("cpuThreshold",  settingsService.getCpuThreshold());
        double mem  = body.getOrDefault("memThreshold",  settingsService.getMemThreshold());
        double disk = body.getOrDefault("diskThreshold", settingsService.getDiskThreshold());
        double dbStorage = body.getOrDefault("dbStorageThreshold", settingsService.getDbStorageThreshold());

        settingsService.setThresholds(cpu, mem, disk, dbStorage);

        appLog.info("settings", "monitoring-backend",
                String.format("Alert thresholds updated — CPU:%.0f%% MEM:%.0f%% DISK:%.0f%% DB:%.0f%%", cpu, mem, disk, dbStorage));

        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("cpuThreshold",  settingsService.getCpuThreshold());
        response.put("memThreshold",  settingsService.getMemThreshold());
        response.put("diskThreshold", settingsService.getDiskThreshold());
        response.put("dbStorageThreshold", settingsService.getDbStorageThreshold());
        return response;
    }
}
