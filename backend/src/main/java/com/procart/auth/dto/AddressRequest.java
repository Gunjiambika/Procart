package com.procart.auth.dto;

public record AddressRequest(
    String line1, String landmark, String city, String state, String pincode) {
}
