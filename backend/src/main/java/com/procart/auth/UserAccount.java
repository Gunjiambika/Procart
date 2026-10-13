package com.procart.auth;

record UserAccount(
    String id,
    String name,
    String email,
    String passwordHash,
    String phone,
    UserAddress address,
    String role) {
}
