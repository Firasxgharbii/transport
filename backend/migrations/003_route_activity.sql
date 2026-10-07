CREATE TABLE IF NOT EXISTS dispatch_route_activity (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 route_id INT NOT NULL,
 user_id INT NOT NULL,
 action VARCHAR(80) NOT NULL,
 details JSON NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_route_activity_route (route_id,id),
 CONSTRAINT fk_route_activity_route FOREIGN KEY (route_id) REFERENCES dispatch_routes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
