package com.procart.auth;

import com.procart.auth.dto.UserResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

  private final AuthService authService;

  public AdminUserController(AuthService authService) {
    this.authService = authService;
  }

  @GetMapping
  public List<UserResponse> getUsers(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return authService.getUsersForAdmin(authorization);
  }
}
