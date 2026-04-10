package com.monitoring.monitoring_backend.repository;

import com.monitoring.monitoring_backend.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Integer> {
    List<Alert> findByIsAcknowledgedFalse();
}
