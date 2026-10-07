"use strict";

/**
 * Glory Solutions — Missions regroupées
 *
 * Ce module reçoit une connexion MySQL déjà ouverte.
 * Il ne choisit jamais lui-même la base de données.
 *
 * Première version :
 * - regroupement des ramassages uniquement ;
 * - même client ;
 * - même adresse exacte ;
 * - même date et même heure ;
 * - même niveau de service ;
 * - commandes en attente ou assignées ;
 * - opérations existantes non commencées ;
 * - transaction SQL avec rollback en cas d'erreur.
 */

function positiveId(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function normalizeAddress(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function dateKey(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  return String(value).slice(0, 10);
}

function timeKey(value) {
  return value == null ? null : String(value).slice(0, 8);
}

function assertSame(label, values) {
  if (new Set(values).size !== 1) {
    throw new Error(
      `Regroupement refusé : ${label} différents.`
    );
  }
}

async function createPickupTask(connection, input = {}) {
  const orderIds = [
    ...new Set(
      (input.order_ids || []).map(positiveId)
    ),
  ];

  if (
    orderIds.length < 1 ||
    orderIds.includes(null)
  ) {
    throw new Error(
      "Sélectionne au moins une commande valide."
    );
  }

  const driverId =
    input.driver_id == null
      ? null
      : positiveId(input.driver_id);

  const vehicleId =
    input.vehicle_id == null
      ? null
      : positiveId(input.vehicle_id);

  if (
    (input.driver_id != null && !driverId) ||
    (input.vehicle_id != null && !vehicleId)
  ) {
    throw new Error(
      "Identifiant chauffeur ou véhicule invalide."
    );
  }

  await connection.beginTransaction();

  try {
    const placeholders = orderIds.map(() => "?").join(",");

    const [orders] = await connection.query(
      `
        SELECT
          id,
          order_number,
          client_id,
          pickup_address,
          pickup_date,
          pickup_time,
          pickup_driver_id,
          driver_id,
          vehicle_id,
          service_level,
          status
        FROM orders
        WHERE id IN (${placeholders})
        ORDER BY id
        FOR UPDATE
      `,
      orderIds
    );

    if (orders.length !== orderIds.length) {
      throw new Error(
        "Une ou plusieurs commandes sont introuvables."
      );
    }

    for (const order of orders) {
      if (!["pending", "assigned"].includes(order.status)) {
        throw new Error(
          `Commande ${order.order_number} : état incompatible (${order.status}).`
        );
      }

      if (!normalizeAddress(order.pickup_address)) {
        throw new Error(
          `Commande ${order.order_number} : adresse manquante.`
        );
      }
    }

    assertSame(
      "adresses de ramassage",
      orders.map(o => normalizeAddress(o.pickup_address))
    );

    if (!dateKey(orders[0].pickup_date)) {
      throw new Error(
        "Une date de ramassage est obligatoire."
      );
    }

    const [packageCounts] = await connection.query(
      `
        SELECT order_id, COUNT(*) AS total
        FROM order_packages
        WHERE order_id IN (${placeholders})
        GROUP BY order_id
      `,
      orderIds
    );

    for (const order of orders) {
      const count = packageCounts.find(
        row => row.order_id === order.id
      );

      if (!count || Number(count.total) < 1) {
        throw new Error(
          `Commande ${order.order_number} : aucun colis enregistré.`
        );
      }
    }

    const [processedPackages] = await connection.query(
      `
        SELECT p.order_id, p.barcode, p.current_status
        FROM order_packages p
        WHERE p.order_id IN (${placeholders})
          AND (
            p.current_status <> 'created'
            OR EXISTS (
              SELECT 1
              FROM scan_events se
              WHERE se.package_id = p.id
                AND se.scan_status = 'accepted'
            )
          )
        LIMIT 1
      `,
      orderIds
    );

    if (processedPackages.length) {
      throw new Error(
        "Regroupement refusé : un colis a déjà été traité."
      );
    }

    const [existingOperations] = await connection.query(
      `
        SELECT
          id,
          order_id,
          operation_type,
          driver_id,
          vehicle_id,
          status,
          dispatch_task_id
        FROM order_operations
        WHERE order_id IN (${placeholders})
          AND operation_type = 'pickup'
        ORDER BY id
        FOR UPDATE
      `,
      orderIds
    );

    for (const op of existingOperations) {
      if (op.dispatch_task_id != null) {
        throw new Error(
          `L'opération ${op.id} appartient déjà à une mission.`
        );
      }

      if (!["pending", "assigned"].includes(op.status)) {
        throw new Error(
          `L'opération ${op.id} a déjà commencé ou est terminée.`
        );
      }
    }

    for (const order of orders) {
      const ops = existingOperations.filter(
        op => op.order_id === order.id
      );

      if (ops.length > 1) {
        throw new Error(
          `La commande ${order.order_number} possède plusieurs opérations de ramassage.`
        );
      }

      const assignedDriver =
        order.pickup_driver_id ?? order.driver_id ?? null;

      if (
        driverId != null &&
        assignedDriver != null &&
        Number(assignedDriver) !== driverId
      ) {
        throw new Error(
          `La commande ${order.order_number} est assignée à un autre chauffeur.`
        );
      }

      if (
        driverId != null &&
        ops[0]?.driver_id != null &&
        Number(ops[0].driver_id) !== driverId
      ) {
        throw new Error(
          `L'opération ${ops[0].id} est assignée à un autre chauffeur.`
        );
      }

      if (
        vehicleId != null &&
        ops[0]?.vehicle_id != null &&
        Number(ops[0].vehicle_id) !== vehicleId
      ) {
        throw new Error(
          `L'opération ${ops[0].id} utilise un autre véhicule.`
        );
      }
    }

    const first = orders[0];
    const taskClientId = new Set(orders.map(o => o.client_id)).size === 1 ? first.client_id : null;

    if (String(first.pickup_address).length > 255) {
      throw new Error(
        "Adresse trop longue pour dispatch_tasks.address."
      );
    }

    const [taskResult] = await connection.query(
      `
        INSERT INTO dispatch_tasks (
          task_type,
          client_id,
          driver_id,
          vehicle_id,
          address,
          scheduled_date,
          scheduled_time,
          status,
          notes
        )
        VALUES (
          'pickup', ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        taskClientId,
        driverId,
        vehicleId,
        first.pickup_address,
        dateKey(first.pickup_date),
        timeKey(first.pickup_time),
        driverId ? "assigned" : "pending",
        input.notes || null,
      ]
    );

    const taskId = taskResult.insertId;

    for (const order of orders) {
      const existing = existingOperations.find(
        op => op.order_id === order.id
      );

      if (existing) {
        await connection.query(
          `
            UPDATE order_operations
            SET
              dispatch_task_id = ?,
              driver_id = ?,
              vehicle_id = COALESCE(?, vehicle_id),
              status = ?
            WHERE id = ?
              AND dispatch_task_id IS NULL
          `,
          [
            taskId,
            driverId,
            vehicleId,
            driverId ? "assigned" : "pending",
            existing.id,
          ]
        );
      } else {
        await connection.query(
          `
            INSERT INTO order_operations (
              order_id,
              operation_type,
              driver_id,
              vehicle_id,
              scheduled_date,
              scheduled_time,
              status,
              dispatch_task_id
            )
            VALUES (
              ?, 'pickup', ?, ?, ?, ?, ?, ?
            )
          `,
          [
            order.id,
            driverId,
            vehicleId,
            dateKey(order.pickup_date),
            timeKey(order.pickup_time),
            driverId ? "assigned" : "pending",
            taskId,
          ]
        );
      }
    }

    // Règle Dispatch : toute commande placée dans un stop de ramassage
    // affiche immédiatement le statut métier RAMASSAGE.
    await connection.query(
      `UPDATE orders SET status = 'pickup_in_progress' WHERE id IN (${placeholders})`,
      orderIds
    );

    const [progressRows] = await connection.query(
      `
        SELECT
          COUNT(DISTINCT op.order_id) AS total_orders,
          COUNT(p.id) AS total_packages
        FROM order_operations op
        LEFT JOIN order_packages p
          ON p.order_id = op.order_id
        WHERE op.dispatch_task_id = ?
          AND op.operation_type = 'pickup'
      `,
      [taskId]
    );

    await connection.commit();

    return {
      success: true,
      task_id: taskId,
      task_type: "pickup",
      order_ids: orderIds,
      total_orders: Number(
        progressRows[0].total_orders
      ),
      total_packages: Number(
        progressRows[0].total_packages
      ),
      status: driverId ? "assigned" : "pending",
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  }
}


/**
 * Créer une mission de livraison regroupée.
 *
 * Conditions :
 * - même client ;
 * - même adresse de livraison ;
 * - même date et même heure ;
 * - même niveau de service ;
 * - tous les colis prêts pour la livraison ;
 * - aucune livraison déjà commencée ;
 * - chauffeur et véhicule compatibles.
 */
async function createDeliveryTask(connection, input = {}) {
  // Ce flag est fourni uniquement par le contrôleur Dispatch protégé.
  // Il ne doit jamais être déterminé directement par le navigateur.
  const dispatchOverride = input.dispatch_override === true;

  const orderIds = [
    ...new Set(
      (input.order_ids || []).map(positiveId)
    ),
  ];

  if (
    orderIds.length < 1 ||
    orderIds.includes(null)
  ) {
    throw new Error(
      "Sélectionne au moins une commande valide."
    );
  }

  const driverId =
    input.driver_id == null
      ? null
      : positiveId(input.driver_id);

  const vehicleId =
    input.vehicle_id == null
      ? null
      : positiveId(input.vehicle_id);

  if (
    (input.driver_id != null && !driverId) ||
    (input.vehicle_id != null && !vehicleId)
  ) {
    throw new Error(
      "Identifiant chauffeur ou véhicule invalide."
    );
  }

  await connection.beginTransaction();

  try {
    const placeholders = orderIds
      .map(() => "?")
      .join(",");

    const [orders] = await connection.query(
      `
        SELECT
          id,
          order_number,
          client_id,
          driver_id,
          delivery_driver_id,
          vehicle_id,
          delivery_address,
          delivery_date,
          delivery_time,
          service_level,
          status
        FROM orders
        WHERE id IN (${placeholders})
        ORDER BY id
        FOR UPDATE
      `,
      orderIds
    );

    if (orders.length !== orderIds.length) {
      throw new Error(
        "Une ou plusieurs commandes sont introuvables."
      );
    }

    for (const order of orders) {
      // Le workflow normal protège les états finaux / incidents.
      // Le Dispatch peut toutefois forcer une nouvelle exécution.
      if (
        !dispatchOverride &&
        ["cancelled", "completed", "incident"]
          .includes(order.status)
      ) {
        throw new Error(
          `Commande ${order.order_number} : état incompatible.`
        );
      }

      if (!normalizeAddress(order.delivery_address)) {
        throw new Error(
          `Commande ${order.order_number} : adresse de livraison manquante.`
        );
      }
    }

    assertSame(
      "adresses de livraison",
      orders.map(o => normalizeAddress(o.delivery_address))
    );

    const first = orders[0];
    const taskClientId = new Set(orders.map(o => o.client_id)).size === 1 ? first.client_id : null;

    if (!dateKey(first.delivery_date)) {
      throw new Error(
        "Une date de livraison est obligatoire."
      );
    }

    if (String(first.delivery_address).length > 255) {
      throw new Error(
        "Adresse trop longue pour dispatch_tasks.address."
      );
    }

    const [packages] = await connection.query(
      `
        SELECT
          id,
          order_id,
          barcode,
          current_status
        FROM order_packages
        WHERE order_id IN (${placeholders})
        FOR UPDATE
      `,
      orderIds
    );

    for (const order of orders) {
      const orderPackages = packages.filter(
        p => p.order_id === order.id
      );

      if (!orderPackages.length) {
        throw new Error(
          `Commande ${order.order_number} : aucun colis.`
        );
      }

      // Un colis ramassé est déjà prêt à être planifié pour la livraison.
      // "out_for_delivery" reste valide pour les colis déjà chargés / sortis.
      // On ne force pas le colis à out_for_delivery au moment du pickup :
      // l'historique physique conserve donc correctement "picked_up".
      const DELIVERY_READY_PACKAGE_STATUSES = new Set([
        "picked_up",
        "warehouse_in",
        "warehouse_storage",
        "warehouse_out",
        "out_for_delivery",
      ]);

      const unready = orderPackages.find(
        p => !DELIVERY_READY_PACKAGE_STATUSES.has(p.current_status)
      );

      if (unready && !dispatchOverride) {
        throw new Error(
          `Livraison refusée : colis ${unready.barcode} ` +
          `non prêt pour la livraison ` +
          `(${unready.current_status}).`
        );
      }
    }

    const [existingOperations] = await connection.query(
      `
        SELECT
          id,
          order_id,
          driver_id,
          vehicle_id,
          status,
          dispatch_task_id
        FROM order_operations
        WHERE order_id IN (${placeholders})
          AND operation_type = 'delivery'
        ORDER BY id
        FOR UPDATE
      `,
      orderIds
    );

    const selectedOperations = new Map();

    for (const order of orders) {
      const operations = existingOperations.filter(
        op => op.order_id === order.id
      );

      if (!dispatchOverride) {
        if (operations.length > 1) {
          throw new Error(
            `Commande ${order.order_number} : ` +
            `plusieurs opérations de livraison.`
          );
        }

        const operation = operations[0] || null;

        if (operation?.dispatch_task_id != null) {
          throw new Error(
            `Opération ${operation.id} déjà liée à une mission.`
          );
        }

        if (
          operation &&
          !["pending", "assigned"].includes(operation.status)
        ) {
          throw new Error(
            `Opération ${operation.id} déjà commencée ou terminée.`
          );
        }

        selectedOperations.set(order.id, operation);
      } else {
        /*
         * OVERRIDE DISPATCH
         *
         * Une ancienne opération completed/cancelled/etc. reste intacte.
         * On ne réutilise qu'une opération pending/assigned non liée.
         */
        const reusable = operations
          .filter(
            op =>
              op.dispatch_task_id == null &&
              ["pending", "assigned"].includes(op.status)
          )
          .sort((a, b) => Number(b.id) - Number(a.id))[0] || null;

        /*
         * Protection anti-doublon :
         * si une opération encore active est déjà dans un stop,
         * le Dispatch doit d'abord la retirer/réassigner au lieu
         * de créer deux livraisons actives simultanées.
         */
        const activeLinked = operations.find(
          op =>
            op.dispatch_task_id != null &&
            ["pending", "assigned", "in_progress"].includes(op.status)
        );

        if (activeLinked) {
          throw new Error(
            `Commande ${order.order_number} : ` +
            `une livraison active existe déjà (opération ${activeLinked.id}).`
          );
        }

        selectedOperations.set(order.id, reusable);
      }

      const operation = selectedOperations.get(order.id);

      const assignedDriver =
        dispatchOverride
          ? operation?.driver_id ?? null
          : order.delivery_driver_id ??
            operation?.driver_id ??
            null;

      if (
        !dispatchOverride &&
        driverId != null &&
        assignedDriver != null &&
        Number(assignedDriver) !== driverId
      ) {
        throw new Error(
          `Commande ${order.order_number} : ` +
          `chauffeur de livraison incompatible.`
        );
      }

      if (
        !dispatchOverride &&
        driverId != null &&
        operation?.driver_id != null &&
        Number(operation.driver_id) !== driverId
      ) {
        throw new Error(
          `Opération ${operation.id} : autre chauffeur.`
        );
      }

      if (
        !dispatchOverride &&
        vehicleId != null &&
        operation?.vehicle_id != null &&
        Number(operation.vehicle_id) !== vehicleId
      ) {
        throw new Error(
          `Opération ${operation.id} : autre véhicule.`
        );
      }
    }

    const [created] = await connection.query(
      `
        INSERT INTO dispatch_tasks (
          task_type,
          client_id,
          driver_id,
          vehicle_id,
          address,
          scheduled_date,
          scheduled_time,
          status,
          notes
        )
        VALUES (
          'delivery', ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        taskClientId,
        driverId,
        vehicleId,
        first.delivery_address,
        dateKey(first.delivery_date),
        timeKey(first.delivery_time),
        driverId ? "assigned" : "pending",
        input.notes || null,
      ]
    );

    const taskId = created.insertId;

    /*
     * WORKFLOW LIVRAISON PAR COLIS
     *
     * Une opération reste liée à la commande, mais
     * operation_package_exclusions détermine quels colis
     * appartiennent réellement à CETTE exécution.
     *
     * Exemple :
     *   P001 = picked_up -> visible dans la livraison
     *   P002 = incident  -> exclu de cette livraison
     */
    const DELIVERY_ELIGIBLE_PACKAGE_STATUSES = new Set([
      "picked_up",
      "warehouse_in",
      "warehouse_storage",
      "warehouse_out",
      "out_for_delivery",
    ]);

    const actorUserId = positiveId(input.actor_user_id);

    if (!actorUserId) {
      throw new Error(
        "Utilisateur Dispatch introuvable pour la traçabilité."
      );
    }

    let deliveryPackageCount = 0;
    let excludedPackageCount = 0;

    for (const order of orders) {
      const operation = selectedOperations.get(order.id) || null;
      let deliveryOperationId = null;

      if (operation) {
        const [updated] = await connection.query(
          `
            UPDATE order_operations
            SET
              dispatch_task_id = ?,
              driver_id = ?,
              vehicle_id = COALESCE(?, vehicle_id),
              status = ?
            WHERE id = ?
              AND dispatch_task_id IS NULL
          `,
          [
            taskId,
            driverId,
            vehicleId,
            driverId ? "assigned" : "pending",
            operation.id,
          ]
        );

        if (updated.affectedRows !== 1) {
          throw new Error(
            `Impossible de lier l'opération ${operation.id}.`
          );
        }

        deliveryOperationId = operation.id;
      } else {
        const [createdOperation] = await connection.query(
          `
            INSERT INTO order_operations (
              order_id,
              operation_type,
              driver_id,
              vehicle_id,
              scheduled_date,
              scheduled_time,
              status,
              dispatch_task_id
            )
            VALUES (
              ?, 'delivery', ?, ?, ?, ?, ?, ?
            )
          `,
          [
            order.id,
            driverId,
            vehicleId,
            dateKey(order.delivery_date),
            timeKey(order.delivery_time),
            driverId ? "assigned" : "pending",
            taskId,
          ]
        );

        deliveryOperationId = createdOperation.insertId;
      }

      if (!deliveryOperationId) {
        throw new Error(
          `Impossible de déterminer l'opération de livraison pour ${order.order_number}.`
        );
      }

      const orderPackages = packages.filter(
        p => Number(p.order_id) === Number(order.id)
      );

      const eligiblePackages = orderPackages.filter(
        p => DELIVERY_ELIGIBLE_PACKAGE_STATUSES.has(
          String(p.current_status || "")
        )
      );

      if (!eligiblePackages.length) {
        throw new Error(
          `Commande ${order.order_number} : aucun colis admissible à la livraison.`
        );
      }

      deliveryPackageCount += eligiblePackages.length;

      /*
       * Important :
       * on nettoie uniquement les exclusions appartenant à
       * cette nouvelle opération avant de reconstruire sa sélection.
       */
      await connection.query(
        `UPDATE operation_package_exclusions
         SET active=0,
             restored_at=NOW(),
             restored_by_user_id=?,
             restore_reason='Nouvelle sélection automatique de livraison'
         WHERE operation_id=?
           AND active=1`,
        [actorUserId, deliveryOperationId]
      );

      for (const pkg of orderPackages) {
        const eligible =
          DELIVERY_ELIGIBLE_PACKAGE_STATUSES.has(
            String(pkg.current_status || "")
          );

        if (eligible) {
          /*
           * Audit de l'inclusion du colis dans cette livraison.
           */
          try {
            await connection.query(
              `INSERT INTO package_status_audit
                 (
                   package_id,
                   order_id,
                   operation_id,
                   dispatch_task_id,
                   route_id,
                   actor_type,
                   actor_id,
                   action,
                   from_status,
                   to_status,
                   reason,
                   metadata
                 )
               VALUES (?, ?, ?, ?, NULL, 'dispatch', ?,
                       'INCLUDED_IN_DELIVERY',
                       ?, ?,
                       'Colis admissible à la livraison',
                       ?)`,
              [
                pkg.id,
                order.id,
                deliveryOperationId,
                taskId,
                actorUserId,
                pkg.current_status,
                pkg.current_status,
                JSON.stringify({
                  selection: "automatic_package_workflow"
                }),
              ]
            );
          } catch (auditError) {
            if (auditError?.code !== "ER_NO_SUCH_TABLE") {
              throw auditError;
            }
          }

          continue;
        }

        excludedPackageCount++;

        await connection.query(
          `INSERT INTO operation_package_exclusions
             (
               operation_id,
               package_id,
               route_id,
               dispatch_task_id,
               actor_user_id,
               reason,
               previous_package_status,
               active
             )
           VALUES (?, ?, NULL, ?, ?,
                   'Colis non admissible à cette livraison',
                   ?, 1)
           ON DUPLICATE KEY UPDATE
             route_id=NULL,
             dispatch_task_id=VALUES(dispatch_task_id),
             actor_user_id=VALUES(actor_user_id),
             reason=VALUES(reason),
             previous_package_status=VALUES(previous_package_status),
             active=1,
             created_at=CURRENT_TIMESTAMP,
             restored_at=NULL,
             restored_by_user_id=NULL,
             restore_reason=NULL`,
          [
            deliveryOperationId,
            pkg.id,
            taskId,
            actorUserId,
            pkg.current_status,
          ]
        );

        try {
          await connection.query(
            `INSERT INTO package_status_audit
               (
                 package_id,
                 order_id,
                 operation_id,
                 dispatch_task_id,
                 route_id,
                 actor_type,
                 actor_id,
                 action,
                 from_status,
                 to_status,
                 reason,
                 metadata
               )
             VALUES (?, ?, ?, ?, NULL, 'dispatch', ?,
                     'EXCLUDED_FROM_DELIVERY',
                     ?, ?,
                     'Colis non admissible à cette livraison',
                     ?)`,
            [
              pkg.id,
              order.id,
              deliveryOperationId,
              taskId,
              actorUserId,
              pkg.current_status,
              pkg.current_status,
              JSON.stringify({
                selection: "automatic_package_workflow"
              }),
            ]
          );
        } catch (auditError) {
          if (auditError?.code !== "ER_NO_SUCH_TABLE") {
            throw auditError;
          }
        }
      }
    }

    await connection.commit();

    return {
      success: true,
      task_id: taskId,
      task_type: "delivery",
      order_ids: orderIds,
      total_orders: orders.length,
      total_packages: deliveryPackageCount,
      excluded_packages: excludedPackageCount,
      status: driverId ? "assigned" : "pending",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

module.exports = {
  createPickupTask,
  createDeliveryTask,
};

