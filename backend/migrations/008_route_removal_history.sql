CREATE TABLE IF NOT EXISTS dispatch_route_removal_history (
 id BIGINT NOT NULL AUTO_INCREMENT, route_id INT NOT NULL, stop_id INT NULL, operation_id INT NOT NULL,
 order_id INT NOT NULL, operation_type VARCHAR(30) NOT NULL, actor_user_id INT NOT NULL,
 previous_operation_status VARCHAR(40) NULL, restored_operation_status VARCHAR(40) NULL,
 previous_driver_id INT NULL, previous_vehicle_id INT NULL, previous_scheduled_date DATE NULL,
 reason VARCHAR(120) NOT NULL DEFAULT 'manual_detach', details JSON NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id),
 KEY idx_route_removal_route (route_id,created_at), KEY idx_route_removal_order (order_id,created_at),
 KEY idx_route_removal_operation (operation_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
