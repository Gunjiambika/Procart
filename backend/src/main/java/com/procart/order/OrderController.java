package com.procart.order;

import com.procart.auth.AuthService;
import com.procart.auth.dto.UserResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

  private final AuthService authService;
  private final OrderService orderService;

  public OrderController(AuthService authService, OrderService orderService) {
    this.authService = authService;
    this.orderService = orderService;
  }

  @GetMapping
  public List<Order> getOrders(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    UserResponse user = authService.currentUser(authorization);
    return orderService.getOrders(user);
  }

  @PostMapping
  public Order placeOrder(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody OrderRequest request) {
    UserResponse user = authService.currentUser(authorization);
    return orderService.placeOrder(user, request);
  }
}
