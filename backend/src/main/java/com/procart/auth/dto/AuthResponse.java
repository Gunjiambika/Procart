package com.procart.auth.dto;

public record AuthResponse(String token, UserResponse user) {
}
