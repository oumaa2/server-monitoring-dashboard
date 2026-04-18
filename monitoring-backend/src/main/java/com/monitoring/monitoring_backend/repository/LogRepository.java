package com.monitoring.monitoring_backend.repository;

import com.monitoring.monitoring_backend.entity.LogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<LogEntry, Long> {
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM logs l WHERE " +
            "(:level IS NULL OR l.level = :level) AND " +
            "(:service IS NULL OR l.service = :service) AND " +
            "(:serverName IS NULL OR l.server_name = :serverName) AND " +
            "(:search IS NULL OR l.message::TEXT ILIKE '%' || :search || '%' OR l.details::TEXT ILIKE '%' || :search || '%')",
            countQuery = "SELECT count(*) FROM logs l WHERE " +
                    "(:level IS NULL OR l.level = :level) AND " +
                    "(:service IS NULL OR l.service = :service) AND " +
                    "(:serverName IS NULL OR l.server_name = :serverName) AND " +
                    "(:search IS NULL OR l.message::TEXT ILIKE '%' || :search || '%' OR l.details::TEXT ILIKE '%' || :search || '%')",
            nativeQuery = true)
    org.springframework.data.domain.Page<LogEntry> findWithFilters(
            @org.springframework.data.repository.query.Param("level") String level,
            @org.springframework.data.repository.query.Param("service") String service,
            @org.springframework.data.repository.query.Param("serverName") String serverName,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM LogEntry l WHERE l.timestamp < :timestamp")
    void deleteByTimestampBefore(@org.springframework.data.repository.query.Param("timestamp") String timestamp);
}
