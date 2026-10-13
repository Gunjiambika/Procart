package com.procart.cart;

import java.math.BigDecimal;

public record CartItemResponse(
    String productId,
    String name,
    BigDecimal price,
    String image,
    String department,
    int quantity) {}
