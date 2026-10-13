package com.procart.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record Order(
    String id,
    String userId,
    int itemCount,
    BigDecimal total,
    String paymentTitle,
    Instant placedAt,
    String status,
    String deliveryAddress,
    List<OrderItem> items) {
}
