package com.transit.web_gis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class WebGisApplication {

	public static void main(String[] args) {
		SpringApplication.run(WebGisApplication.class, args);
	}

}