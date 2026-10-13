package com.procart.product;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class ProductEntity {

  @Id private String id;

  private String name;
  private String department;
  private String image;

  @ElementCollection private List<String> gallery = new ArrayList<>();

  private BigDecimal price;
  private BigDecimal mrp;
  private String rating;
  private String reviews;
  private String badge;
  private String details;

  @ElementCollection private List<String> specs = new ArrayList<>();

  @ElementCollection private List<String> keywords = new ArrayList<>();

  private int stockQuantity;
  private boolean adminCreated;
  private boolean active = true;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDepartment() {
    return department;
  }

  public void setDepartment(String department) {
    this.department = department;
  }

  public String getImage() {
    return image;
  }

  public void setImage(String image) {
    this.image = image;
  }

  public List<String> getGallery() {
    return gallery;
  }

  public void setGallery(List<String> gallery) {
    this.gallery = gallery;
  }

  public BigDecimal getPrice() {
    return price;
  }

  public void setPrice(BigDecimal price) {
    this.price = price;
  }

  public BigDecimal getMrp() {
    return mrp;
  }

  public void setMrp(BigDecimal mrp) {
    this.mrp = mrp;
  }

  public String getRating() {
    return rating;
  }

  public void setRating(String rating) {
    this.rating = rating;
  }

  public String getReviews() {
    return reviews;
  }

  public void setReviews(String reviews) {
    this.reviews = reviews;
  }

  public String getBadge() {
    return badge;
  }

  public void setBadge(String badge) {
    this.badge = badge;
  }

  public String getDetails() {
    return details;
  }

  public void setDetails(String details) {
    this.details = details;
  }

  public List<String> getSpecs() {
    return specs;
  }

  public void setSpecs(List<String> specs) {
    this.specs = specs;
  }

  public List<String> getKeywords() {
    return keywords;
  }

  public void setKeywords(List<String> keywords) {
    this.keywords = keywords;
  }

  public int getStockQuantity() {
    return stockQuantity;
  }

  public void setStockQuantity(int stockQuantity) {
    this.stockQuantity = stockQuantity;
  }

  public boolean isAdminCreated() {
    return adminCreated;
  }

  public void setAdminCreated(boolean adminCreated) {
    this.adminCreated = adminCreated;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }
}
