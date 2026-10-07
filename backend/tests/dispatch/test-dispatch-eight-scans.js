require("dotenv").config();

const assert = require("node:assert/strict");
const db = require("./config/db");
const DriverModel = require("./models/driverModel");

const TEST_DB = "glory_dispatch_test_20260920";
const TASK_ID = 1;
const DRIVER_ID = 8;
const TEST_NOTE = "TEST_DISPATCH_EIGHT_SCANS_20260920";

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

  assert.ok(task, "Mission de test introuvable.");
  assert.equal(task.task_type, "pickup");
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
  assert.deepEqual(
    operations.map(op => Number(op.order_id)),
    [46, 47]
  );

  assert.ok(
    operations.every(op =>
      op.operation_type === "pickup" &&
      op.status === "pending" &&
      op.driver_id === null
    ),
    "Les opérations ne sont pas dans leur état initial."
  );

  const [packages] = await db.query(
    `SELECT p.*, op.id AS test_operation_id
     FROM order_packages p
     INNER JOIN order_operations op
       ON op.order_id = p.order_id
     WHERE op.dispatch_task_id = ?
     ORDER BY op.id, p.id`,
    [TASK_ID]
  );

  assert.equal(packages.length, 8);

  assert.deepEqual(
    packages.map(p => Number(p.order_id)),
    [46, 46, 46, 47, 47, 47, 47, 47]
  );

  assert.ok(
    packages.every(p =>
      p.current_status === "created" &&
      p.barcode.startsWith("GLY-TEST-GROUP-")
    ),
    "Les colis ne sont pas dans leur état initial."
  );

  const [[driver]] = await db.query(
    "SELECT user_id FROM drivers WHERE id = ?",
    [DRIVER_ID]
  );

  assert.ok(
    driver?.user_id,
    "Compte utilisateur du chauffeur introuvable."
  );

  const packageIds = packages.map(p => p.id);
  const placeholders = packageIds.map(() => "?").join(",");

  const [[existing]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM scan_events
     WHERE package_id IN (${placeholders})`,
    packageIds
  );

  assert.equal(
    Number(existing.total),
    0,
    "Des scans existent déjà sur les colis de test."
  );

  let testStarted = false;
  let passed = false;

  async function verify(expectedScans, expectedTaskStatus,
                        expectedFirst, expectedSecond) {
    const [[currentTask]] = await db.query(
      "SELECT status FROM dispatch_tasks WHERE id = ?",
      [TASK_ID]
    );

    const [currentOperations] = await db.query(
      `SELECT order_id, status
       FROM order_operations
       WHERE dispatch_task_id = ?
       ORDER BY id`,
      [TASK_ID]
    );

    const [[progress]] = await db.query(
      `SELECT COUNT(DISTINCT se.package_id) AS scanned
       FROM scan_events se
       WHERE se.package_id IN (${placeholders})
         AND se.scan_status = 'accepted'
         AND se.scan_type = 'pickup'`,
      packageIds
    );

    assert.equal(
      Number(progress.scanned),
      expectedScans,
      "Progression incorrecte."
    );

    assert.equal(
      currentTask.status,
      expectedTaskStatus,
      "Statut de la mission incorrect."
    );

    assert.equal(
      currentOperations[0].status,
      expectedFirst,
      "Statut de la commande 46 incorrect."
    );

    assert.equal(
      currentOperations[1].status,
      expectedSecond,
      "Statut de la commande 47 incorrect."
    );

    console.log(
      `✅ ${expectedScans}/8 colis | ` +
      `mission=${currentTask.status} | ` +
      `commande46=${currentOperations[0].status} | ` +
      `commande47=${currentOperations[1].status}`
    );
  }

  try {
    testStarted = true;

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

    console.log("BASE :", database.name);
    console.log("MISSION :", TASK_ID);
    console.log("CHAUFFEUR :", DRIVER_ID);
    console.log("DÉBUT DES 8 SCANS");

    for (let index = 0; index < packages.length; index++) {
      const parcel = packages[index];

      const result = await DriverModel.processDriverScan(
        DRIVER_ID,
        driver.user_id,
        {
          scanned_code: parcel.barcode,
          scan_type: "pickup",
          scan_source: "manual",
          notes: TEST_NOTE
        }
      );

      assert.equal(
        result.success,
        true,
        `Scan ${index + 1} refusé.`
      );

      assert.equal(result.duplicate, false);
      assert.equal(result.scan_status, "accepted");
      assert.equal(result.package.id, parcel.id);

      const [[physical]] = await db.query(
        `SELECT current_status
         FROM order_packages
         WHERE id = ?`,
        [parcel.id]
      );

      assert.equal(
        physical.current_status,
        "picked_up",
        `État physique incorrect pour ${parcel.barcode}`
      );

      if (index === 0) {
        await verify(
          1,
          "in_progress",
          "assigned",
          "assigned"
        );
      }

      if (index === 2) {
        await verify(
          3,
          "in_progress",
          "completed",
          "assigned"
        );
      }

      if (index === 3) {
        await verify(
          4,
          "in_progress",
          "completed",
          "assigned"
        );
      }

      if (index === 7) {
        await verify(
          8,
          "completed",
          "completed",
          "completed"
        );
      }
    }

    passed = true;
    console.log(
      "🎉 TEST RÉUSSI : 1 mission, 2 commandes, 8 scans."
    );

  } finally {
    if (testStarted) {
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        await connection.query(
          `DELETE FROM scan_events
           WHERE package_id IN (${placeholders})
             AND notes = ?`,
          [...packageIds, TEST_NOTE]
        );

        for (const parcel of packages) {
          await connection.query(
            `UPDATE order_packages
             SET current_status = ?
             WHERE id = ?`,
            [parcel.current_status, parcel.id]
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
          [task.driver_id, task.status, TASK_ID]
        );

        await connection.commit();

        console.log(
          "✅ Mission, opérations et colis restaurés."
        );
      } catch (cleanupError) {
        await connection.rollback();

        console.error(
          "⚠️ NETTOYAGE À VÉRIFIER :",
          cleanupError.message
        );

        throw cleanupError;
      } finally {
        connection.release();
      }
    }
  }

  assert.equal(passed, true);
}

main()
  .catch(error => {
    console.error("❌ TEST ÉCHOUÉ :", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
