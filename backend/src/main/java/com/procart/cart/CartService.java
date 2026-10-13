package com.procart.cart;

import com.procart.product.ProductEntity;
import com.procart.product.ProductRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CartService {

  private final CartItemRepository cartItemRepository;
  private final ProductRepository productRepository;

  public CartService(CartItemRepository cartItemRepository, ProductRepository productRepository) {
    this.cartItemRepository = cartItemRepository;
    this.productRepository = productRepository;
  }

  public List<CartItemResponse> getCart(String userId) {
    return cartItemRepository.findByUserIdOrderByIdAsc(userId).stream().map(this::toResponse).toList();
  }

  @Transactional
  public List<CartItemResponse> addItem(String userId, CartItemRequest request) {
    ProductEntity product = requireActiveProduct(request.productId());
    CartItemEntity item =
        cartItemRepository.findByUserIdAndProductId(userId, request.productId()).orElseGet(CartItemEntity::new);
    int requestedQuantity = request.quantity() == null ? 1 : request.quantity();
    int nextQuantity = Math.max(1, item.getQuantity() + requestedQuantity);

    requireAvailableStock(product, nextQuantity);
    item.setUserId(userId);
    syncItemWithProduct(item, product);
    item.setQuantity(nextQuantity);
    cartItemRepository.save(item);
    return getCart(userId);
  }

  @Transactional
  public List<CartItemResponse> updateQuantity(String userId, String productId, int quantity) {
    cartItemRepository
        .findByUserIdAndProductId(userId, productId)
        .ifPresent(
            (item) -> {
              if (quantity <= 0) {
                cartItemRepository.delete(item);
              } else {
                ProductEntity product = requireActiveProduct(productId);
                requireAvailableStock(product, quantity);
                syncItemWithProduct(item, product);
                item.setQuantity(quantity);
                cartItemRepository.save(item);
              }
            });
    return getCart(userId);
  }

  @Transactional
  public List<CartItemResponse> removeItem(String userId, String productId) {
    cartItemRepository.deleteByUserIdAndProductId(userId, productId);
    return getCart(userId);
  }

  @Transactional
  public List<CartItemResponse> clearCart(String userId) {
    cartItemRepository.deleteByUserId(userId);
    return List.of();
  }

  private CartItemResponse toResponse(CartItemEntity item) {
    ProductEntity product =
        productRepository.findById(item.getProductId()).filter(ProductEntity::isActive).orElse(null);

    if (product != null) {
      return new CartItemResponse(
          product.getId(),
          product.getName(),
          product.getPrice(),
          product.getImage(),
          product.getDepartment(),
          item.getQuantity());
    }

    return new CartItemResponse(
        item.getProductId(),
        item.getName(),
        item.getPrice(),
        item.getImage(),
        item.getDepartment(),
        item.getQuantity());
  }

  private ProductEntity requireActiveProduct(String productId) {
    return productRepository
        .findById(productId)
        .filter(ProductEntity::isActive)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product was not found."));
  }

  private void requireAvailableStock(ProductEntity product, int quantity) {
    if (product.getStockQuantity() < quantity) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          product.getName() + " has only " + product.getStockQuantity() + " left.");
    }
  }

  private void syncItemWithProduct(CartItemEntity item, ProductEntity product) {
    item.setProductId(product.getId());
    item.setName(product.getName());
    item.setPrice(product.getPrice());
    item.setImage(product.getImage());
    item.setDepartment(product.getDepartment());
  }
}
