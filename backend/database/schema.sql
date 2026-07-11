SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS delivery_proofs;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT,
  user_id INT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(150),
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone VARCHAR(30),
  profile_photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  client_id INT NOT NULL,
  driver_id INT,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_date DATE,
  pickup_time TIME,
  delivery_date DATE,
  delivery_time TIME,
  pallets_count INT DEFAULT 0,
  description TEXT,
  notes TEXT,
  status ENUM(
    'pending',
    'assigned',
    'pickup_in_progress',
    'picked_up',
    'delivery_in_progress',
    'arrived',
    'completed',
    'cancelled',
    'incident'
  ) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

CREATE TABLE order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(100) NOT NULL,
  comment TEXT,
  changed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE delivery_proofs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  driver_id INT NOT NULL,
  receiver_first_name VARCHAR(100) NOT NULL,
  receiver_last_name VARCHAR(100) NOT NULL,
  signature_url TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  notes TEXT,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  order_id INT,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('admin', 'driver', 'client', 'system') DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  client_id INT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CAD',
  payment_method ENUM('stripe', 'paypal', 'interac', 'cash', 'other') DEFAULT 'stripe',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  order_id INT,
  client_id INT,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'cancelled') DEFAULT 'draft',
  invoice_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

INSERT INTO roles (name, description) VALUES
('super_admin', 'Accès complet à toute la plateforme'),
('dispatcher', 'Gestion des commandes et assignation des chauffeurs'),
('driver', 'Chauffeur / livreur'),
('client', 'Client');

INSERT INTO companies (name, phone, email, city, province) VALUES
('Transport Platform Demo', '5140000000', 'admin@transport.com', 'Montréal', 'Québec');

/* ============================================================
   VEHICLES
============================================================ */

CREATE TABLE vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,

    plate_number VARCHAR(30) NOT NULL UNIQUE,

    brand VARCHAR(100),

    model VARCHAR(100),

    year INT,

    max_weight DECIMAL(10,2),

    max_pallets INT,

    status ENUM(
        'available',
        'maintenance',
        'out_of_service'
    ) DEFAULT 'available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* ============================================================
   DRIVER -> VEHICLE
============================================================ */

ALTER TABLE drivers
ADD COLUMN vehicle_id INT NULL;

ALTER TABLE drivers
ADD CONSTRAINT fk_driver_vehicle
FOREIGN KEY(vehicle_id)
REFERENCES vehicles(id)
ON DELETE SET NULL;

/* ============================================================
   GPS POUR LES COMMANDES
============================================================ */

ALTER TABLE orders
ADD COLUMN pickup_latitude DECIMAL(10,7);

ALTER TABLE orders
ADD COLUMN pickup_longitude DECIMAL(10,7);

ALTER TABLE orders
ADD COLUMN delivery_latitude DECIMAL(10,7);

ALTER TABLE orders
ADD COLUMN delivery_longitude DECIMAL(10,7);

/* ============================================================
   PRIX
============================================================ */

ALTER TABLE orders
ADD COLUMN distance_km DECIMAL(10,2);

ALTER TABLE orders
ADD COLUMN estimated_duration INT;

ALTER TABLE orders
ADD COLUMN total_price DECIMAL(10,2);

/* ============================================================
   GPS TEMPS RÉEL
============================================================ */

CREATE TABLE driver_locations (

    id INT AUTO_INCREMENT PRIMARY KEY,

    driver_id INT NOT NULL,

    latitude DECIMAL(10,7) NOT NULL,

    longitude DECIMAL(10,7) NOT NULL,

    speed DECIMAL(10,2),

    heading DECIMAL(10,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(driver_id)
    REFERENCES drivers(id)
    ON DELETE CASCADE
);

/* ============================================================
   PIÈCES JOINTES
============================================================ */

CREATE TABLE order_files (

    id INT AUTO_INCREMENT PRIMARY KEY,

    order_id INT NOT NULL,

    file_url TEXT NOT NULL,

    file_type ENUM(
        'photo',
        'document',
        'invoice',
        'signature'
    ),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(order_id)
    REFERENCES orders(id)
    ON DELETE CASCADE
);