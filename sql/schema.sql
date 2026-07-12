-- 올리브영 클론 스키마
-- 실행: psql -U postgres -d oliveyoung -f sql/schema.sql

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id             SERIAL PRIMARY KEY,
    brand_name     VARCHAR(100) NOT NULL,
    category_name  VARCHAR(100) NOT NULL,
    name           VARCHAR(255) NOT NULL,
    price          INTEGER NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    thumbnail_url  TEXT,
    description    TEXT
);

CREATE TABLE carts (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id         SERIAL PRIMARY KEY,
    cart_id    INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL DEFAULT 1,
    UNIQUE (cart_id, product_id)
);

CREATE TABLE orders (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount INTEGER NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT '주문완료',
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id                SERIAL PRIMARY KEY,
    order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity          INTEGER NOT NULL,
    price_at_purchase INTEGER NOT NULL
);

CREATE INDEX idx_products_category ON products(category_name);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
