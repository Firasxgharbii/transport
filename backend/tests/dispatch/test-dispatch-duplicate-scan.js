require("dotenv").config();

const assert = require("node:assert/strict");
const db = require("./config/db");
const DriverModel = require("./models/driverModel");

const TEST_DB = "glory_dispatch_test_20260920";
const TASK_ID = 1;
const DRIVER_ID = 8;
const NOTE = "TEST_DISPATCH_DUPLICATE_20260920";

async function main() {
  const [[database]] = await db.query(
    "SELECT DATABASE() AS name"
  );

  assert.equal(
    database.name,
    TEST_DB,
    "ARRÊT : mauvaise base de données."
  );

  const [[task]] = await db.query(
    "SELECT * FROM dispatch_tasks WHERE id = ?",
    [TASK_ID]
  );

  assert.ok(task);
  assert.equal(task.status, "pending");
  assert.equal(task.driver_id, null);

  const [operations] = await db.query(
    `SELECT *
     FROM order_operations
     WHERE dispatch_task_id = ?
     ORDER BY id`,
    [TASK_ID]
  );

  assert.equal(operations.length, 2);

  assert.ok(
    operations.every(op =>
      op.status === "pending" &&
      op.driver_id === null
    ),
    "Les opérations ne sont pas dans leur état initial."
  );

  const [packages] = await db.query(
    `SELECT p.*
     FROM order_packages p
     INNER JOIN order_operations op
       ON op.order_id = p.order_id
     WHERE op.dispatch_task_id = ?
     ORDER BY op.id, p.id`,
    [TASK_ID]
  );

  assert.equal(packages.length, 8);

  const parcel = packages[0];

  assert.equal(parcel.current_status, "created");
  assert.ok(parcel.barcode.startsWith("GLY-TEST-GROUP-"));

  const [[existing]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM scan_events
     WHERE package_id = ?`,
    [parcel.id]
  );

  assert.equal(
    Number(existing.total),
    0,
    "Ce colis possède déjà des scans."
  );

  const [[driver]] = await db.query(
    "SELECT user_id FROM drivers WHERE id = ?",
    [DRIVER_ID]
  );

  assert.ok(driver?.user_id);

  let started = false;

  try {
    started = true;

    await db.query(
      `UPDATE dispatch_tasks
       SET driver_id = ?, status = 'assigned'
       WHERE id = ?`,
      [DRIVER_ID, TASK_ID]
    );

    await db.query(
      `UPDATE order_operations
       SET driver_id = ?, status = 'assigned'
       WHERE dispatch_task_id = ?`,
      [DRIVER_ID, TASK_ID]
    );

    const payload = {
      scanned_code: parcel.barcode,
      scan_type: "pickup",
      scan_source: "manual",
      notes: NOTE
    };

    console.log("BASE :", database.name);
    console.log("COLIS :", parcel.barcode);

    const first = await DriverModel.processDriverScan(
      DRIVER_ID,
      driver.user_id,
      payload
    );

    assert.equal(first.success, true);
    assert.equal(first.duplicate, false);
    assert.equal(first.scan_status, "accepted");

    console.log("✅ Premier scan accepté.");

    const second = await DriverModel.processDriverScan(
      DRIVER_ID,
      driver.user_id,
      payload
    );

    assert.equal(second.success, true);
    assert.equal(second.duplicate, true);
    assert.equal(second.scan_status, "duplicate");

    console.log("✅ Deuxième scan détecté comme doublon.");

    const [[counts]] = await db.query(
      `SELECT
         SUM(scan_status = 'accepted') AS accepted,
         SUM(scan_status = 'duplicate') AS duplicates
       FROM scan_events
       WHERE package_id = ?
         AND scan_type = 'pickup'`,
      [parcel.id]
    );

    assert.equal(Number(counts.accepted), 1);
    assert.equal(Number(counts.duplicates), 1);

    const [[currentTask]] = await db.query(
      "SELECT status FROM dispatch_tasks WHERE id = ?",
      [TASK_ID]
    );

    assert.equal(currentTask.status, "in_progress");

    const [[physical]] = await db.query(
      `SELECT current_status
       FROM order_packages
       WHERE id = ?`,
      [parcel.id]
    );

    assert.equal(physical.current_status, "picked_up");

    console.log("✅ 1 scan accepté + 1 doublon.");
    console.log("✅ Mission toujours en cours.");
    console.log("🎉 TEST DU DOUBLE SCAN RÉUSSI.");

  } finally {
    if (started) {
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `DELETE FROM scan_events
           WHERE package_id = ?
             AND notes = ?`,
          [parcel.id, NOTE]
        );

        await connection.query(
          `UPDATE order_packages
           SET current_status = ?
           WHERE id = ?`,
          [parcel.current_status, parcel.id]
        );

        for (const op of operations) {
          await connection.query(
            `UPDATE order_operations
             SET driver_id = ?,
                 status = ?,
                 completed_at = ?
             WHERE id = ?`,
            [
              op.driver_id,
              op.status,
              op.completed_at,
              op.id
            ]
          );
        }

        await connection.query(
          `UPDATE dispatch_tasks
           SET driver_id = ?, status = ?
           WHERE id = ?`,
          [task.driver_id, task.status, TASK_ID]
        );

        await connection.commit();

        console.log(
          "✅ Données de test restaurées."
        );

      } catch (error) {
        await connection.rollback();

        console.error(
          "⚠️ Nettoyage à vérifier :",
          error.message
        );

        throw error;

      } finally {
        connection.release();
      }
    }
  }
}

main()
  .catch(error => {
    console.error("❌ TEST ÉCHOUÉ :", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
