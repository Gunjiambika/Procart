package com.procart.order;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<OrderEntity, String> {

  List<OrderEntity> findByUserIdOrderByPlacedAtDesc(String userId);

  List<OrderEntity> findAllByOrderByPlacedAtDesc();
}
