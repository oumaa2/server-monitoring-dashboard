package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.repository.ServerRepository;
import com.monitoring.monitoring_backend.service.ProcessPollingService;
import com.monitoring.monitoring_backend.dto.ProcessInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/servers")
public class ServerController {

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private com.monitoring.monitoring_backend.service.ServerCacheService serverCacheService;

    @Autowired
    private ProcessPollingService processPollingService;

    @Autowired
    private com.monitoring.monitoring_backend.service.SSHCommandService sshCommandService;

    @Autowired
    private com.monitoring.monitoring_backend.service.AppLogService appLog;

    @GetMapping
    public List<Server> getAllServers() {
        return serverCacheService.getAllServers();
    }

    @GetMapping("/{ip}/processes")
    public List<ProcessInfo> getServerProcesses(@PathVariable("ip") String ip) {
        return processPollingService.getTopProcesses(ip);
    }

    @PostMapping("/register")
    public org.springframework.http.ResponseEntity<Object> registerServer(@RequestBody Server server) {
        try {
            // Sanitize IP before saving (remove /32 etc.)
            if (server.getIpAddress() != null) {
                server.setIpAddress(server.getIpAddress().split("/")[0].trim());
            }
            Server saved = serverRepository.save(server);
            serverCacheService.refreshCache();
            appLog.info("server-management", saved.getHostname(),
                    "Server registered: " + saved.getHostname() + " (" + saved.getIpAddress() + "), role=" + saved.getRole());
            return org.springframework.http.ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            appLog.error("server-management", server.getHostname(), "Failed to register server: " + e.getMessage(), e);
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Failed to save server: " + e.getMessage());
            err.put("type", e.getClass().getSimpleName());
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @PutMapping("/{id}")
    public org.springframework.http.ResponseEntity<Object> updateServer(@PathVariable("id") Integer id, @RequestBody Server serverDetails) {
        try {
            Server server = serverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Server not found with id: " + id));

            server.setHostname(serverDetails.getHostname());
            server.setIpAddress(serverDetails.getIpAddress() != null ? serverDetails.getIpAddress().split("/")[0].trim() : server.getIpAddress());
            server.setRole(serverDetails.getRole());
            server.setServiceName(serverDetails.getServiceName());
            server.setLogPath(serverDetails.getLogPath());
            server.setDescription(serverDetails.getDescription());
            server.setStartScriptPath(serverDetails.getStartScriptPath());
            server.setStopScriptPath(serverDetails.getStopScriptPath());
            server.setSshUsername(serverDetails.getSshUsername());
            server.setSshPassword(serverDetails.getSshPassword());
            server.setSshPort(serverDetails.getSshPort() != null ? serverDetails.getSshPort() : 22);
            server.setProtocol(serverDetails.getProtocol() != null ? serverDetails.getProtocol() : "ssh");
            
            Server updated = serverRepository.save(server);
            serverCacheService.refreshCache();
            appLog.info("server-management", updated.getHostname(), "Server updated: " + updated.getHostname());
            return org.springframework.http.ResponseEntity.ok(updated);
        } catch (Exception e) {
            appLog.error("server-management", "id=" + id, "Failed to update server: " + e.getMessage(), e);
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @DeleteMapping("/{id}")
    public org.springframework.http.ResponseEntity<Object> deleteServer(@PathVariable("id") Integer id) {
        try {
            // Grab hostname before deleting for the log message
            String hostname = serverCacheService.getById(id).map(Server::getHostname).orElse("id=" + id);
            serverRepository.deleteById(id);
            serverCacheService.refreshCache();
            appLog.warn("server-management", hostname, "Server removed: " + hostname);
            return org.springframework.http.ResponseEntity.ok().build();
        } catch (Exception e) {
            appLog.error("server-management", "unknown", "Failed to delete server id=" + id + ": " + e.getMessage(), e);
            Map<String, String> err = new HashMap<>();
            err.put("error", "Database unreachable. Cannot delete server.");
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(err);
        }
    }

    @PostMapping("/{id}/start")
    public org.springframework.http.ResponseEntity<Map<String, Object>> startServer(@PathVariable("id") Integer id) {
        return executeServerAction(id, "start");
    }

    @PostMapping("/{id}/stop")
    public org.springframework.http.ResponseEntity<Map<String, Object>> stopServer(@PathVariable("id") Integer id) {
        return executeServerAction(id, "stop");
    }

    private org.springframework.http.ResponseEntity<Map<String, Object>> executeServerAction(Integer id, String action) {
        Map<String, Object> response = new HashMap<>();
        try {
            Server server = serverCacheService.getById(id)
                .orElseThrow(() -> new RuntimeException("Server not found in cache."));

            String customPath = action.equals("start") ? server.getStartScriptPath() : server.getStopScriptPath();
            String output;

            if (customPath != null && !customPath.isEmpty()) {
                // Use custom full path if provided
                output = sshCommandService.executeRemoteFile(server.getIpAddress(), server.getSshPort(), server.getSshUsername(), server.getSshPassword(), customPath);
                appLog.info("server-control", server.getHostname(), 
                    action.toUpperCase() + " executed using custom path: " + customPath);
            } else {
                // Fallback to role-based default mapping
                String role = server.getRole() != null ? server.getRole().toLowerCase() : "";
                String scriptName = role;
                // Normalize roles to script names
                if (role.contains("monitoring")) scriptName = "prometheus";
                else if (role.contains("database")) scriptName = "postgresql";
                else if (role.contains("web")) scriptName = "wildfly";
                else if (role.contains("oracle")) scriptName = "oracle";
                
                output = sshCommandService.executeRemoteScript(server.getIpAddress(), server.getSshPort(), server.getSshUsername(), server.getSshPassword(), action, scriptName);
                appLog.info("server-control", server.getHostname(),
                    action.toUpperCase() + " executed using role mapping: " + scriptName);
            }

            response.put("status", "success");
            response.put("message", "Triggered " + action + " for " + server.getHostname());
            response.put("output", output);
            return org.springframework.http.ResponseEntity.ok(response);
        } catch (Exception e) {
            appLog.error("server-control", "id=" + id, "Failed to " + action + " server: " + e.getMessage(), e);
            response.put("status", "error");
            response.put("error", String.valueOf(e.getMessage()));
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.OK).body(response);
        }
    }

    /**
     * Prometheus HTTP Service Discovery Endpoint.
     * Returns targets in the format Prometheus expects.
     */
    @GetMapping("/sd")
    public List<Map<String, Object>> getPrometheusSD() {
        try {
            List<Server> servers = serverCacheService.getAllServers();
            List<Map<String, Object>> sdOutput = new ArrayList<>();

            for (Server server : servers) {
                // 1. Infrastructure Target (Node Exporter)
                Map<String, Object> nodeGroup = new HashMap<>();
                nodeGroup.put("targets", Collections.singletonList(server.getIpAddress() + ":9100"));
                Map<String, String> nodeLabels = new HashMap<>();
                nodeLabels.put("hostname", server.getHostname());
                nodeLabels.put("role", server.getRole());
                nodeLabels.put("job", "infrastructure"); // Added for cleaner grouping
                nodeGroup.put("labels", nodeLabels);
                sdOutput.add(nodeGroup);

                // 2. Application/Exporter Specific Target (Categorized)
                String role = server.getRole() != null ? server.getRole().toLowerCase() : "";
                String stack = server.getServiceName() != null ? server.getServiceName().toLowerCase() : "";
                int port = -1;
                Map<String, String> appLabels = new HashMap<>();
                appLabels.put("hostname", server.getHostname());
                appLabels.put("role", role);
                appLabels.put("stack", stack); // New: Track the specific software stack

                // Logic map for standard roles/ports
                if (role.contains("database") || role.contains("postgres") || stack.contains("postgres")) {
                    port = 9187; appLabels.put("job", "postgres");
                } else if (role.contains("oracle") || stack.contains("oracle")) {
                    port = 9161; appLabels.put("job", "oracle-db");
                } else if (stack.equalsIgnoreCase("wildfly") || (role.contains("web") && !server.getHostname().toLowerCase().contains("target-01"))) {
                    port = 9990; appLabels.put("job", "wildfly");
                }

                if (port != -1) {
                    Map<String, Object> appGroup = new HashMap<>();
                    appGroup.put("targets", Collections.singletonList(server.getIpAddress() + ":" + port));
                    appGroup.put("labels", appLabels);
                    sdOutput.add(appGroup);
                }
            }
            return sdOutput;
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            return Collections.singletonList(error);
        }
    }
}
