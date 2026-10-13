package com.procart.auth;

import com.procart.auth.dto.AuthResponse;
import com.procart.auth.dto.LoginRequest;
import com.procart.auth.dto.LogoutResponse;
import com.procart.auth.dto.RegisterRequest;
import com.procart.auth.dto.UpdateProfileRequest;
import com.procart.auth.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @GetMapping("/me")
  public UserResponse currentUser(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return authService.currentUser(authorization);
  }

  @PutMapping("/me")
  public UserResponse updateProfile(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody UpdateProfileRequest request) {
    return authService.updateProfile(authorization, request);
  }

  @PostMapping("/logout")
  public LogoutResponse logout(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    authService.logout(authorization);
    return new LogoutResponse("Signed out.");
  }
}
