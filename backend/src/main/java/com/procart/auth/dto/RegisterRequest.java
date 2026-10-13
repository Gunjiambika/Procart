package com.procart.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
    @NotBlank(message = "Name is required.") String name,
    @Email(message = "Enter a valid email address.") @NotBlank(message = "Email is required.")
        String email,
    @NotBlank(message = "Password is required.") String password,
    String phone,
    @Valid AddressRequest address) {}
