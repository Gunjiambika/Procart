package com.procart.order;

import com.procart.auth.AuthService;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

  private final AuthService authService;
  private final OrderService orderService;

  public AdminOrderController(AuthService authService, OrderService orderService) {
    this.authService = authService;
    this.orderService = orderService;
  }

  @GetMapping
  public List<Order> getAllOrders(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    authService.requireAdmin(authorization);
    return orderService.getAllOrders();
  }

  @PatchMapping("/{orderId}/status")
  public Order updateStatus(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String orderId,
      @Valid @RequestBody OrderStatusRequest request) {
    authService.requireAdmin(authorization);
    return orderService.updateStatus(orderId, request.status());
  }
}
