package com.procart.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {

  private static final int DEFAULT_STOCK_QUANTITY = 10;

  private final ProductRepository productRepository;

  public ProductService(ProductRepository productRepository) {
    this.productRepository = productRepository;
  }

  @Transactional(readOnly = true)
  public List<Product> getAdminProducts() {
    return productRepository.findByAdminCreatedTrueAndActiveTrueOrderByNameAsc().stream()
        .map(this::toProduct)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<Product> searchProducts(
      String query, String department, BigDecimal minPrice, BigDecimal maxPrice) {
    String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    String normalizedDepartment = department == null ? "" : department.trim().toLowerCase(Locale.ROOT);

    return productRepository.findByActiveTrueOrderByNameAsc().stream()
        .filter(
            (product) ->
                normalizedDepartment.isEmpty()
                    || product.getDepartment().toLowerCase(Locale.ROOT).equals(normalizedDepartment))
        .filter((product) -> minPrice == null || product.getPrice().compareTo(minPrice) >= 0)
        .filter((product) -> maxPrice == null || product.getPrice().compareTo(maxPrice) <= 0)
        .filter(
            (product) ->
                normalizedQuery.isEmpty()
                    || String.join(
                            " ",
                            product.getName(),
                            product.getDetails(),
                            product.getDepartment(),
                            String.join(" ", product.getKeywords()),
                            String.join(" ", product.getSpecs()))
                        .toLowerCase(Locale.ROOT)
                        .contains(normalizedQuery))
        .map(this::toProduct)
        .toList();
  }

  @Transactional
  public Product addProduct(ProductRequest request) {
    String id = valueOrFallback(request.id(), "admin-product-" + Instant.now().toEpochMilli());

    if (productRepository.existsById(id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "A product with that id already exists.");
    }

    ProductEntity product = new ProductEntity();
    applyRequest(product, request, id);
    product.setAdminCreated(true);
    product.setActive(true);
    return toProduct(productRepository.save(product));
  }

  @Transactional
  public Product updateProduct(String productId, ProductRequest request) {
    ProductEntity product = requireProduct(productId);
    applyRequest(product, request, productId);
    return toProduct(productRepository.save(product));
  }

  @Transactional
  public Product updateStock(String productId, int stockQuantity) {
    ProductEntity product = requireProduct(productId);
    product.setStockQuantity(Math.max(0, stockQuantity));
    return toProduct(productRepository.save(product));
  }

  @Transactional
  public void deleteProduct(String productId) {
    ProductEntity product = requireProduct(productId);
    product.setActive(false);
    productRepository.save(product);
  }

  ProductEntity requireProduct(String productId) {
    return productRepository
        .findById(productId)
        .filter(ProductEntity::isActive)
        .orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product was not found."));
  }

  Product toProduct(ProductEntity product) {
    return new Product(
        product.getId(),
        product.getName(),
        product.getDepartment(),
        product.getImage(),
        List.copyOf(product.getGallery()),
        product.getPrice(),
        product.getMrp(),
        product.getRating(),
        product.getReviews(),
        product.getBadge(),
        product.getDetails(),
        List.copyOf(product.getSpecs()),
        List.copyOf(product.getKeywords()),
        product.getStockQuantity(),
        product.isAdminCreated());
  }

  private void applyRequest(ProductEntity product, ProductRequest request, String productId) {
    product.setId(productId);
    product.setName(request.name().trim());
    product.setDepartment(request.department().trim());
    product.setImage(valueOrFallback(request.image(), ""));
    product.setGallery(listOrFallback(request.gallery(), List.of(valueOrFallback(request.image(), ""))));
    product.setPrice(request.price());
    product.setMrp(request.mrp() == null ? request.price() : request.mrp());
    product.setRating(valueOrFallback(request.rating(), "New"));
    product.setReviews(valueOrFallback(request.reviews(), "0"));
    product.setBadge(valueOrFallback(request.badge(), "Admin pick"));
    product.setDetails(valueOrFallback(request.details(), request.name().trim()));
    product.setSpecs(listOrFallback(request.specs(), List.of("Admin added", "Fresh listing")));
    product.setKeywords(
        listOrFallback(request.keywords(), List.of(request.name().trim(), request.department().trim())));
    product.setStockQuantity(
        request.stockQuantity() == null ? DEFAULT_STOCK_QUANTITY : Math.max(0, request.stockQuantity()));
  }

  private List<String> listOrFallback(List<String> values, List<String> fallback) {
    if (values == null) {
      return fallback;
    }

    List<String> cleaned =
        values.stream()
            .filter((value) -> value != null && !value.isBlank())
            .map(String::trim)
            .toList();

    return cleaned.isEmpty() ? fallback : cleaned;
  }

  private String valueOrFallback(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value.trim();
  }
}
