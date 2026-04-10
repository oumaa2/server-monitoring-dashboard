package com.monitoring.monitoring_backend.dto;

import lombok.Data;

@Data
public class ProcessInfo {
    private String user;
    private String pid;
    private double cpu;
    private double mem;
    private String command;

    public ProcessInfo() {}

    public ProcessInfo(String user, String pid, double cpu, double mem, String command) {
        this.user = user;
        this.pid = pid;
        this.cpu = cpu;
        this.mem = mem;
        this.command = command;
    }
}
