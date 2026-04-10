package com.monitoring.monitoring_backend.repository;

import com.monitoring.monitoring_backend.entity.LogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<LogEntry, Long> {
    List<LogEntry> findByLevel(String level);
    List<LogEntry> findByService(String service);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM LogEntry l WHERE l.timestamp < :timestamp")
    void deleteByTimestampBefore(String timestamp);
}
