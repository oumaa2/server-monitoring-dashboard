package com.monitoring.monitoring_backend.service;

import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


@Service
public class SSHCommandService {

    @Value("${ssh.user:pfeadmin}")
    private String sshUser;

    @Value("${ssh.password:123456}")
    private String sshPassword;

    private String resolveUsername(String user) {
        return (user != null && !user.isEmpty()) ? user : sshUser;
    }

    private String resolvePassword(String password) {
        return (password != null && !password.isEmpty()) ? password : sshPassword;
    }

    /**
     * Executes a remote bash script for start/stop actions.
     */
    public String executeRemoteScript(String host, Integer port, String user, String pass, String action, String role) throws Exception {
        String finalUser = resolveUsername(user);
        String finalPass = resolvePassword(pass);
        int finalPort = (port != null && port > 0) ? port : 22;
        
        JSch jsch = new JSch();
        Session session = null;
        ChannelExec channel = null;
        try {
            session = jsch.getSession(finalUser, host, finalPort);
            session.setPassword(finalPass);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(10000);

            channel = (ChannelExec) session.openChannel("exec");
            channel.setPty(true); 
            
            // RHEL 8 Stability: Use absolute paths for bash
            String command = String.format("sudo -S /usr/bin/bash /opt/monitoring/scripts/%s-%s.sh", action, role);
            channel.setCommand(command);
            
            java.io.ByteArrayOutputStream combinedOutput = new java.io.ByteArrayOutputStream();
            channel.setOutputStream(combinedOutput);
            channel.setErrStream(combinedOutput);

            java.io.OutputStream out = channel.getOutputStream();
            channel.connect(5000);

            out.write((finalPass + "\n").getBytes());
            out.flush();

            // Safety timeout: wait max 15s
            long start = System.currentTimeMillis();
            while (!channel.isClosed() && (System.currentTimeMillis() - start) < 15000) {
                Thread.sleep(100);
            }
            
            if (!channel.isClosed()) {
                channel.disconnect();
                throw new RuntimeException("SSH Command timed out after 15s");
            }

            String result = combinedOutput.toString();
            if (result.contains("[sudo] password for")) {
                int nlIndex = result.indexOf("\n");
                if (nlIndex != -1) {
                    result = result.substring(nlIndex + 1).trim();
                } else {
                    result = ""; // No output other than sudo prompt
                }
            }
            return result;
        } finally {
            if (channel != null) channel.disconnect();
            if (session != null) session.disconnect();
        }
    }

    /**
     * Reads the content of a remote file using sudo cat.
     */
    public String readRemoteFile(String host, Integer port, String user, String pass, String path) throws Exception {
        String finalUser = resolveUsername(user);
        String finalPass = resolvePassword(pass);
        int finalPort = (port != null && port > 0) ? port : 22;

        JSch jsch = new JSch();
        Session session = null;
        ChannelExec channel = null;
        try {
            session = jsch.getSession(finalUser, host, finalPort);
            session.setPassword(finalPass);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(5000);

            channel = (ChannelExec) session.openChannel("exec");
            channel.setPty(true);
            // Use boundaries to cleanly isolate the file content from any sudo or MOTD noise in the PTY stream
            // RHEL 8 Stability: Use absolute paths for bash
            String command = String.format("sudo -S /usr/bin/bash -c \"echo '----START----'; cat %s; echo '----END----'\"", path);
            channel.setCommand(command);
            
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            channel.setOutputStream(out);
            channel.setErrStream(out);
            
            java.io.OutputStream stdin = channel.getOutputStream();
            channel.connect();
            
            stdin.write((finalPass + "\n").getBytes());
            stdin.flush();
            
            long start = System.currentTimeMillis();
            while (!channel.isClosed() && (System.currentTimeMillis() - start) < 15000) {
                Thread.sleep(100);
            }
            
            if (!channel.isClosed()) {
                channel.disconnect();
                throw new RuntimeException("Read operation timed out after 15s");
            }
            
            String result = out.toString();
            // Extract safely
            int startIndex = result.indexOf("----START----");
            int endIndex = result.lastIndexOf("----END----");
            
            if (startIndex != -1 && endIndex != -1 && (startIndex + 13) <= endIndex) {
                result = result.substring(startIndex + 13, endIndex);
                if (result.startsWith("\n")) result = result.substring(1);
                if (result.startsWith("\r\n")) result = result.substring(2);
                if (result.endsWith("\n")) result = result.substring(0, result.length() - 1);
                if (result.endsWith("\r")) result = result.substring(0, result.length() - 1);
            } else {
                // If the boundaries are missing, it's likely a sudo error or file not found
                if (result.contains("No such file") || result.contains("not found")) {
                   throw new java.io.FileNotFoundException("The script file was not found on the remote VM at: " + path);
                }
                if (result.contains("[sudo] password")) {
                   int firstNl = result.indexOf("\n");
                   if (firstNl != -1) result = result.substring(firstNl + 1).trim();
                }
                result = result.replace("----START----\n", "").replace("\n----END----", "").replace("----END----", "").trim();
            }
            
            return result;
        } finally {
            if (channel != null) channel.disconnect();
            if (session != null) session.disconnect();
        }
    }

