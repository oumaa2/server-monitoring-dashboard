package com.monitoring.monitoring_backend.service;

import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import com.monitoring.monitoring_backend.dto.ProcessInfo;
import com.monitoring.monitoring_backend.entity.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ProcessPollingService {

    private final ServerCacheService serverCacheService;
    private final Map<String, List<ProcessInfo>> serverProcesses = new ConcurrentHashMap<>();

    @Value("${ssh.user:pfeadmin}")
    private String sshUser;

    @Value("${ssh.password:123456}")
    private String sshPassword;

    public ProcessPollingService(ServerCacheService serverCacheService) {
        this.serverCacheService = serverCacheService;
    }

    public List<ProcessInfo> getTopProcesses(String ipAddress) {
        return serverProcesses.getOrDefault(ipAddress, new ArrayList<>());
    }

    @Scheduled(fixedRate = 30000)
    public void pollProcesses() {
        List<Server> servers = serverCacheService.getAllServers();
        for (Server server : servers) {
            String ip = server.getIpAddress();
            try {
                // Use server-specific credentials if available
                String user = (server.getSshUsername() != null && !server.getSshUsername().isEmpty()) ? server.getSshUsername() : sshUser;
                String pass = (server.getSshPassword() != null && !server.getSshPassword().isEmpty()) ? server.getSshPassword() : sshPassword;
                Integer port = server.getSshPort() != null ? server.getSshPort() : 22;

                List<ProcessInfo> processes = fetchProcessesViaSSH(ip, port, user, pass);
                if (processes != null && !processes.isEmpty()) {
                    serverProcesses.put(ip, processes);
                }
            } catch (Exception e) {
                System.err.println(">>> [Process Poller] Failed to fetch processes for " + ip + ": " + e.getMessage());
            }
        }
    }

    private List<ProcessInfo> fetchProcessesViaSSH(String host, Integer port, String user, String pass) throws Exception {
        JSch jsch = new JSch();
        Session session = null;
        ChannelExec channel = null;

        try {
            int finalPort = (port != null && port > 0) ? port : 22;
            session = jsch.getSession(user, host, finalPort);
            session.setPassword(pass);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(5000);

            channel = (ChannelExec) session.openChannel("exec");
            // Command to get top 5 CPU consuming processes
            channel.setCommand("ps -eo user,pid,pcpu,pmem,comm --sort=-pcpu | head -n 6");
            channel.setInputStream(null);

            BufferedReader reader = new BufferedReader(new InputStreamReader(channel.getInputStream()));
            channel.connect(5000);

            List<ProcessInfo> processInfos = new ArrayList<>();
            String line;
            boolean isHeader = true;

            while ((line = reader.readLine()) != null) {
                if (isHeader) {
                    isHeader = false;
                    continue;
                }
                
                String[] parts = line.trim().split("\\s+");
                if (parts.length >= 5) {
                    ProcessInfo info = new ProcessInfo();
                    info.setUser(parts[0]);
                    info.setPid(parts[1]);
                    try {
                        info.setCpu(Double.parseDouble(parts[2]));
                        info.setMem(Double.parseDouble(parts[3]));
                    } catch (NumberFormatException e) {
                        info.setCpu(0);
                        info.setMem(0);
                    }
                    
                    // Reconstruct command if it had spaces
                    StringBuilder cmd = new StringBuilder();
                    for(int i=4; i<parts.length; i++) {
                        cmd.append(parts[i]).append(" ");
                    }
                    info.setCommand(cmd.toString().trim());
                    
                    processInfos.add(info);
                }
            }
            return processInfos;

        } finally {
            if (channel != null && channel.isConnected()) channel.disconnect();
            if (session != null && session.isConnected()) session.disconnect();
        }
    }
}
