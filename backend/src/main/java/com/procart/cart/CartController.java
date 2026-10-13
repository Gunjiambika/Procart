package com.procart.cart;

import com.procart.auth.AuthService;
import com.procart.auth.dto.UserResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cart")
public class CartController {

  private final AuthService authService;
  private final CartService cartService;

  public CartController(AuthService authService, CartService cartService) {
    this.authService = authService;
    this.cartService = cartService;
  }

  @GetMapping
  public List<CartItemResponse> getCart(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    UserResponse user = authService.currentUser(authorization);
    return cartService.getCart(user.id());
  }

  @PostMapping("/items")
  public List<CartItemResponse> addItem(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody CartItemRequest request) {
    UserResponse user = authService.currentUser(authorization);
    return cartService.addItem(user.id(), request);
  }

  @PatchMapping("/items/{productId}/{quantity}")
  public List<CartItemResponse> updateQuantity(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String productId,
      @PathVariable int quantity) {
    UserResponse user = authService.currentUser(authorization);
    return cartService.updateQuantity(user.id(), productId, quantity);
  }

  @DeleteMapping("/items/{productId}")
  public List<CartItemResponse> removeItem(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String productId) {
    UserResponse user = authService.currentUser(authorization);
    return cartService.removeItem(user.id(), productId);
  }

  @DeleteMapping
  public List<CartItemResponse> clearCart(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    UserResponse user = authService.currentUser(authorization);
    return cartService.clearCart(user.id());
  }
}
