package com.procart.category;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class CategoryEntity {

  @Id private String id;

  private String title;
  private String image;
  private String copy;

  public CategoryEntity() {}

  public CategoryEntity(String id, String title, String image, String copy) {
    this.id = id;
    this.title = title;
    this.image = image;
    this.copy = copy;
  }

  public String getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public String getImage() {
    return image;
  }

  public String getCopy() {
    return copy;
  }
}
