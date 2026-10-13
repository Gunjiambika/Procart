package com.procart.category;

import jakarta.annotation.PostConstruct;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

  private final CategoryRepository categoryRepository;

  public CategoryService(CategoryRepository categoryRepository) {
    this.categoryRepository = categoryRepository;
  }

  @PostConstruct
  void seedCategories() {
    if (categoryRepository.count() > 0) {
      return;
    }

    categoryRepository.saveAll(
        List.of(
            new CategoryEntity("men", "Men", "", "Shirts, jackets, hoodies and everyday menswear"),
            new CategoryEntity("women", "Women", "", "Dresses, sarees, kurtis and western wear"),
            new CategoryEntity("shoes", "Shoes", "", "Sneakers, formal shoes, heels and flats"),
            new CategoryEntity("kids", "Kids", "", "Cute dresses, frocks, gowns and boys wear"),
            new CategoryEntity("beauty", "Beauty", "", "Makeup, skincare, fragrance and tools"),
            new CategoryEntity("accessories", "Accessories", "", "Bags, bottles, laptops and gadgets")));
  }

  public List<Category> getCategories() {
    return categoryRepository.findAllByOrderByTitleAsc().stream()
        .map((category) -> new Category(category.getId(), category.getTitle(), category.getImage(), category.getCopy()))
        .toList();
  }
}
