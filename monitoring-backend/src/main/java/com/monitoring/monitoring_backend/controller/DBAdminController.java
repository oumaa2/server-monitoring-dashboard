package com.monitoring.monitoring_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class DBAdminController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            System.out.println("DBAdmin: Triggering auto-fix on startup...");
            runFix();
        } catch (Exception e) {
            System.err.println("DBAdmin: Auto-fix failed: " + e.getMessage());
        }
    }

    @GetMapping("/check")
    public Map<String, Object> checkDB() {
        Map<String, Object> report = new HashMap<>();
        try {
            // Check servers table columns
            List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'servers'");
            report.put("servers_columns", columns);

            // Check if alerts table exists
            Integer alertTableCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.tables WHERE table_name = 'alerts'", Integer.class);
            report.put("alerts_table_exists", alertTableCount != null && alertTableCount > 0);

            // Check existing servers
            List<Map<String, Object>> servers = jdbcTemplate.queryForList("SELECT id, hostname, ip_address FROM servers");
            report.put("existing_servers", servers);

        } catch (Exception e) {
            report.put("error", e.getMessage());
        }
        return report;
    }

    @GetMapping("/fix")
    public Map<String, Object> runFix() {
        Map<String, Object> report = new HashMap<>();
        StringBuilder log = new StringBuilder();
        
        try {
            // Get DB Info for debugging
            String dbVersion = jdbcTemplate.queryForObject("SELECT version()", String.class);
            log.append("DB Version: ").append(dbVersion).append(". ");

            // Fix 1: Add missing columns
            String[] cols = {"start_script_path", "stop_script_path", "service_name", "ssh_username", "ssh_password"};
            for (String col : cols) {
                try {
                    // Try with standard name, then with quoted name just in case
                    try {
                        jdbcTemplate.execute("ALTER TABLE servers ADD COLUMN " + col + " VARCHAR(255)");
                        log.append("Added ").append(col).append(" (unquoted). ");
                    } catch (Exception e1) {
                        jdbcTemplate.execute("ALTER TABLE \"servers\" ADD COLUMN \"" + col + "\" VARCHAR(255)");
                        log.append("Added ").append(col).append(" (quoted). ");
                    }
                } catch (Exception e) {
                    log.append("Check ").append(col).append(": ").append(e.getMessage()).append(". ");
                }
            }
            
            // Fix 2: Populate NULL credentials for existing nodes
            try {
                jdbcTemplate.execute("UPDATE servers SET ssh_username = 'pfeadmin' WHERE ssh_username IS NULL");
                jdbcTemplate.execute("UPDATE servers SET ssh_password = '123456' WHERE ssh_password IS NULL");
                log.append("Populated null credentials with defaults. ");
            } catch (Exception e) {
                log.append("Credential update failed: ").append(e.getMessage());
            }
            
            // Fix 3: List current columns for debug
            try {
                List<String> currentCols = jdbcTemplate.queryForList(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'servers' OR table_name = 'Servers'", 
                    String.class);
                log.append("Current columns: ").append(currentCols).append(". ");
            } catch (Exception e) {}
            
            report.put("status", "success");
            report.put("message", "Schema repair attempt completed.");
            report.put("details", log.toString());
        } catch (Exception e) {
            report.put("status", "error");
            report.put("message", "Global repair failure: " + e.getMessage());
        }
        return report;
    }
}
