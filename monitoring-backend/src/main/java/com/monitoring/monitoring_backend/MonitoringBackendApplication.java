package com.monitoring.monitoring_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class MonitoringBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MonitoringBackendApplication.class, args);
	}

}
