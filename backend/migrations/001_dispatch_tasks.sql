-- Glory Solutions
-- Migration 001 : tâches regroupées
-- Préparation uniquement : ne pas exécuter en production avant les tests.

CREATE TABLE dispatch_tasks (
    id INT NOT NULL AUTO_INCREMENT,
    task_type ENUM('pickup', 'delivery') NOT NULL,

    client_id INT DEFAULT NULL,
    driver_id INT DEFAULT NULL,
    vehicle_id INT DEFAULT NULL,

    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) DEFAULT NULL,
    province VARCHAR(100) DEFAULT NULL,
    postal_code VARCHAR(20) DEFAULT NULL,

    scheduled_date DATE DEFAULT NULL,
    scheduled_time TIME DEFAULT NULL,

    status ENUM(
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',

    notes TEXT DEFAULT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_dispatch_tasks_client (client_id),
    KEY idx_dispatch_tasks_driver (driver_id),
    KEY idx_dispatch_tasks_status (status),
    KEY idx_dispatch_tasks_schedule (scheduled_date, scheduled_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE order_operations
ADD COLUMN dispatch_task_id INT DEFAULT NULL,
ADD INDEX idx_order_operations_dispatch_task (dispatch_task_id),
ADD CONSTRAINT fk_order_operations_dispatch_task
    FOREIGN KEY (dispatch_task_id)
    REFERENCES dispatch_tasks(id)
    ON DELETE RESTRICT;
