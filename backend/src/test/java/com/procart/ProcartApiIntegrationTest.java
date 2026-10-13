package com.procart;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ProcartApiIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void exposesHealthAndSeededCatalog() throws Exception {
    mockMvc
        .perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));

    mockMvc
        .perform(get("/api/products").param("department", "accessories"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()", greaterThan(0)));
  }

  @Test
  void customerCanRegisterPersistCartAndPlaceOrder() throws Exception {
    String email = "shopper-" + UUID.randomUUID() + "@procart.test";
    String token =
        tokenFrom(
            postJson(
                "/api/auth/register",
                Map.of(
                    "name", "Integration Shopper",
                    "email", email,
                    "password", "safe-password",
                    "phone", "+91 90000 12345")));

    mockMvc
        .perform(get("/api/auth/me").header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email));

    mockMvc
        .perform(
            postJson(
                    "/api/cart/items",
                    Map.of("productId", "headphones", "quantity", 2))
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].name").value("NoiseShield Wireless Headphones"))
        .andExpect(jsonPath("$[0].quantity").value(2));

    mockMvc
        .perform(
            postJson(
                    "/api/orders",
                    Map.of(
                        "itemCount", 2,
                        "total", 1998,
                        "paymentTitle", "Cash on delivery",
                        "deliveryAddress", "Bengaluru, Karnataka 560001",
                        "items",
                            new Object[] {
                              Map.of(
                                  "id", "headphones",
                                  "name", "NoiseShield Wireless Headphones",
                                  "price", 999,
                                  "quantity", 2)
                            }))
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("Confirmed"))
        .andExpect(jsonPath("$.items", hasSize(1)));

    mockMvc
        .perform(get("/api/cart").header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));

    mockMvc
        .perform(get("/api/orders").header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)));
  }

  @Test
  void cartUsesCatalogProductDetailsAndRejectsInvalidQuantities() throws Exception {
    String token = registerCustomer("Catalog Cart Shopper");

    mockMvc
        .perform(
            postJson(
                    "/api/cart/items",
                    Map.of(
                        "productId", "headphones",
                        "name", "Tampered Name",
                        "price", 1,
                        "quantity", 1))
                .header("Authorization", bearer(token)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].productId").value("headphones"))
        .andExpect(jsonPath("$[0].name").value("NoiseShield Wireless Headphones"))
        .andExpect(jsonPath("$[0].price").value(999));

    mockMvc
        .perform(
            postJson("/api/cart/items", Map.of("productId", "missing-product", "quantity", 1))
                .header("Authorization", bearer(token)))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            postJson("/api/cart/items", Map.of("productId", "headphones", "quantity", 999))
                .header("Authorization", bearer(token)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void protectedAndAdminEndpointsEnforceRoles() throws Exception {
    mockMvc.perform(get("/api/cart")).andExpect(status().isUnauthorized());

    String customerToken = login("demo@procart.com", "procart123");
    mockMvc
        .perform(get("/api/admin/users").header("Authorization", bearer(customerToken)))
        .andExpect(status().isForbidden());

    String adminToken = login("admin@procart.com", "admin123");
    mockMvc
        .perform(get("/api/admin/users").header("Authorization", bearer(adminToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()", greaterThan(1)));
  }

  @Test
  void eachCustomerHasAnIndependentCart() throws Exception {
    String firstToken = registerCustomer("First Shopper");
    String secondToken = registerCustomer("Second Shopper");

    mockMvc
        .perform(
            postJson(
                    "/api/cart/items",
                    Map.of("productId", "wireless-earbuds", "quantity", 1))
                .header("Authorization", bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)));

    mockMvc
        .perform(get("/api/cart").header("Authorization", bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));

    mockMvc
        .perform(
            postJson(
                    "/api/cart/items",
                    Map.of("productId", "neckband-earphones", "quantity", 2))
                .header("Authorization", bearer(secondToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].productId").value("neckband-earphones"));

    mockMvc
        .perform(get("/api/cart").header("Authorization", bearer(firstToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].productId").value("wireless-earbuds"));
  }

  private String login(String email, String password) throws Exception {
    return tokenFrom(
        postJson("/api/auth/login", Map.of("email", email, "password", password)));
  }

  private String registerCustomer(String name) throws Exception {
    return tokenFrom(
        postJson(
            "/api/auth/register",
            Map.of(
                "name", name,
                "email", "shopper-" + UUID.randomUUID() + "@procart.test",
                "password", "safe-password")));
  }

  private String tokenFrom(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    String response =
        mockMvc
            .perform(request)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode json = objectMapper.readTree(response);
    return json.get("token").asText();
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder postJson(
      String path, Object body) throws Exception {
    return post(path)
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsBytes(body));
  }

  private String bearer(String token) {
    return "Bearer " + token;
  }
}
