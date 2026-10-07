CREATE TABLE IF NOT EXISTS dispatch_route_daily_archives (
  id BIGINT NOT NULL AUTO_INCREMENT,
  route_id INT NOT NULL,
  route_code VARCHAR(80) NULL,
  business_date DATE NOT NULL,
  snapshot JSON NOT NULL,
  archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id),
  UNIQUE KEY uq_route_daily_archive(route_id,business_date),
  KEY idx_archive_business_date(business_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
