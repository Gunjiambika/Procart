package com.procart.auth.dto;

public record AddressResponse(
    String line1, String landmark, String city, String state, String pincode) {
}
