-- CSV 데이터 적재
-- 실행: psql -U postgres -d oliveyoung -f sql/load.sql
-- (psql 실행 디렉터리는 프로젝트 루트 기준)

\copy users (id, email, password_hash, name, created_at) FROM 'db_contents/users.csv' WITH (FORMAT csv, HEADER true);
\copy products (id, brand_name, category_name, name, price, stock_quantity, thumbnail_url, description) FROM 'db_contents/products.csv' WITH (FORMAT csv, HEADER true);
\copy carts (id, user_id) FROM 'db_contents/carts.csv' WITH (FORMAT csv, HEADER true);
\copy cart_items (id, cart_id, product_id, quantity) FROM 'db_contents/cart_items.csv' WITH (FORMAT csv, HEADER true);
\copy orders (id, user_id, total_amount, status, created_at) FROM 'db_contents/orders.csv' WITH (FORMAT csv, HEADER true);
\copy order_items (id, order_id, product_id, quantity, price_at_purchase) FROM 'db_contents/order_items.csv' WITH (FORMAT csv, HEADER true);

-- SERIAL 시퀀스를 최대 id 다음으로 맞춤 (신규 INSERT 충돌 방지)
SELECT setval(pg_get_serial_sequence('users', 'id'),        (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('products', 'id'),     (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('carts', 'id'),        (SELECT MAX(id) FROM carts));
SELECT setval(pg_get_serial_sequence('cart_items', 'id'),   (SELECT MAX(id) FROM cart_items));
SELECT setval(pg_get_serial_sequence('orders', 'id'),       (SELECT MAX(id) FROM orders));
SELECT setval(pg_get_serial_sequence('order_items', 'id'),  (SELECT MAX(id) FROM order_items));
