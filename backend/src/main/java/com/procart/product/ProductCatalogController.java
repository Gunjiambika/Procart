package com.procart.product;

import java.util.List;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductCatalogController {

  private final ProductService productService;

  public ProductCatalogController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping("/admin-created")
  public List<Product> getAdminCreatedProducts() {
    return productService.getAdminProducts();
  }

  @GetMapping
  public List<Product> searchProducts(
      @RequestParam(required = false) String query,
      @RequestParam(required = false) String department,
      @RequestParam(required = false) BigDecimal minPrice,
      @RequestParam(required = false) BigDecimal maxPrice) {
    return productService.searchProducts(query, department, minPrice, maxPrice);
  }
}
