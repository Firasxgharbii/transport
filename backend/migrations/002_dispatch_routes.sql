-- Glory Solutions
-- Migration 002 : ROUTES -> STOPS -> COMMANDES -> COLIS
--
-- IMPORTANT :
-- Préparation uniquement.
-- Ne pas exécuter avant sauvegarde et validation.

CREATE TABLE dispatch_routes (
    id INT NOT NULL AUTO_INCREMENT,

    route_code VARCHAR(50) DEFAULT NULL,

    driver_id INT DEFAULT NULL,
    vehicle_id INT DEFAULT NULL,

    scheduled_date DATE DEFAULT NULL,

    status ENUM(
        'draft',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'draft',

    notes TEXT DEFAULT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_dispatch_routes_code (route_code),

    KEY idx_dispatch_routes_driver (driver_id),

    KEY idx_dispatch_routes_vehicle (vehicle_id),

    KEY idx_dispatch_routes_date (scheduled_date),

    KEY idx_dispatch_routes_status (status)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE dispatch_tasks

ADD COLUMN route_id INT DEFAULT NULL,

ADD COLUMN stop_position INT DEFAULT NULL,

ADD INDEX idx_dispatch_tasks_route (route_id),

ADD INDEX idx_dispatch_tasks_route_position (
    route_id,
    stop_position
),

ADD CONSTRAINT fk_dispatch_tasks_route

FOREIGN KEY (route_id)

REFERENCES dispatch_routes(id)

ON DELETE RESTRICT;
