-- ============================================================
-- Aaron Rockwell Breads — MySQL Schema
-- Run this in Hostinger hPanel → Databases → phpMyAdmin
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── PRODUCTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          VARCHAR(36) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       INT NOT NULL,  -- cents (800 = $8.00)
  image_url   VARCHAR(500),
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO products (id, name, description, price) VALUES
  ('prod-sourdough', 'Sourdough Loaf', 'Classic homemade sourdough. Crusty outside, chewy inside, made with care.', 800),
  ('prod-brioche-4', 'Brioche Buns — 4 Pack', 'Soft, buttery brioche buns. Perfect for burgers or just eating.', 600),
  ('prod-brioche-8', 'Brioche Buns — 8 Pack', 'Same great brioche buns, bigger pack for bigger gatherings.', 1000);

-- ── BATCHES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batches (
  id             VARCHAR(36) PRIMARY KEY,
  pickup_date    DATE NOT NULL,
  pickup_window  VARCHAR(255) NOT NULL,
  status         ENUM('draft','open','closed','completed') NOT NULL DEFAULT 'draft',
  notes          TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── BATCH INVENTORY ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_inventory (
  id           VARCHAR(36) PRIMARY KEY,
  batch_id     VARCHAR(36) NOT NULL,
  product_id   VARCHAR(36) NOT NULL,
  total_qty    INT NOT NULL DEFAULT 0,
  sold_qty     INT NOT NULL DEFAULT 0,
  reserved_qty INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_batch_product (batch_id, product_id),
  FOREIGN KEY (batch_id)   REFERENCES batches(id)  ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── CART RESERVATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_reservations (
  id                  VARCHAR(36) PRIMARY KEY,
  user_email          VARCHAR(255) NOT NULL,
  batch_inventory_id  VARCHAR(36) NOT NULL,
  qty                 INT NOT NULL,
  expires_at          DATETIME NOT NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_item (user_email, batch_inventory_id),
  FOREIGN KEY (batch_inventory_id) REFERENCES batch_inventory(id) ON DELETE CASCADE
);

-- ── ORDERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                VARCHAR(36) PRIMARY KEY,
  user_email        VARCHAR(255) NOT NULL,
  user_name         VARCHAR(255) NOT NULL,
  batch_id          VARCHAR(36) NOT NULL,
  status            ENUM('order_received','being_mixed','proofing','shaping','baking','ready_for_pickup','completed','cancelled') NOT NULL DEFAULT 'order_received',
  pickup_location   ENUM('edison_901','edison_919') NOT NULL,
  square_payment_id VARCHAR(255),
  square_order_id   VARCHAR(255),
  total             INT NOT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- ── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id         VARCHAR(36) PRIMARY KEY,
  order_id   VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  qty        INT NOT NULL,
  unit_price INT NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ── WAITLIST ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         VARCHAR(36) PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  product_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_product (email, product_id)
);

SET FOREIGN_KEY_CHECKS = 1;
