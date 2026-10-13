package com.procart.product;

import com.procart.auth.AuthService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
public class ProductController {

  private final AuthService authService;
  private final ProductService productService;

  public ProductController(AuthService authService, ProductService productService) {
    this.authService = authService;
    this.productService = productService;
  }

  @GetMapping
  public List<Product> getAdminProducts(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    authService.requireAdmin(authorization);
    return productService.getAdminProducts();
  }

  @PostMapping
  public Product addProduct(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody ProductRequest request) {
    authService.requireAdmin(authorization);
    return productService.addProduct(request);
  }

  @PutMapping("/{productId}")
  public Product updateProduct(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String productId,
      @Valid @RequestBody ProductRequest request) {
    authService.requireAdmin(authorization);
    return productService.updateProduct(productId, request);
  }

  @PatchMapping("/{productId}/stock/{stockQuantity}")
  public Product updateProductStock(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String productId,
      @PathVariable int stockQuantity) {
    authService.requireAdmin(authorization);
    return productService.updateStock(productId, stockQuantity);
  }

  @DeleteMapping("/{productId}")
  public void deleteProduct(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String productId) {
    authService.requireAdmin(authorization);
    productService.deleteProduct(productId);
  }
}
