package com.procart.order;

import com.procart.auth.dto.AddressResponse;
import com.procart.auth.dto.UserResponse;
import com.procart.cart.CartService;
import com.procart.product.ProductEntity;
import com.procart.product.ProductRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {

  private final OrderRepository orderRepository;
  private final ProductRepository productRepository;
  private final CartService cartService;

  public OrderService(
      OrderRepository orderRepository, ProductRepository productRepository, CartService cartService) {
    this.orderRepository = orderRepository;
    this.productRepository = productRepository;
    this.cartService = cartService;
  }

  public List<Order> getOrders(UserResponse user) {
    return orderRepository.findByUserIdOrderByPlacedAtDesc(user.id()).stream().map(this::toOrder).toList();
  }

  public List<Order> getAllOrders() {
    return orderRepository.findAllByOrderByPlacedAtDesc().stream().map(this::toOrder).toList();
  }

  @Transactional
  public Order placeOrder(UserResponse user, OrderRequest request) {
    List<OrderItemEntity> items =
        request.items().stream()
            .map(
                (item) -> {
                  int quantity = item.quantity() == null ? 1 : item.quantity();
                  decrementStockIfManagedProduct(item.id(), quantity);

                  OrderItemEntity entity = new OrderItemEntity();
                  entity.setProductId(item.id());
                  entity.setName(item.name());
                  entity.setPrice(item.price());
                  entity.setQuantity(quantity);
                  return entity;
                })
            .toList();

    OrderEntity order = new OrderEntity();
    order.setId(valueOrFallback(request.id(), createOrderId()));
    order.setUserId(user.id());
    order.setItemCount(request.itemCount() == null ? totalQuantity(items) : request.itemCount());
    order.setTotal(request.total());
    order.setPaymentTitle(valueOrFallback(request.paymentTitle(), "Payment"));
    order.setPlacedAt(request.placedAt() == null ? Instant.now() : request.placedAt());
    order.setStatus(valueOrFallback(request.status(), "Confirmed"));
    order.setDeliveryAddress(valueOrFallback(request.deliveryAddress(), defaultAddress(user)));
    order.setItems(items);

    Order savedOrder = toOrder(orderRepository.save(order));
    cartService.clearCart(user.id());
    return savedOrder;
  }

  @Transactional
  public Order updateStatus(String orderId, String status) {
    OrderEntity order =
        orderRepository
            .findById(orderId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order was not found."));
    order.setStatus(status.trim());
    return toOrder(orderRepository.save(order));
  }

  private void decrementStockIfManagedProduct(String productId, int quantity) {
    productRepository
        .findById(productId)
        .filter(ProductEntity::isActive)
        .ifPresent(
            (product) -> {
              if (product.getStockQuantity() < quantity) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    product.getName() + " has only " + product.getStockQuantity() + " left.");
              }

              product.setStockQuantity(product.getStockQuantity() - quantity);
              productRepository.save(product);
            });
  }

  private int totalQuantity(List<OrderItemEntity> items) {
    return items.stream().mapToInt(OrderItemEntity::getQuantity).sum();
  }

  private Order toOrder(OrderEntity order) {
    return new Order(
        order.getId(),
        order.getUserId(),
        order.getItemCount(),
        order.getTotal(),
        order.getPaymentTitle(),
        order.getPlacedAt(),
        order.getStatus(),
        order.getDeliveryAddress(),
        order.getItems().stream()
            .map(
                (item) ->
                    new OrderItem(
                        item.getProductId(), item.getName(), item.getPrice(), item.getQuantity()))
            .toList());
  }

  private String createOrderId() {
    return "PC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
  }

  private String defaultAddress(UserResponse user) {
    AddressResponse address = user.address();

    if (address == null) {
      return "Saved ProCart address";
    }

    return String.join(
        ", ",
        List.of(
                address.line1(),
                address.landmark(),
                address.city(),
                address.state(),
                address.pincode())
            .stream()
            .filter((part) -> part != null && !part.isBlank())
            .toList());
  }

  private String valueOrFallback(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value.trim();
  }
}
