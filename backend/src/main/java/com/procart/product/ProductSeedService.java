package com.procart.product;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class ProductSeedService {

  private static final Resource CATALOG_RESOURCE = new ClassPathResource("catalog-products.json");

  private final ObjectMapper objectMapper;
  private final ProductRepository productRepository;

  public ProductSeedService(ObjectMapper objectMapper, ProductRepository productRepository) {
    this.objectMapper = objectMapper;
    this.productRepository = productRepository;
  }

  @PostConstruct
  void seedProducts() {
    List<SeedProduct> seedProducts = readSeedProducts();
    List<ProductEntity> productsToSave = new ArrayList<>();

    for (SeedProduct seedProduct : seedProducts) {
      ProductEntity product =
          productRepository.findById(seedProduct.id()).orElseGet(ProductEntity::new);

      if (product.isAdminCreated()) {
        continue;
      }

      int stockQuantity =
          product.getId() == null ? Math.max(0, seedProduct.stockQuantity()) : product.getStockQuantity();
      applySeedProduct(product, seedProduct, stockQuantity);
      productsToSave.add(product);
    }

    if (!productsToSave.isEmpty()) {
      productRepository.saveAll(productsToSave);
    }
  }

  private List<SeedProduct> readSeedProducts() {
    try (InputStream inputStream = CATALOG_RESOURCE.getInputStream()) {
      return objectMapper.readValue(inputStream, new TypeReference<>() {});
    } catch (IOException exception) {
      throw new IllegalStateException("Could not load catalog-products.json", exception);
    }
  }

  private void applySeedProduct(ProductEntity product, SeedProduct seedProduct, int stockQuantity) {
    product.setId(seedProduct.id());
    product.setName(seedProduct.name());
    product.setDepartment(seedProduct.department());
    product.setImage(seedProduct.image());
    product.setGallery(listOrFallback(seedProduct.gallery(), List.of(seedProduct.image())));
    product.setPrice(seedProduct.price());
    product.setMrp(seedProduct.mrp());
    product.setRating(seedProduct.rating());
    product.setReviews(seedProduct.reviews());
    product.setBadge(seedProduct.badge());
    product.setDetails(seedProduct.details());
    product.setSpecs(listOrFallback(seedProduct.specs(), List.of()));
    product.setKeywords(listOrFallback(seedProduct.keywords(), List.of(seedProduct.name())));
    product.setStockQuantity(stockQuantity);
    product.setAdminCreated(false);
    product.setActive(true);
  }

  private List<String> listOrFallback(List<String> values, List<String> fallback) {
    if (values == null || values.isEmpty()) {
      return fallback;
    }

    return values;
  }

  private record SeedProduct(
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
      int stockQuantity) {}
}
