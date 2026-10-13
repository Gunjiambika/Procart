package com.procart.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderRequest(
    String id,
    @Min(value = 1, message = "Order must include at least one item.") Integer itemCount,
    @NotNull(message = "Order total is required.")
        @DecimalMin(value = "0.01", message = "Order total must be positive.")
        BigDecimal total,
    @NotBlank(message = "Payment method is required.") String paymentTitle,
    Instant placedAt,
    String status,
    @NotBlank(message = "Delivery address is required.") String deliveryAddress,
    @NotEmpty(message = "Order items are required.") List<@Valid OrderItemRequest> items) {
}
