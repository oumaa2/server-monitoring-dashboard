package com.monitoring.monitoring_backend.repository;

import com.monitoring.monitoring_backend.entity.Server;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServerRepository extends JpaRepository<Server, Integer> {
    java.util.Optional<com.monitoring.monitoring_backend.entity.Server> findByHostname(String hostname);
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM servers WHERE CAST(ip_address AS text) = :ipAddress", nativeQuery = true)
    java.util.Optional<com.monitoring.monitoring_backend.entity.Server> findByIpAddress(@org.springframework.data.repository.query.Param("ipAddress") String ipAddress);
}