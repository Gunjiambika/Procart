package com.procart.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

  @GetMapping("/")
  public Map<String, String> home() {
    return Map.of(
        "application", "ProCart Backend",
        "status", "running",
        "loginEndpoint", "/api/auth/login",
        "healthEndpoint", "/api/health");
  }

  @GetMapping("/api/health")
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }
}
