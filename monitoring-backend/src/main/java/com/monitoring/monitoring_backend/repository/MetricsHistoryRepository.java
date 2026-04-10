package com.monitoring.monitoring_backend.repository;

import com.monitoring.monitoring_backend.entity.MetricsHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MetricsHistoryRepository extends JpaRepository<MetricsHistory, Long> {
}