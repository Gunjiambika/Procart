package com.procart.product;

import java.math.BigDecimal;
import java.util.List;

public record Product(
    String id,
    String name,
    String department,
    String image,
    List<String> gallery,
    BigDecimal price,
    BigDecimal mrp,
    String rating,
    String reviews,
    String badge,
    String details,
    List<String> specs,
    List<String> keywords,
    int stockQuantity,
    boolean adminCreated) {
}