    /**
     * Writes content to a remote file using sudo tee, including a backup of the original.
     */
    public String writeRemoteFile(String host, Integer port, String user, String pass, String path, String content) throws Exception {
        String finalUser = resolveUsername(user);
        String finalPass = resolvePassword(pass);
        int finalPort = (port != null && port > 0) ? port : 22;

        JSch jsch = new JSch();
        Session session = null;
        ChannelExec channel = null;
        try {
            session = jsch.getSession(finalUser, host, finalPort);
            session.setPassword(finalPass);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(10000);

            channel = (ChannelExec) session.openChannel("exec");
            channel.setPty(true);
            
            String base64Content = java.util.Base64.getEncoder().encodeToString(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            
            // Execute the entire write operation locally on the VM via a self-terminating bash command.
            // RHEL 8 Stability: Use absolute binary paths
            String command = String.format("sudo -S /usr/bin/bash -c \"mkdir -p $(dirname %1$s); cp %1$s %1$s.bak 2>/dev/null; echo '%2$s' | /usr/bin/base64 -d | /usr/bin/tee %1$s > /dev/null\"", path, base64Content);
            channel.setCommand(command);
            
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            channel.setOutputStream(out);
            channel.setErrStream(out);
            
            java.io.OutputStream stdin = channel.getOutputStream();
            channel.connect(5000);
            
            // Provide sudo password
            stdin.write((finalPass + "\n").getBytes());
            stdin.flush();
            
            // Automatic clean exit once the base64 command finishes
            long start = System.currentTimeMillis();
            while (!channel.isClosed() && (System.currentTimeMillis() - start) < 10000) {
                Thread.sleep(100);
            }
            
            if (!channel.isClosed()) {
                channel.disconnect();
                throw new RuntimeException("Save operation timed out after 20s");
            }
            
            String result = out.toString();
            if (result.contains("Permission denied") || result.contains("Failed")) {
                throw new RuntimeException(result);
            }
            
            return "File updated successfully (Backup created: " + path + ".bak)";
        } finally {
            if (channel != null) channel.disconnect();
            if (session != null) session.disconnect();
        }
    }

    /**
     * Executes a remote file using its absolute path.
     */
    public String executeRemoteFile(String host, Integer port, String user, String pass, String path) throws Exception {
        String finalUser = resolveUsername(user);
        String finalPass = resolvePassword(pass);
        int finalPort = (port != null && port > 0) ? port : 22;

        JSch jsch = new JSch();
        Session session = null;
        ChannelExec channel = null;
        try {
            session = jsch.getSession(finalUser, host, finalPort);
            session.setPassword(finalPass);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(10000);

            channel = (ChannelExec) session.openChannel("exec");
            channel.setPty(true); 
            
            // Execute the specific path provided
            // RHEL 8 Stability: Use absolute paths
            String command = String.format("sudo -S /usr/bin/bash %s", path);
            channel.setCommand(command);
            
            java.io.ByteArrayOutputStream combinedOutput = new java.io.ByteArrayOutputStream();
            channel.setOutputStream(combinedOutput);
            channel.setErrStream(combinedOutput);

            java.io.OutputStream out = channel.getOutputStream();
            channel.connect(5000);

            out.write((finalPass + "\n").getBytes());
            out.flush();

            long start = System.currentTimeMillis();
            while (!channel.isClosed() && (System.currentTimeMillis() - start) < 20000) {
                Thread.sleep(100);
            }
            
            if (!channel.isClosed()) {
                channel.disconnect();
                throw new RuntimeException("Execution timed out after 20s");
            }

            return combinedOutput.toString();
        } finally {
            if (channel != null) channel.disconnect();
            if (session != null) session.disconnect();
        }
    }
}
