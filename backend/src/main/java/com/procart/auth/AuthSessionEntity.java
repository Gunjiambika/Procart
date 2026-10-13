package com.procart.auth;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "auth_sessions")
public class AuthSessionEntity {

  @Id private String token;

  private String userId;
  private Instant createdAt;

  public AuthSessionEntity() {}

  public AuthSessionEntity(String token, String userId, Instant createdAt) {
    this.token = token;
    this.userId = userId;
    this.createdAt = createdAt;
  }

  public String getToken() {
    return token;
  }

  public String getUserId() {
    return userId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
