package com.procart.auth.dto;

public record UserResponse(
    String id, String name, String email, String phone, AddressResponse address, String role) {
}
