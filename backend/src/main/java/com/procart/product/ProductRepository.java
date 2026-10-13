package com.procart.product;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<ProductEntity, String> {

  List<ProductEntity> findByAdminCreatedTrueAndActiveTrueOrderByNameAsc();

  List<ProductEntity> findByActiveTrueOrderByNameAsc();
}
