-- Glory Solutions - Portail chauffeur / preuve de stop
-- Migration 004 - idempotente pour MySQL 8+

CREATE TABLE IF NOT EXISTS driver_stop_runs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  dispatch_task_id INT NOT NULL,
  driver_id INT NOT NULL,
  execution_status ENUM('todo','in_progress','completed','partial','failed') NOT NULL DEFAULT 'todo',
  started_at DATETIME NULL,
  closed_at DATETIME NULL,
  start_latitude DECIMAL(10,7) NULL,
  start_longitude DECIMAL(10,7) NULL,
  start_accuracy DECIMAL(10,2) NULL,
  close_latitude DECIMAL(10,7) NULL,
  close_longitude DECIMAL(10,7) NULL,
  close_accuracy DECIMAL(10,2) NULL,
  close_address VARCHAR(500) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_driver_stop_run (dispatch_task_id, driver_id),
  KEY idx_stop_run_driver_status (driver_id, execution_status),
  CONSTRAINT fk_stop_run_task FOREIGN KEY (dispatch_task_id) REFERENCES dispatch_tasks(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS driver_package_exceptions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  dispatch_task_id INT NOT NULL,
  operation_id INT NOT NULL,
  order_id INT NOT NULL,
  package_id INT NOT NULL,
  driver_id INT NOT NULL,
  reason ENUM('missing','not_loaded','damaged','wrong_label','client_absent','client_refused','access_impossible','address_invalid','other') NOT NULL,
  comment TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  accuracy DECIMAL(10,2) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stop_package_exception (dispatch_task_id, operation_id, package_id, driver_id),
  KEY idx_exception_task (dispatch_task_id, driver_id),
  CONSTRAINT fk_exception_task FOREIGN KEY (dispatch_task_id) REFERENCES dispatch_tasks(id) ON DELETE RESTRICT,
  CONSTRAINT fk_exception_operation FOREIGN KEY (operation_id) REFERENCES order_operations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_exception_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_exception_package FOREIGN KEY (package_id) REFERENCES order_packages(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS driver_delivery_proofs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  dispatch_task_id INT NOT NULL,
  operation_id INT NOT NULL,
  order_id INT NOT NULL,
  driver_id INT NOT NULL,
  proof_type ENUM('photo','signature') NOT NULL,
  recipient_first_name VARCHAR(120) NULL,
  recipient_last_name VARCHAR(120) NULL,
  proof_data MEDIUMTEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  accuracy DECIMAL(10,2) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_proof (dispatch_task_id, operation_id, driver_id),
  KEY idx_proof_task (dispatch_task_id, driver_id),
  CONSTRAINT fk_proof_task FOREIGN KEY (dispatch_task_id) REFERENCES dispatch_tasks(id) ON DELETE RESTRICT,
  CONSTRAINT fk_proof_operation FOREIGN KEY (operation_id) REFERENCES order_operations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_proof_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
