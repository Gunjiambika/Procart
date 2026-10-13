package com.procart.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
    String id,
    @NotBlank(message = "Product name is required.") String name,
    @NotBlank(message = "Department is required.") String department,
    String image,
    List<String> gallery,
    @NotNull(message = "Price is required.") @DecimalMin(value = "1", message = "Price must be positive.")
        BigDecimal price,
    BigDecimal mrp,
    String rating,
    String reviews,
    String badge,
    String details,
    List<String> specs,
    List<String> keywords,
    Integer stockQuantity,
    boolean adminCreated) {
}
