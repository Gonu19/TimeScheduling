package com.example.timescheduling;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class TimeSchedulingApplication {

	public static void main(String[] args) {
		SpringApplication.run(TimeSchedulingApplication.class, args);
	}
}
