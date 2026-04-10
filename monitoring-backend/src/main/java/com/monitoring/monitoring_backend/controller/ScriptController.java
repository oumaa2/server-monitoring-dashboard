package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.service.ServerCacheService;
import com.monitoring.monitoring_backend.service.SSHCommandService;
import com.monitoring.monitoring_backend.service.AppLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/scripts")
public class ScriptController {

    @Autowired
    private ServerCacheService serverCacheService;

    @Autowired
    private SSHCommandService sshCommandService;

    @Autowired
    private AppLogService appLog;

    @GetMapping("/{id}/{action}")
    public ResponseEntity<Map<String, Object>> getScript(@PathVariable("id") Integer id, @PathVariable("action") String action) {
        Map<String, Object> response = new HashMap<>();
        try {
            Server server = serverCacheService.getById(id)
                .orElseThrow(() -> new RuntimeException("Server not found"));

            String path = action.equals("start") ? server.getStartScriptPath() : server.getStopScriptPath();
            
            if (path == null || path.isEmpty()) {
                String role = server.getRole() != null ? server.getRole().toLowerCase() : "";
                String scriptName = mapRoleToScriptName(role);
                path = String.format("/opt/monitoring/scripts/%s-%s.sh", action, scriptName);
            }

            String content = sshCommandService.readRemoteFile(server.getIpAddress(), server.getSshPort(), server.getSshUsername(), server.getSshPassword(), path);
            
            response.put("content", content);
            response.put("path", path);
            response.put("hostname", server.getHostname());
            return ResponseEntity.ok(response);
        } catch (java.io.FileNotFoundException e) {
            response.put("error", e.getMessage());
            response.put("type", "MISSING_FILE");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg != null && (msg.contains("Connection refused") || msg.contains("timeout"))) {
                response.put("error", "SSH Connection Failed: Terminal timed out or IP unreachable.");
                response.put("type", "CONNECTION_ERROR");
            } else if (msg != null && msg.contains("Auth fail")) {
                response.put("error", "SSH Authentication Failed: Invalid username or password.");
                response.put("type", "AUTH_ERROR");
            } else {
                response.put("error", msg);
                response.put("type", "UNKNOWN");
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{id}/{action}")
    public ResponseEntity<Map<String, Object>> saveScript(
            @PathVariable("id") Integer id, 
            @PathVariable("action") String action,
            @RequestBody Map<String, String> payload) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            Server server = serverCacheService.getById(id)
                .orElseThrow(() -> new RuntimeException("Server not found"));

            String content = payload.get("content");
            if (content == null || content.trim().isEmpty()) {
                throw new RuntimeException("Script content cannot be empty");
            }

            String path = action.equals("start") ? server.getStartScriptPath() : server.getStopScriptPath();
            String scriptIdentifier = "custom path";

            if (path == null || path.isEmpty()) {
                String role = server.getRole() != null ? server.getRole().toLowerCase() : "";
                String scriptName = mapRoleToScriptName(role);
                path = String.format("/opt/monitoring/scripts/%s-%s.sh", action, scriptName);
                scriptIdentifier = scriptName;
            }

            String result = sshCommandService.writeRemoteFile(server.getIpAddress(), server.getSshPort(), server.getSshUsername(), server.getSshPassword(), path, content);
            
            appLog.info("script-mgmt", server.getHostname(), "Updated " + action + " script for " + scriptIdentifier + " at " + path);
            
            response.put("message", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String mapRoleToScriptName(String role) {
        switch (role) {
            case "monitoring": return "prometheus";
            case "database":   return "postgresql";
            case "web":        return "wildfly";
            case "oracle":     return "oracle";
            default:           return role;
        }
    }
}
