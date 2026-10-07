"use strict";
const db=require("../config/db");
async function col(t,c){const [r]=await db.query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1",[t,c]);return !!r.length}
async function run(){
 try{
  if(!(await col('driver_package_exceptions','proof_url'))) await db.query("ALTER TABLE driver_package_exceptions ADD COLUMN proof_url VARCHAR(1000) NULL AFTER accuracy");
  if(!(await col('driver_package_exceptions','proof_public_id'))) await db.query("ALTER TABLE driver_package_exceptions ADD COLUMN proof_public_id VARCHAR(500) NULL AFTER proof_url");
  await db.query(`CREATE TABLE IF NOT EXISTS operation_package_exclusions(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, operation_id INT NOT NULL, package_id INT NOT NULL,
    route_id INT NULL, dispatch_task_id INT NULL, actor_user_id INT NOT NULL, reason VARCHAR(500) NOT NULL,
    previous_package_status VARCHAR(80) NULL, active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, restored_at TIMESTAMP NULL,
    restored_by_user_id INT NULL, restore_reason VARCHAR(500) NULL,
    UNIQUE KEY uq_operation_package_active(operation_id,package_id), KEY idx_ope_route(route_id), KEY idx_ope_package(package_id)
  ) ENGINE=InnoDB`);
  await db.query(`CREATE TABLE IF NOT EXISTS package_status_audit(
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, package_id INT NOT NULL, order_id INT NOT NULL,
    operation_id INT NULL, dispatch_task_id INT NULL, route_id INT NULL, actor_type VARCHAR(30) NOT NULL,
    actor_id INT NULL, action VARCHAR(80) NOT NULL, from_status VARCHAR(80) NULL, to_status VARCHAR(80) NULL,
    reason VARCHAR(500) NULL, metadata JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_psa_package(package_id,created_at), KEY idx_psa_order(order_id,created_at), KEY idx_psa_route(route_id,created_at)
  ) ENGINE=InnoDB`);
  console.log('Migration 010 V4 FINAL OK');
 }catch(e){console.error('Migration 010 refusée:',e.message);process.exitCode=1}finally{await db.end()}
}
run();
