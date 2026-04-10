package com.monitoring.monitoring_backend.service;

import org.springframework.stereotype.Service;

/**
 * In-memory store for user-configurable alert thresholds.
 * Values are updated live via POST /api/settings/thresholds
 * and used by DashboardController when evaluating alerts.
 */
@Service
public class SettingsService {

    // Alert thresholds (percentages)
    private volatile double cpuThreshold   = 80.0;
    private volatile double memThreshold   = 85.0;
    private volatile double diskThreshold  = 90.0;
    private volatile double dbStorageThreshold = 85.0; // PostgreSQL data size vs disk

    public double getCpuThreshold()        { return cpuThreshold;        }
    public double getMemThreshold()        { return memThreshold;        }
    public double getDiskThreshold()       { return diskThreshold;       }
    public double getDbStorageThreshold()  { return dbStorageThreshold;  }

    public void setThresholds(double cpu, double mem, double disk, double dbStorage) {
        this.cpuThreshold       = clamp(cpu);
        this.memThreshold       = clamp(mem);
        this.diskThreshold      = clamp(disk);
        this.dbStorageThreshold = clamp(dbStorage);
        System.out.printf(">>> [Settings] Thresholds updated — CPU:%.0f%% MEM:%.0f%% DISK:%.0f%% DB_STORAGE:%.0f%%%n",
                cpuThreshold, memThreshold, diskThreshold, dbStorageThreshold);
    }

    private double clamp(double v) {
        return Math.max(0, Math.min(100, v));
    }
}
