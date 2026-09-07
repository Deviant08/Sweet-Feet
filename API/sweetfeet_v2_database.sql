-- ============================================================
--  Sweet Feet v2 — Database Setup Script
--  Run this in phpMyAdmin SQL tab to create everything.
-- ============================================================

DROP DATABASE IF EXISTS sweetfeet;
CREATE DATABASE sweetfeet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sweetfeet;

-- 1. RETAILERS
CREATE TABLE retailers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  location      VARCHAR(255),
  logo          VARCHAR(500) DEFAULT NULL,
  bio           TEXT         DEFAULT NULL,
  status        ENUM('pending','approved','suspended') DEFAULT 'pending',
  commission    DECIMAL(5,2) DEFAULT 5.00,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS (customers)
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  full_name  VARCHAR(255) DEFAULT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  phone      VARCHAR(20)  DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTS
CREATE TABLE products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  retailer_id  INT NOT NULL,
  name         VARCHAR(255) NOT NULL,
  category     VARCHAR(100),
  gender       VARCHAR(50),
  price        DECIMAL(10,2),
  old_price    DECIMAL(10,2) DEFAULT NULL,
  rating       DECIMAL(3,1)  DEFAULT 0.0,
  rating_count INT           DEFAULT 0,
  color        VARCHAR(50),
  badge        VARCHAR(50)   DEFAULT NULL,
  badge_label  VARCHAR(100)  DEFAULT NULL,
  img          VARCHAR(500),
  sizes        VARCHAR(255),
  is_active    TINYINT(1)    DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE
);

-- 4. MESSAGES (chat)
CREATE TABLE messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  retailer_id INT NOT NULL,
  product_id  INT DEFAULT NULL,
  order_id    INT DEFAULT NULL,
  sender_type ENUM('customer','retailer') NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)  ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)   ON DELETE SET NULL
);

-- 5. ORDERS
CREATE TABLE orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          DEFAULT NULL,
  total        DECIMAL(10,2),
  paystack_ref VARCHAR(255) DEFAULT NULL,
  status       ENUM('pending','paid','failed') DEFAULT 'pending',
  ordered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. ORDER ITEMS
CREATE TABLE order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  retailer_id  INT NOT NULL,
  product_id   INT DEFAULT NULL,
  product_name VARCHAR(255),
  size         VARCHAR(20)   DEFAULT NULL,
  quantity     INT           DEFAULT 1,
  unit_price   DECIMAL(10,2),
  subtotal     DECIMAL(10,2),
  status       ENUM('placed','confirmed','packed','dispatched','delivered','cancelled') DEFAULT 'placed',
  FOREIGN KEY (order_id)    REFERENCES orders(id)    ON DELETE CASCADE,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)  ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)   ON DELETE SET NULL
);

-- 7. ORDER TRACKING
CREATE TABLE order_tracking (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT NOT NULL,
  status        ENUM('placed','confirmed','packed','dispatched','delivered','cancelled') NOT NULL,
  note          VARCHAR(500) DEFAULT NULL,
  updated_by    INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by)    REFERENCES retailers(id)    ON DELETE CASCADE
);

-- 8. FEEDBACK
CREATE TABLE feedback (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          DEFAULT NULL,
  retailer_id  INT          DEFAULT NULL,
  name         VARCHAR(255),
  email        VARCHAR(255),
  category     VARCHAR(100),
  rating       INT,
  message      TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)  ON DELETE SET NULL
);

-- ── SEED: 3 demo retailers (password = "password123") ────────
INSERT INTO retailers (business_name,email,password,phone,location,bio,status) VALUES
('Lagos Kicks','lagoskicks@sweetfeet.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','08012345678','Ikeja, Lagos','Premium trainers and casual sneakers from the heart of Lagos.','approved'),
('Abuja Sole House','abujasolehouse@sweetfeet.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','08098765432','Wuse, Abuja','Corporate and formal footwear specialists.','approved'),
('Port City Footwear','portcityfootwear@sweetfeet.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','08055544433','GRA, Port Harcourt','Ladies footwear and sandals.','approved');

-- ── SEED: Products ────────────────────────────────────────────
INSERT INTO products (retailer_id,name,category,gender,price,old_price,rating,rating_count,color,badge,badge_label,img,sizes) VALUES
(1,'Pro Grip Trainers','trainers','unisex',10.00,NULL,4.3,128,'white','top','Top Pick','https://i.pinimg.com/1200x/a2/44/58/a2445825e5f5617fd76606d0151897fc.jpg','40,41,42,43,44'),
(1,'Urban Casual Sneakers','casual','men',13.00,18.00,4.6,214,'white','sale','Sale','https://i.pinimg.com/1200x/95/d5/e1/95d5e18c05b0269621143c82adc57342.jpg','39,40,41,42,43'),
(1,'Canvas Low-Top','casual','unisex',11.00,NULL,4.1,245,'white',NULL,NULL,'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&auto=format','39,40,41,42,43'),
(1,'Swift Runners','runners','unisex',9.00,14.00,4.2,176,'multi','sale','Sale','https://media.istockphoto.com/id/1249496770/photo/running-shoes.jpg?s=612x612','39,40,41,42,43,44'),
(1,'Foam Runner','runners','unisex',12.00,NULL,4.3,190,'multi',NULL,NULL,'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format','39,40,41,42,43,44'),
(2,'Classic Oxford','corporate','men',20.00,NULL,4.8,87,'brown',NULL,NULL,'https://png.pngtree.com/png-vector/20240910/ourmid/pngtree-mens-classic-brown-leather-dress-shoes-with-white-background-png-image_13804868.png','40,41,42,43,44,45'),
(2,'EverDay Loafers','loafers','unisex',15.40,NULL,4.7,302,'black','top','Best Seller','https://www.shutterstock.com/image-photo/glossy-black-leather-loafers-casual-600nw-2508631511.jpg','38,39,40,41,42,43'),
(2,'Derby Brogue','corporate','men',22.00,NULL,4.6,43,'brown','new','New','https://images.unsplash.com/photo-1582897085656-c636d006a246?w=600&auto=format','40,41,42,43,44'),
(2,'Chelsea Boot - Tan','boots','men',26.00,NULL,4.8,31,'brown','new','New','https://images.unsplash.com/photo-1591086793610-5fa21aa7e4a5?w=600&auto=format','40,41,42,43,44,45'),
(3,'Slide Comfort Sandals','sandals','women',7.50,NULL,4.4,94,'brown','new','New','https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&auto=format','36,37,38,39,40'),
(3,'Ankle Boot - Midnight','boots','women',24.00,30.00,4.9,59,'black','sale','Sale','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format','36,37,38,39,40,41'),
(3,'Espadrille Mule','sandals','women',8.00,12.00,4.0,77,'brown','sale','Sale','https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format','36,37,38,39,40');
