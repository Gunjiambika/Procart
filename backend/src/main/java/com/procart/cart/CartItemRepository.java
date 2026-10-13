package com.procart.cart;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartItemRepository extends JpaRepository<CartItemEntity, Long> {

  List<CartItemEntity> findByUserIdOrderByIdAsc(String userId);

  Optional<CartItemEntity> findByUserIdAndProductId(String userId, String productId);

  void deleteByUserIdAndProductId(String userId, String productId);

  void deleteByUserId(String userId);
}
