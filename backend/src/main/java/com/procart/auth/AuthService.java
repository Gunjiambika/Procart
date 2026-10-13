package com.procart.auth;

import com.procart.auth.dto.AddressRequest;
import com.procart.auth.dto.AddressResponse;
import com.procart.auth.dto.AuthResponse;
import com.procart.auth.dto.LoginRequest;
import com.procart.auth.dto.RegisterRequest;
import com.procart.auth.dto.UpdateProfileRequest;
import com.procart.auth.dto.UserResponse;
import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final UserAccountRepository userAccountRepository;
  private final AuthSessionRepository authSessionRepository;

  public AuthService(
      UserAccountRepository userAccountRepository, AuthSessionRepository authSessionRepository) {
    this.userAccountRepository = userAccountRepository;
    this.authSessionRepository = authSessionRepository;
  }

  @PostConstruct
  void seedUsers() {
    addUserIfMissing(
        "demo",
        "Demo Shopper",
        "demo@procart.com",
        "procart123",
        "+91 98765 43210",
        new UserAddress(
            "221B Market Street",
            "Near ProCart pickup point",
            "Bengaluru",
            "Karnataka",
            "560001"),
        "CUSTOMER");
    addUserIfMissing(
        "admin",
        "Admin Manager",
        "admin@procart.com",
        "admin123",
        "+91 90000 11111",
        new UserAddress(
            "ProCart Operations Desk",
            "Admin floor",
            "Bengaluru",
            "Karnataka",
            "560001"),
        "ADMIN");
  }

  public AuthResponse login(LoginRequest request) {
    String email = normalizeEmail(request.email());
    UserAccountEntity account =
        userAccountRepository
            .findByEmail(email)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid email or password."));

    if (!passwordEncoder.matches(request.password(), account.getPasswordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }

    String token = UUID.randomUUID().toString();
    authSessionRepository.save(new AuthSessionEntity(token, account.getId(), Instant.now()));

    return new AuthResponse(token, toUserResponse(account));
  }

  public AuthResponse register(RegisterRequest request) {
    String email = normalizeEmail(request.email());

    if (userAccountRepository.findByEmail(email).isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists.");
    }

    AddressRequest address = request.address();
    UserAccountEntity account =
        new UserAccountEntity(
            "customer-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10),
            request.name().trim(),
            email,
            passwordEncoder.encode(request.password()),
            valueOrFallback(request.phone(), "+91 90000 00000"),
            valueOrFallback(address == null ? null : address.line1(), "Saved address"),
            valueOrFallback(address == null ? null : address.landmark(), ""),
            valueOrFallback(address == null ? null : address.city(), "Bengaluru"),
            valueOrFallback(address == null ? null : address.state(), "Karnataka"),
            valueOrFallback(address == null ? null : address.pincode(), "560001"),
            "CUSTOMER");

    userAccountRepository.save(account);
    return login(new LoginRequest(email, request.password()));
  }

  public UserResponse currentUser(String authorizationHeader) {
    return toUserResponse(requireSessionUser(authorizationHeader));
  }

  public UserResponse requireAdmin(String authorizationHeader) {
    UserAccountEntity account = requireSessionUser(authorizationHeader);

    if (!"ADMIN".equals(account.getRole())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access is required.");
    }

    return toUserResponse(account);
  }

  public UserResponse updateProfile(String authorizationHeader, UpdateProfileRequest request) {
    UserAccountEntity account = requireSessionUser(authorizationHeader);
    String nextEmail = normalizeEmail(request.email());

    userAccountRepository
        .findByEmail(nextEmail)
        .filter((existing) -> !existing.getId().equals(account.getId()))
        .ifPresent(
            (existing) -> {
              throw new ResponseStatusException(
                  HttpStatus.CONFLICT, "That email is already used by another account.");
            });

    AddressRequest address = request.address();
    account.setName(request.name().trim());
    account.setEmail(nextEmail);
    account.setPhone(request.phone().trim());
    account.setAddressLine(valueOrFallback(address == null ? null : address.line1(), account.getAddressLine()));
    account.setLandmark(valueOrFallback(address == null ? null : address.landmark(), account.getLandmark()));
    account.setCity(valueOrFallback(address == null ? null : address.city(), account.getCity()));
    account.setState(valueOrFallback(address == null ? null : address.state(), account.getState()));
    account.setPincode(valueOrFallback(address == null ? null : address.pincode(), account.getPincode()));

    return toUserResponse(userAccountRepository.save(account));
  }

  public List<UserResponse> getUsersForAdmin(String authorizationHeader) {
    requireAdmin(authorizationHeader);

    return userAccountRepository.findAll().stream()
        .map(this::toUserResponse)
        .sorted(Comparator.comparing(UserResponse::role).thenComparing(UserResponse::name))
        .toList();
  }

  public void logout(String authorizationHeader) {
    String token = readBearerToken(authorizationHeader);

    if (token != null) {
      authSessionRepository.deleteById(token);
    }
  }

  private UserAccountEntity requireSessionUser(String authorizationHeader) {
    String token = requireBearerToken(authorizationHeader);
    AuthSessionEntity session =
        authSessionRepository
            .findById(token)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Your session has expired."));

    return userAccountRepository
        .findById(session.getUserId())
        .orElseThrow(
            () ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your account was not found."));
  }

  private void addUserIfMissing(
      String id,
      String name,
      String email,
      String password,
      String phone,
      UserAddress address,
      String role) {
    String normalizedEmail = normalizeEmail(email);

    if (userAccountRepository.findByEmail(normalizedEmail).isPresent()) {
      return;
    }

    userAccountRepository.save(
        new UserAccountEntity(
            id,
            name,
            normalizedEmail,
            passwordEncoder.encode(password),
            phone,
            address.line1(),
            address.landmark(),
            address.city(),
            address.state(),
            address.pincode(),
            role));
  }

  private UserResponse toUserResponse(UserAccountEntity account) {
    AddressResponse addressResponse =
        new AddressResponse(
            account.getAddressLine(),
            account.getLandmark(),
            account.getCity(),
            account.getState(),
            account.getPincode());

    return new UserResponse(
        account.getId(),
        account.getName(),
        account.getEmail(),
        account.getPhone(),
        addressResponse,
        account.getRole());
  }

  private String requireBearerToken(String authorizationHeader) {
    String token = readBearerToken(authorizationHeader);

    if (token == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in first.");
    }

    return token;
  }

  private String readBearerToken(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      return null;
    }

    String token = authorizationHeader.substring("Bearer ".length()).trim();
    return token.isEmpty() ? null : token;
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String valueOrFallback(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value.trim();
  }
}
