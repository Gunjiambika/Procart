package com.procart.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
    @NotBlank(message = "Name is required.") String name,
    @Email(message = "Enter a valid email address.") @NotBlank(message = "Email is required.")
        String email,
    @NotBlank(message = "Phone number is required.") String phone,
    @Valid AddressRequest address) {
}