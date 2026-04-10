package com.monitoring.monitoring_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PostgresMetricsService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public Map<String, Object> getDeepMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("slowQueries", getSlowQueries());
        metrics.put("cacheHitRatio", getCacheHitRatio());
        metrics.put("activeLocks", getActiveLocks());
        
        return metrics;
    }

    private List<Map<String, Object>> getSlowQueries() {
        try {
            // Requires pg_stat_statements extension
            String sql = "SELECT query, calls, round((total_exec_time / calls)::numeric, 2) as avg_time_ms, rows " +
                         "FROM pg_stat_statements " +
                         "WHERE query NOT LIKE '%pg_stat_statements%' " +
                         "ORDER BY avg_time_ms DESC LIMIT 5";
            return jdbcTemplate.queryForList(sql);
        } catch (Exception e) {
            // Fallback if extension is not installed
            List<Map<String, Object>> fallback = new ArrayList<>();
            Map<String, Object> errorInfo = new HashMap<>();
            errorInfo.put("query", "pg_stat_statements extension not enabled on DB. Enable it to view slow queries.");
            errorInfo.put("calls", 0);
            errorInfo.put("avg_time_ms", 0);
            fallback.add(errorInfo);
            return fallback;
        }
    }

    private double getCacheHitRatio() {
        try {
            String sql = "SELECT sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as ratio " +
                         "FROM pg_statio_user_tables";
            Double ratio = jdbcTemplate.queryForObject(sql, Double.class);
            return ratio != null ? Math.round(ratio * 100.0) / 100.0 : 0.0;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private int getActiveLocks() {
        try {
            String sql = "SELECT COUNT(*) FROM pg_locks WHERE granted = false";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            return count != null ? count : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
