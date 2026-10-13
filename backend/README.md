# ProCart Backend

Spring Boot API for the ProCart React storefront. It stores demo users, admin-managed products, carts, and orders in H2 by default, with a MySQL profile for persistent local or production-style use.

## Run

```powershell
.\mvnw.cmd spring-boot:run
```

The API runs at `http://localhost:8080`.

## Run With MySQL

Create the database:

```sql
CREATE DATABASE procart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'procart_user'@'localhost' IDENTIFIED BY 'procart_password';
GRANT ALL PRIVILEGES ON procart.* TO 'procart_user'@'localhost';
FLUSH PRIVILEGES;
```

Start the backend with the `mysql` profile:

```powershell
$env:MYSQL_URL="jdbc:mysql://localhost:3306/procart?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:MYSQL_USER="procart_user"
$env:MYSQL_PASSWORD="procart_password"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mysql
```

You can also run it from the project root:

```powershell
npm run start:backend:mysql
```

## Demo Login

- Customer: `demo@procart.com` / `procart123`
- Admin: `admin@procart.com` / `admin123`

## Auth Endpoints

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/logout`

`/me` and `/logout` expect an `Authorization: Bearer <token>` header.

## Product, Cart, And Order Endpoints

- `GET /api/products`
- `GET /api/products/admin-created`
- `GET /api/admin/products` - admin token required
- `POST /api/admin/products` - admin token required
- `PUT /api/admin/products/{productId}` - admin token required
- `PATCH /api/admin/products/{productId}/stock/{stockQuantity}` - admin token required
- `DELETE /api/admin/products/{productId}` - admin token required
- `GET /api/cart` - customer token required
- `POST /api/cart/items` - customer token required
- `GET /api/orders` - customer token required
- `POST /api/orders` - customer token required
- `GET /api/admin/orders` - admin token required
- `PATCH /api/admin/orders/{orderId}/status` - admin token required
