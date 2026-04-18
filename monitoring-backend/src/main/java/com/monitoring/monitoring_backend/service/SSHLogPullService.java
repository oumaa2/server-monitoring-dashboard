package com.monitoring.monitoring_backend.service;

import com.jcraft.jsch.*;
import com.monitoring.monitoring_backend.entity.LogEntry;
import com.monitoring.monitoring_backend.repository.LogRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class SSHLogPullService {

    private final LogRepository logRepository;
    private final ServerCacheService serverCacheService;
    private final ExecutorService executorService = Executors.newCachedThreadPool();
    private final java.util.Map<String, Session> activeSessions = new java.util.concurrent.ConcurrentHashMap<>();
    private final DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Value("${ssh.user:pfeadmin}")
    private String sshUser;

    @Value("${ssh.password:123456}")
    private String sshPassword;

    public SSHLogPullService(LogRepository logRepository, ServerCacheService serverCacheService) {
        this.logRepository = logRepository;
        this.serverCacheService = serverCacheService;
    }

    @PostConstruct
    public void init() {
        refreshConnections();
    }

    /**
     * Periodically syncs active SSH sessions with the servers defined in the database.
     * Checks for any server with a 'logPath' configured.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 30000)
    public void refreshConnections() {
        Iterable<com.monitoring.monitoring_backend.entity.Server> servers = serverCacheService.getAllServers();
        java.util.Set<String> dbIps = new java.util.HashSet<>();
        
        for (com.monitoring.monitoring_backend.entity.Server s : servers) {
            String ip = s.getIpAddress();
            String logPath = s.getLogPath();
            String serviceName = s.getServiceName();

            if (logPath != null && !logPath.isEmpty()) {
                dbIps.add(ip);
                // If not connected, or if we want to support path updates, we could check more here.
                // For now, if not present in activeSessions, start it.
                if (!activeSessions.containsKey(ip)) {
                    startTailing(ip, logPath, s.getHostname(), serviceName);
                }
            }
        }

        // Cleanup sessions for IPs no longer in DB or whose logPath was removed
        activeSessions.keySet().forEach(ip -> {
            if (!dbIps.contains(ip)) {
                System.out.println(">>> [SSH] " + ip + ": Config removed. Disconnecting...");
                Session session = activeSessions.get(ip);
                if (session != null && session.isConnected()) {
                    session.disconnect();
                }
                // The thread in startTailing will exit on connection loss or interrupt
            }
        });
    }

    private final java.util.Set<String> offlineServers = java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    
    private void startTailing(String host, String logPath, String configName, String serviceName) {
        executorService.submit(() -> {
            int retryDelay = 5000;
            while (!Thread.currentThread().isInterrupted()) {
                // Determine the correct name: DB record takes priority over properties config
                String resolvedName = serverCacheService.getByIpAddress(host)
                        .map(com.monitoring.monitoring_backend.entity.Server::getHostname)
                        .orElse(configName);

                Session session = null;
                ChannelExec channel = null;
                try {
                    Session old = activeSessions.get(host);
                    if (old != null && old.isConnected()) {
                        old.disconnect();
                    }

                    JSch jsch = new JSch();
                    session = jsch.getSession(sshUser, host, 22);
                    session.setPassword(sshPassword);
                    
                    session.setConfig("StrictHostKeyChecking", "no");
                    session.connect(10000);
                    activeSessions.put(host, session);

                    channel = (ChannelExec) session.openChannel("exec");
                    channel.setCommand("tail -n 0 -F " + logPath);
                    channel.setInputStream(null);
                    
                    BufferedReader reader = new BufferedReader(new InputStreamReader(channel.getInputStream()));
                    channel.connect(5000);

                    System.out.println(">>> [SSH] " + resolvedName + " ("+host+"): Connection established. Tailing " + logPath);
                    offlineServers.remove(host); // Reconnected
                    retryDelay = 5000;

                    String line;
                    while ((line = reader.readLine()) != null) {
                        saveLogEntry(resolvedName, serviceName, line);
                    }
                    
                    System.out.println(">>> [SSH] " + resolvedName + " ("+host+"): Stream closed. Reconnecting...");
                } catch (Exception e) {
                    if (!offlineServers.contains(host)) {
                        System.err.println(">>> [SSH Error] " + resolvedName + " (" + host + "): " + e.getMessage());
                        offlineServers.add(host);
                    }
                    if (e.getMessage() != null && e.getMessage().contains("Auth fail")) break; 
                    try { Thread.sleep(retryDelay); } catch (InterruptedException ie) { break; }
                    retryDelay = Math.min(retryDelay * 2, 60000);
                } finally {
                    if (channel != null && channel.isConnected()) channel.disconnect();
                    if (session != null && session.isConnected()) session.disconnect();
                    activeSessions.remove(host);
                }
            }
        });
    }

    private void saveLogEntry(String server, String service, String rawLine) {
        if (rawLine == null || rawLine.trim().isEmpty()) return;
        try {
            LogEntry log = new LogEntry();
            log.setTimestamp(LocalDateTime.now().format(dtf));
            log.setServerName(server);
            log.setService(service);
            log.setMessage(rawLine);
            
            String level = "INFO";
            String upper = rawLine.toUpperCase();
            if (upper.contains("ERROR") || upper.contains("FATAL") || upper.contains("CRITICAL")) level = "ERROR";
            else if (upper.contains("WARN")) level = "WARN";
            else if (upper.contains("DEBUG")) level = "DEBUG";
            
            log.setLevel(level);
            logRepository.save(log);
        } catch (Exception e) {
            // Quietly ignore DB saving errors to prevent log flood in console
        }
    }

    @PreDestroy
    public void cleanup() {
        executorService.shutdownNow();
        activeSessions.values().forEach(s -> {
            if (s.isConnected()) s.disconnect();
        });
        activeSessions.clear();
    }
}
