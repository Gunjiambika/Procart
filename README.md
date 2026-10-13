# ProCart Full Stack

ProCart is a polished full-stack commerce demo with a React storefront and a Java Spring Boot API. The frontend includes catalog browsing, search, wishlist, cart, checkout, customer profile, order history, and an admin console. The backend provides auth sessions, products, cart persistence, orders, users, stock updates, and database profiles for H2 or MySQL.

## Run Locally

MySQL is the default database. Set your connection credentials, then open two terminals from this folder:

```powershell
$env:MYSQL_URL="jdbc:mysql://localhost:3306/procart?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="your_mysql_password"
npm run start:backend
```

```powershell
npm run start:frontend
```

The frontend runs at `http://localhost:3000` and the Java API runs at `http://localhost:8080`.

Create `.env` from `.env.example` only if you need to change the development API URL:

```powershell
Copy-Item .env.example .env
```

Production builds use same-origin `/api` requests by default, so the frontend can be deployed
behind the same domain or reverse proxy as the backend. Set `REACT_APP_API_BASE_URL` at build time
only when the API is hosted on a different origin.

## Demo Accounts

- Customer: `demo@procart.com` / `procart123`
- Admin: `admin@procart.com` / `admin123`

## Verify

```powershell
npm run build
npm run test:backend
```

For the full React test suite:

```powershell
npm run test:fullstack
```

## Backend Data

By default, the backend stores users, carts, products and orders in the MySQL `procart`
database. Tables are created and updated automatically with
`spring.jpa.hibernate.ddl-auto=update`.

Create the database manually if your MySQL account cannot create databases:

```sql
CREATE DATABASE procart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Optional H2 Profile

For a local file database without MySQL, start the H2 profile:

```powershell
npm run start:backend:h2
```

H2 stores data at `backend/data/procart.mv.db`. Open the console at
`http://localhost:8080/h2-console` with:

- JDBC URL: `jdbc:h2:file:./data/procart`
- User: `sa`
- Password: leave empty

## MySQL With a Dedicated User

Create a MySQL database and user:

```sql
CREATE DATABASE procart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'procart_user'@'localhost' IDENTIFIED BY 'procart_password';
GRANT ALL PRIVILEGES ON procart.* TO 'procart_user'@'localhost';
FLUSH PRIVILEGES;
```

Start the backend with either the default command or the explicit MySQL profile:

```powershell
$env:MYSQL_URL="jdbc:mysql://localhost:3306/procart?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:MYSQL_USER="procart_user"
$env:MYSQL_PASSWORD="procart_password"
npm run start:backend:mysql
```

Then start the frontend in another terminal:

```powershell
npm run start:frontend
```

`npm run start:backend` uses the same MySQL configuration by default.

## API Highlights

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/products`
- `GET /api/cart`
- `POST /api/orders`
- `GET /api/admin/products`
- `PATCH /api/admin/orders/{orderId}/status`
  <img width="2879" height="1799" alt="Screenshot 2026-10-13 104615" src="https://github.com/user-attachments/assets/bd9b647b-8965-4d63-aa72-ff5cdbce57ce" />
  <img width="2879" height="1799" alt="Screenshot 2026-10-13 104704" src="https://github.com/user-attachments/assets/97d5913d-2bf7-40e3-a55d-d8d56968d351" />

  <img width="2879" height="1722" alt="Screenshot 2026-10-13 104757" src="https://github.com/user-attachments/assets/8018573f-11e2-4766-a11f-577230bc4701" />

