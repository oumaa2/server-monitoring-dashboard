package com.monitoring.monitoring_backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monitoring.monitoring_backend.entity.Server;
import com.monitoring.monitoring_backend.repository.ServerRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class ServerCacheService {

    @Autowired
    private ServerRepository serverRepository;

    private final Map<Integer, Server> cache = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
    private final String CACHE_FILE = "servers_fallback.json";

    @PostConstruct
    public void init() {
        loadFromDisk();
        refreshCache();
    }

    /**
     * Refresh the cache every 5 minutes.
     * If the database is down, the old cache remains valid.
     */
    @Scheduled(fixedRate = 300000)
    public void refreshCache() {
        try {
            List<Server> servers = serverRepository.findAll();
            if (servers != null && !servers.isEmpty()) {
                cache.clear();
                servers.forEach(s -> cache.put(s.getId(), s));
                saveToDisk(servers);
                log.info("Server cache refreshed and persisted to disk ({} servers).", servers.size());
            }
        } catch (Exception e) {
            log.warn("Failed to refresh server cache from database. Using existing cache/disk fallback. Error: {}", e.getMessage());
        }
    }

    private void saveToDisk(List<Server> servers) {
        try {
            objectMapper.writeValue(new File(CACHE_FILE), servers);
        } catch (Exception e) {
            log.error("Failed to save server cache to disk: {}", e.getMessage());
        }
    }

    private void loadFromDisk() {
        try {
            File file = new File(CACHE_FILE);
            if (file.exists()) {
                List<Server> servers = objectMapper.readValue(file, new TypeReference<List<Server>>() {});
                servers.forEach(s -> cache.put(s.getId(), s));
                log.info("Loaded {} servers from persistent cache file.", servers.size());
            }
        } catch (Exception e) {
            log.error("Failed to load server cache from disk: {}", e.getMessage());
        }
    }

    public List<Server> getAllServers() {
        // If cache is empty and DB is up, try one last time
        if (cache.isEmpty()) {
            refreshCache();
        }
        
        // Return from cache if possible, otherwise try DB (if DB is down, return empty to avoid crash)
        if (!cache.isEmpty()) {
            return new ArrayList<>(cache.values());
        }

        try {
            return serverRepository.findAll();
        } catch (Exception e) {
            log.error("Critical: Could not load servers from DB or cache.");
            return new ArrayList<>();
        }
    }

    public Optional<Server> getById(Integer id) {
        if (cache.containsKey(id)) {
            return Optional.of(cache.get(id));
        }
        
        try {
            Optional<Server> server = serverRepository.findById(id);
            server.ifPresent(s -> cache.put(s.getId(), s));
            return server;
        } catch (Exception e) {
            log.warn("Failed to lookup server {} from database: {}. Falling back to cache.", id, e.getMessage());
            // Fallback: if it's in the cache, use it even if DB is broken
            if (cache.containsKey(id)) {
                return Optional.of(cache.get(id));
            }
            return Optional.empty();
        }
    }

    public Optional<Server> getByIpAddress(String ip) {
        // Search cache first
        Optional<Server> cached = cache.values().stream()
            .filter(s -> ip.equals(s.getIpAddress()))
            .findFirst();
        
        if (cached.isPresent()) return cached;

        try {
            Optional<Server> server = serverRepository.findByIpAddress(ip);
            server.ifPresent(s -> cache.put(s.getId(), s));
            return server;
        } catch (Exception e) {
            log.warn("Failed to lookup server with IP {} from database: {}", ip, e.getMessage());
            return Optional.empty();
        }
    }
}
