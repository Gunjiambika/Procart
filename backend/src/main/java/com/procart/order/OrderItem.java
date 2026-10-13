package com.procart.order;

import java.math.BigDecimal;

public record OrderItem(String id, String name, BigDecimal price, int quantity) {
}
