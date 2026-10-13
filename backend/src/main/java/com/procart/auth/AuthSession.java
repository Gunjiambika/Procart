package com.procart.auth;

import java.time.Instant;

record AuthSession(String token, UserAccount user, Instant createdAt) {
}
