package com.monitoring.monitoring_backend.controller;

import com.monitoring.monitoring_backend.service.PrometheusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
public class TestController {
    @Autowired
    private PrometheusService prometheusService;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @GetMapping("/raw")
    public String testRaw(@RequestParam(name = "q") String q) {
        return prometheusService.queryPrometheusRaw(q);
    }

    @GetMapping("/update-ips-now")
    @org.springframework.transaction.annotation.Transactional
    public String updateIps() {
        entityManager.createNativeQuery("UPDATE servers SET ip_address = '192.168.56.102' WHERE hostname = 'target-01'")
                .executeUpdate();
        entityManager.createNativeQuery("UPDATE servers SET ip_address = '192.168.56.104' WHERE hostname = 'target-02'")
                .executeUpdate();
        entityManager.createNativeQuery("UPDATE servers SET ip_address = '192.168.56.103' WHERE hostname = 'target-03'")
                .executeUpdate();
        return "IPs firmly updated: target-01 (102), target-02 (104), target-03 (103)";
    }
}
