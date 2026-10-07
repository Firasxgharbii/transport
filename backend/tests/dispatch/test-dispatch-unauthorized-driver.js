require("dotenv").config();

const assert = require("node:assert/strict");
const db = require("./config/db");
const DriverModel = require("./models/driverModel");

const TEST_DB = "glory_dispatch_test_20260920";
const TASK_ID = 1;
const AUTHORIZED_DRIVER_ID = 8;
const UNAUTHORIZED_DRIVER_ID = 12;
const NOTE = "TEST_UNAUTHORIZED_DRIVER_20260920";

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
    )
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

  const [[unauthorizedDriver]] = await db.query(
    "SELECT user_id FROM drivers WHERE id = ?",
    [UNAUTHORIZED_DRIVER_ID]
  );

  assert.ok(unauthorizedDriver?.user_id);
  assert.equal(Number(unauthorizedDriver.user_id), 30);

  const [[existing]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM scan_events
     WHERE package_id = ?`,
    [parcel.id]
  );

  assert.equal(
    Number(existing.total),
    0,
    "Le colis possède déjà des scans."
  );

  let started = false;

  try {
    started = true;

    await db.query(
      `UPDATE dispatch_tasks
       SET driver_id = ?, status = 'assigned'
       WHERE id = ?`,
      [AUTHORIZED_DRIVER_ID, TASK_ID]
    );

    await db.query(
      `UPDATE order_operations
       SET driver_id = ?, status = 'assigned'
       WHERE dispatch_task_id = ?`,
      [AUTHORIZED_DRIVER_ID, TASK_ID]
    );

    console.log("BASE :", database.name);
    console.log("MISSION :", TASK_ID);
    console.log("CHAUFFEUR AUTORISÉ :", AUTHORIZED_DRIVER_ID);
    console.log("CHAUFFEUR NON AUTORISÉ :", UNAUTHORIZED_DRIVER_ID);
    console.log("COLIS :", parcel.barcode);

    const result = await DriverModel.processDriverScan(
      UNAUTHORIZED_DRIVER_ID,
      unauthorizedDriver.user_id,
      {
        scanned_code: parcel.barcode,
        scan_type: "pickup",
        scan_source: "manual",
        notes: NOTE
      }
    );

    assert.equal(result.success, false);
    assert.equal(result.rejected, true);
    assert.equal(result.scan_status, "rejected");
    assert.equal(result.statusCode, 403);

    console.log("✅ Scan du chauffeur 12 refusé.");

    const [[audit]] = await db.query(
      `SELECT
         SUM(scan_status = 'accepted') AS accepted,
         SUM(scan_status = 'rejected') AS rejected
       FROM scan_events
       WHERE package_id = ?
         AND scan_type = 'pickup'`,
      [parcel.id]
    );

    assert.equal(Number(audit.accepted || 0), 0);
    assert.equal(Number(audit.rejected || 0), 1);

    console.log("✅ Refus enregistré dans l'audit.");

    const [[physical]] = await db.query(
      `SELECT current_status
       FROM order_packages
       WHERE id = ?`,
      [parcel.id]
    );

    assert.equal(physical.current_status, "created");

    console.log("✅ Colis inchangé.");

    const [[currentTask]] = await db.query(
      `SELECT status, driver_id
       FROM dispatch_tasks
       WHERE id = ?`,
      [TASK_ID]
    );

    assert.equal(currentTask.status, "assigned");
    assert.equal(
      Number(currentTask.driver_id),
      AUTHORIZED_DRIVER_ID
    );

    const [currentOperations] = await db.query(
      `SELECT status, driver_id
       FROM order_operations
       WHERE dispatch_task_id = ?`,
      [TASK_ID]
    );

    assert.ok(
      currentOperations.every(op =>
        op.status === "assigned" &&
        Number(op.driver_id) === AUTHORIZED_DRIVER_ID
      )
    );

    console.log("✅ Mission et opérations inchangées.");
    console.log("🎉 TEST DE SÉCURITÉ RÉUSSI.");

  } finally {
    if (started) {
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `DELETE FROM scan_events
           WHERE package_id = ?
             AND notes = ?
             AND driver_id = ?`,
          [
            parcel.id,
            NOTE,
            UNAUTHORIZED_DRIVER_ID
          ]
        );

        for (const p of packages) {
          await connection.query(
            `UPDATE order_packages
             SET current_status = ?
             WHERE id = ?`,
            [p.current_status, p.id]
          );
        }

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
          [
            task.driver_id,
            task.status,
            TASK_ID
          ]
        );

        await connection.commit();

        console.log("✅ Données de test restaurées.");

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
