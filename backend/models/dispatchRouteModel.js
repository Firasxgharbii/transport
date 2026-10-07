"use strict";

/**
 * Glory Solutions
 *
 * ROUTE -> STOPS -> COMMANDES -> COLIS/PALETTES
 *
 * Un stop correspond à une ligne existante de dispatch_tasks.
 * Les commandes restent reliées au stop par
 * order_operations.dispatch_task_id.
 */

function positiveId(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function validDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

const ROUTE_SECTORS = Object.freeze({
  RS: "Rive-Sud",
  RN: "Rive-Nord",
  MTL: "Montréal",
  ME: "Montréal Est",
  MO: "Montréal Ouest",
});


function destinationCode(city, postalCode) {
  const rawCity = String(city || "").trim();
  const postal = String(postalCode || "").toUpperCase().replace(/\s+/g, "");
  const normalized = rawCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  if (/^H[1-9][A-Z]/.test(postal) || normalized.includes("MONTREAL")) return "MTL";
  if (normalized.includes("LAVAL")) return "LAV";
  if (normalized.includes("LONGUEUIL")) return "LGL";
  if (normalized.includes("BROSSARD")) return "BRS";
  if (normalized.includes("TERREBONNE")) return "TRB";
  if (normalized.includes("REPENTIGNY")) return "REP";

  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  if (compact) return compact.slice(0, 8);
  if (postal) return postal.slice(0, 3);
  return "ROUTE";
}

async function resolveFinalDestinationCode(connection, stopIds) {
  const finalStopId = stopIds[stopIds.length - 1];
  const [[stop]] = await connection.query(
    `SELECT id, task_type, city, postal_code FROM dispatch_tasks WHERE id = ? LIMIT 1`,
    [finalStopId]
  );
  if (!stop) throw new Error("Destination finale introuvable.");
  return destinationCode(stop.city, stop.postal_code);
}

async function validateSector(db, value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(code)) throw new Error("Code secteur invalide (2 à 8 lettres/chiffres).");
  if (Object.prototype.hasOwnProperty.call(ROUTE_SECTORS, code)) return code;
  const [rows] = await db.query("SELECT code FROM dispatch_sectors WHERE code = ? AND active = 1 LIMIT 1", [code]);
  if (!rows.length) throw new Error("Secteur inconnu. Crée-le d'abord dans Routes & arrêts.");
  return code;
}

async function listSectors(db) {
  const [rows] = await db.query("SELECT code, name, postal_prefixes FROM dispatch_sectors WHERE active = 1 ORDER BY name");
  return [...Object.entries(ROUTE_SECTORS).map(([code, name]) => ({code, name, postal_prefixes: ""})), ...rows.filter(row => !Object.prototype.hasOwnProperty.call(ROUTE_SECTORS, row.code))];
}

async function createSector(db, input = {}) {
  const code = String(input.code || "").trim().toUpperCase();
  const name = String(input.name || "").trim();
  const prefixes = [...new Set(String(input.postal_prefixes || "").toUpperCase().split(/[,;\s]+/).map(x => x.replace(/\s/g, "")).filter(Boolean))];
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(code)) throw new Error("Code secteur : 2 à 8 lettres/chiffres, commençant par une lettre.");
  if (Object.prototype.hasOwnProperty.call(ROUTE_SECTORS, code)) throw new Error("Ce code est réservé à un secteur existant.");
  if (name.length < 2 || name.length > 100) throw new Error("Nom secteur : 2 à 100 caractères.");
  if (prefixes.length > 100 || prefixes.some(x => !/^[A-Z][0-9][A-Z](?:[0-9][A-Z][0-9])?$/.test(x))) throw new Error("Codes postaux : préfixes canadiens A1A ou codes complets A1A1A1 séparés par des virgules.");
  await db.query("INSERT INTO dispatch_sectors (code, name, postal_prefixes) VALUES (?, ?, ?)", [code, name, prefixes.join(", ")]);
  return {code, name, postal_prefixes: prefixes.join(", ")};
}

async function createDraftRoute(db, input = {}) {
  const sector = String(input.sector || "").trim().toUpperCase();
  await validateSector(db, sector);
  if (!validDate(input.scheduled_date)) {
    throw new Error("Date invalide. Format attendu : AAAA-MM-JJ.");
  }
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 5000) : null;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.query(
      "INSERT INTO dispatch_routes (driver_id, vehicle_id, scheduled_date, status, notes) VALUES (NULL, NULL, ?, 'draft', ?)",
      [input.scheduled_date, notes]
    );
    const routeCode = `${sector}-${String(created.insertId).padStart(3, "0")}`;
    await connection.query("UPDATE dispatch_routes SET route_code = ? WHERE id = ?", [routeCode, created.insertId]);
    await connection.commit();
    return { route_id: created.insertId, route_code: routeCode, status: "draft" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createRoute(db, input = {}) {
  const driverId = positiveId(input.driver_id);
  const vehicleId = positiveId(input.vehicle_id);
  const scheduledDate = input.scheduled_date;
  const sector = typeof input.sector === "string"
    ? input.sector.trim().toUpperCase()
    : "";

  await validateSector(db, sector);

  const rawStopIds = input.stop_ids;

  if (
    !Array.isArray(rawStopIds) ||
    rawStopIds.length < 1 ||
    rawStopIds.length > 100
  ) {
    throw new Error(
      "Sélectionne entre 1 et 100 stops."
    );
  }

  const stopIds = rawStopIds.map(positiveId);

  if (
    stopIds.some(id => id === null) ||
    new Set(stopIds).size !== stopIds.length
  ) {
    throw new Error(
      "Liste des stops invalide ou en double."
    );
  }

  if (!driverId) {
    throw new Error("Chauffeur invalide.");
  }

  if (!vehicleId) {
    throw new Error("Véhicule invalide.");
  }

  if (!validDate(scheduledDate)) {
    throw new Error(
      "Date invalide. Format attendu : AAAA-MM-JJ."
    );
  }

  const notes =
    typeof input.notes === "string"
      ? input.notes.trim().slice(0, 5000)
      : null;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Verrouiller les ressources dans un ordre stable.
     * Cela limite les créations concurrentes de routes
     * pour le même chauffeur ou véhicule.
     */

    const [drivers] = await connection.query(
      `
        SELECT id, availability_status
        FROM drivers
        WHERE id = ?
        FOR UPDATE
      `,
      [driverId]
    );

    if (drivers.length !== 1) {
      throw new Error("Chauffeur introuvable.");
    }

    if (drivers[0].availability_status === "offline") {
      throw new Error(
        "Ce chauffeur est actuellement hors ligne."
      );
    }

    const [vehicles] = await connection.query(
      `
        SELECT id, driver_id, status
        FROM vehicles
        WHERE id = ?
        FOR UPDATE
      `,
      [vehicleId]
    );

    if (vehicles.length !== 1) {
      throw new Error("Véhicule introuvable.");
    }

    if (vehicles[0].status !== "available") {
      throw new Error(
        "Ce véhicule n'est pas disponible."
      );
    }

    if (
      vehicles[0].driver_id != null &&
      Number(vehicles[0].driver_id) !== driverId
    ) {
      throw new Error(
        "Ce véhicule est associé à un autre chauffeur."
      );
    }

    /*
     * Un chauffeur ou véhicule ne peut pas être
     * assigné à deux routes actives le même jour.
     */

    const [conflicts] = await connection.query(
      `
        SELECT id, route_code, driver_id, vehicle_id
        FROM dispatch_routes
        WHERE scheduled_date = ?
          AND status IN (
            'draft',
            'assigned',
            'in_progress'
          )
          AND (
            driver_id = ?
            OR vehicle_id = ?
          )
        FOR UPDATE
      `,
      [
        scheduledDate,
        driverId,
        vehicleId,
      ]
    );

    if (conflicts.length > 0) {
      throw new Error(
        "Le chauffeur ou le véhicule possède déjà " +
        "une route active à cette date."
      );
    }

    /*
     * Verrouiller tous les stops sélectionnés.
     * L'ordre fourni par le dispatcher sera conservé
     * dans stop_position.
     */

    const placeholders = stopIds.map(() => "?").join(",");

    const [stops] = await connection.query(
      `
        SELECT
          id,
          task_type,
          address,
          city,
          province,
          postal_code,
          driver_id,
          vehicle_id,
          route_id,
          status
        FROM dispatch_tasks
        WHERE id IN (${placeholders})
        ORDER BY id
        FOR UPDATE
      `,
      stopIds
    );

    if (stops.length !== stopIds.length) {
      throw new Error(
        "Un ou plusieurs stops sont introuvables."
      );
    }

    for (const stop of stops) {
      if (stop.route_id != null) {
        throw new Error(
          `Le stop #${stop.id} appartient déjà à une route.`
        );
      }

      if (
        stop.status !== "pending" &&
        stop.status !== "assigned"
      ) {
        throw new Error(
          `Le stop #${stop.id} ne peut plus être planifié ` +
          `car son statut est ${stop.status}.`
        );
      }

      if (
        stop.driver_id != null &&
        Number(stop.driver_id) !== driverId
      ) {
        throw new Error(
          `Le stop #${stop.id} est déjà assigné ` +
          "à un autre chauffeur."
        );
      }

      if (
        stop.vehicle_id != null &&
        Number(stop.vehicle_id) !== vehicleId
      ) {
        throw new Error(
          `Le stop #${stop.id} utilise déjà ` +
          "un autre véhicule."
        );
      }
    }

    /*
     * Vérifier les opérations individuelles.
     * Aucune commande commencée ne doit être
     * réassignée silencieusement.
     */

    const [operations] = await connection.query(
      `
        SELECT
          op.id,
          op.dispatch_task_id,
          op.status,
          op.driver_id,
          op.vehicle_id
        FROM order_operations op
        INNER JOIN dispatch_tasks dt
          ON dt.id = op.dispatch_task_id
         AND dt.task_type = op.operation_type
        WHERE op.dispatch_task_id IN (${placeholders})
        ORDER BY op.id
        FOR UPDATE
      `,
      stopIds
    );

    for (const operation of operations) {
      if (
        operation.status !== "pending" &&
        operation.status !== "assigned"
      ) {
        throw new Error(
          `Une opération du stop #${operation.dispatch_task_id} ` +
          "est déjà commencée, terminée ou annulée."
        );
      }

      if (
        operation.driver_id != null &&
        Number(operation.driver_id) !== driverId
      ) {
        throw new Error(
          `Une commande du stop #${operation.dispatch_task_id} ` +
          "est assignée à un autre chauffeur."
        );
      }

      if (
        operation.vehicle_id != null &&
        Number(operation.vehicle_id) !== vehicleId
      ) {
        throw new Error(
          `Une commande du stop #${operation.dispatch_task_id} ` +
          "est assignée à un autre véhicule."
        );
      }
    }

    if (
      new Set(
        operations.map(op => Number(op.dispatch_task_id))
      ).size !== stopIds.length
    ) {
      throw new Error(
        "Chaque stop doit contenir au moins une opération."
      );
    }

    /*
     * Créer la route.
     */

    const [insertResult] = await connection.query(
      `
        INSERT INTO dispatch_routes (
          driver_id,
          vehicle_id,
          scheduled_date,
          status,
          notes
        )
        VALUES (?, ?, ?, 'assigned', ?)
      `,
      [
        driverId,
        vehicleId,
        scheduledDate,
        notes,
      ]
    );

    const routeId = insertResult.insertId;

    // Étape 8 : le code de la route suit la destination finale (dernier stop).
    // Le secteur manuel reste disponible pour les brouillons; la configuration
    // fine par codes postaux sera centralisée à l’étape 9.
    const finalDestinationCode = await resolveFinalDestinationCode(connection, stopIds);
    const routeCode =
      `${finalDestinationCode}-${String(routeId).padStart(3, "0")}`;

    await connection.query(
      `
        UPDATE dispatch_routes
        SET route_code = ?
        WHERE id = ?
      `,
      [routeCode, routeId]
    );

    /*
     * Associer les stops à la route
     * dans l'ordre choisi par le dispatcher.
     */

    for (
      let index = 0;
      index < stopIds.length;
      index++
    ) {
      const stopId = stopIds[index];

      const [result] = await connection.query(
        `
          UPDATE dispatch_tasks
          SET
            route_id = ?,
            stop_position = ?,
            driver_id = ?,
            vehicle_id = ?,
            scheduled_date = ?,
            status = 'assigned'
          WHERE id = ?
            AND route_id IS NULL
            AND status IN ('pending', 'assigned')
        `,
        [
          routeId,
          index + 1,
          driverId,
          vehicleId,
          scheduledDate,
          stopId,
        ]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Impossible d'associer le stop #${stopId}.`
        );
      }
    }

    /*
     * Synchroniser les opérations individuelles
     * pour que le chauffeur retrouve ses commandes.
     */

    const [updatedOperations] = await connection.query(
      `
        UPDATE order_operations op
        INNER JOIN dispatch_tasks dt
          ON dt.id = op.dispatch_task_id
         AND dt.task_type = op.operation_type
        SET
          op.driver_id = ?,
          op.vehicle_id = ?,
          op.scheduled_date = ?,
          op.status = 'assigned'
        WHERE dt.route_id = ?
          AND op.status IN ('pending', 'assigned')
      `,
      [
        driverId,
        vehicleId,
        scheduledDate,
        routeId,
      ]
    );

    if (
      updatedOperations.affectedRows !==
      operations.length
    ) {
      throw new Error(
        "La synchronisation des commandes est incomplète."
      );
    }

    await connection.commit();

    return {
      success: true,
      route_id: routeId,
      route_code: routeCode,
      driver_id: driverId,
      vehicle_id: vehicleId,
      scheduled_date: scheduledDate,
      total_stops: stopIds.length,
      stop_ids: stopIds,
      status: "assigned",
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}



/* =====================================================
   CONSULTATION DES ROUTES — DISPATCH CONTROL CENTER
   Lecture seule : aucune modification des affectations.
===================================================== */

async function getRoutes(db, filters = {}) {
  const from = validDate(filters.date_from) ? filters.date_from : null;
  const to = validDate(filters.date_to) ? filters.date_to : null;
  const exact = validDate(filters.date) ? filters.date : null;
  const where = [];
  const params = [];
  if (exact) { where.push("r.scheduled_date = ?"); params.push(exact); }
  else {
    if (from) { where.push("r.scheduled_date >= ?"); params.push(from); }
    if (to) { where.push("r.scheduled_date <= ?"); params.push(to); }
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [routes] = await db.query(`
    SELECT
      r.id,
      r.route_code,
      r.driver_id,
      r.vehicle_id,
      r.scheduled_date,
      r.status,
      r.notes,
      r.created_at,
      r.updated_at,
      CONCAT('Chauffeur #', d.id) AS driver_name,
      d.id AS driver_id_reference,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.plate AS vehicle_plate,
      COUNT(dt.id) AS total_stops,
      (SELECT COUNT(*) FROM (
        SELECT DISTINCT dt2.route_id, op2.order_id
        FROM dispatch_tasks dt2
        INNER JOIN order_operations op2 ON op2.dispatch_task_id = dt2.id
        WHERE dt2.route_id IS NOT NULL
      ) linked WHERE linked.route_id = r.id) AS total_orders,
      (SELECT COUNT(*) FROM (
        SELECT DISTINCT dt3.route_id, op3.order_id, p3.id AS package_id
        FROM dispatch_tasks dt3
        INNER JOIN order_operations op3 ON op3.dispatch_task_id = dt3.id
        INNER JOIN order_packages p3 ON p3.order_id = op3.order_id
        WHERE dt3.route_id IS NOT NULL
      ) linked_packages WHERE linked_packages.route_id = r.id) AS total_packages,
      (SELECT COALESCE(SUM(COALESCE(o4.pallets_count, 0)), 0) FROM (
        SELECT DISTINCT dt4.route_id, op4.order_id
        FROM dispatch_tasks dt4
        INNER JOIN order_operations op4 ON op4.dispatch_task_id = dt4.id
        WHERE dt4.route_id IS NOT NULL
      ) linked_pallets INNER JOIN orders o4 ON o4.id = linked_pallets.order_id
      WHERE linked_pallets.route_id = r.id) AS total_pallets
    FROM dispatch_routes r
    LEFT JOIN drivers d ON d.id = r.driver_id
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    LEFT JOIN dispatch_tasks dt ON dt.route_id = r.id
    ${whereSql}
    GROUP BY
      r.id,
      r.route_code,
      r.driver_id,
      r.vehicle_id,
      r.scheduled_date,
      r.status,
      r.notes,
      r.created_at,
      r.updated_at,
      d.id,
      v.make,
      v.model,
      v.plate
    ORDER BY r.scheduled_date DESC, r.id DESC
  `, params);

  return routes;
}

async function getArchivedRoutes(db) {
  /*
   * ARCHIVES V2
   *
   * Une archive représente UNE JOURNÉE d'une route.
   * Elle ne dépend plus du statut actuel de dispatch_routes.
   *
   * Exemple :
   * MTL-001 / 2026-10-06 = archive
   * MTL-001 / 2026-10-07 = route active
   */

  const [archives] = await db.query(`
    SELECT
      a.id AS archive_id,
      a.route_id,
      a.route_code,
      a.business_date,
      a.snapshot,
      a.archived_at
    FROM dispatch_route_daily_archives a
    ORDER BY a.business_date DESC, a.id DESC
  `);

  return archives.map((row) => {
    let snapshot = row.snapshot || {};

    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch (_) {
        snapshot = {};
      }
    }

    const route =
      snapshot &&
      typeof snapshot.route === "object" &&
      snapshot.route
        ? snapshot.route
        : {};

    const stops =
      Array.isArray(snapshot.stops)
        ? snapshot.stops
        : [];

    const operations =
      Array.isArray(snapshot.operations)
        ? snapshot.operations
        : [];

    const packages =
      Array.isArray(snapshot.packages)
        ? snapshot.packages
        : [];

    const orderIds = new Set(
      operations
        .map((op) => Number(op.order_id))
        .filter(Boolean)
    );

    const totalPallets = packages.reduce(
      (total, pkg) => {
        const type = String(
          pkg.package_type ||
          pkg.type ||
          ""
        ).toLowerCase();

        return total +
          (type.includes("pallet") ||
           type.includes("palette")
            ? 1
            : 0);
      },
      0
    );

    return {
      /*
       * id reste l'archive_id pour que la page existante
       * puisse avoir une clé unique par journée.
       */
      id: Number(row.archive_id),
      archive_id: Number(row.archive_id),

      /*
       * route_id = identité permanente de la route.
       */
      route_id: Number(row.route_id),

      route_code:
        row.route_code ||
        route.route_code ||
        null,

      scheduled_date:
        row.business_date,

      business_date:
        row.business_date,

      /*
       * Le statut affiché correspond à la journée archivée,
       * pas au statut actuel de la route permanente.
       */
      status:
        route.status === "cancelled"
          ? "cancelled"
          : "completed",

      driver_id:
        route.driver_id ?? null,

      vehicle_id:
        route.vehicle_id ?? null,

      /*
       * Certains anciens snapshots ne contiennent pas
       * encore les libellés complets.
       */
      driver_name:
        route.driver_name ||
        route.driver_full_name ||
        (
          route.driver_id
            ? `Chauffeur #${route.driver_id}`
            : null
        ),

      vehicle_make:
        route.vehicle_make ||
        route.make ||
        null,

      vehicle_model:
        route.vehicle_model ||
        route.model ||
        null,

      vehicle_plate:
        route.vehicle_plate ||
        route.plate ||
        null,

      total_stops:
        stops.length,

      total_orders:
        orderIds.size,

      total_packages:
        packages.length,

      total_pallets:
        totalPallets,

      archived_at:
        row.archived_at,

      updated_at:
        row.archived_at
    };
  });
}

async function getRouteById(db, routeId) {
  const id = positiveId(routeId);
  if (!id) return null;

  const [routes] = await db.query(`
    SELECT
      r.*,
      CONCAT('Chauffeur #', d.id) AS driver_name,
      d.id AS driver_id_reference,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.plate AS vehicle_plate
    FROM dispatch_routes r
    LEFT JOIN drivers d ON d.id = r.driver_id
    LEFT JOIN vehicles v ON v.id = r.vehicle_id
    WHERE r.id = ?
    LIMIT 1
  `, [id]);

  if (!routes.length) return null;

  const route = routes[0];

  const [stops] = await db.query(`
    SELECT
      dt.id,
      dt.route_id,
      dt.stop_position,
      dt.task_type,
      dt.client_id,
      dt.driver_id,
      dt.vehicle_id,
      dt.address,
      dt.city,
      dt.province,
      dt.postal_code,
      dt.scheduled_date,
      dt.scheduled_time,
      dt.status,
      dt.notes,
      c.first_name AS client_first_name,
      c.last_name AS client_last_name,
      c.company_name AS client_company_name
    FROM dispatch_tasks dt
    LEFT JOIN clients c ON c.id = dt.client_id
    WHERE dt.route_id = ?
    ORDER BY
      dt.stop_position IS NULL,
      dt.stop_position ASC,
      dt.id ASC
  `, [id]);

  const stopIds = stops.map(stop => stop.id);

  if (!stopIds.length) {
    return {
      ...route,
      total_stops: 0,
      total_orders: 0,
      total_packages: 0,
      total_pallets: 0,
      stops: []
    };
  }

  const placeholders = stopIds.map(() => "?").join(",");

  /*
   * Une commande est comptée une seule fois par stop,
   * même si plusieurs opérations lui sont associées.
   */
  const [linkedOrders] = await db.query(`
    SELECT DISTINCT
      op.dispatch_task_id AS stop_id,
      op.id AS operation_id,
      op.operation_type,
      op.status AS operation_status,
      o.id,
      o.order_number,
      o.client_id,
      o.status,
      o.signature_required,
      o.service_level,
      o.priority,
      o.pallets_count,
      o.pickup_address,
      o.delivery_address,
      o.pickup_appointment,
      o.pickup_date,
      o.pickup_time,
      o.delivery_appointment,
      o.delivery_date,
      o.delivery_time,
      o.destination_type,
      o.company_name,
      o.contact_name,
      o.contact_phone,
      o.contact_extension,
      o.delivery_unit,
      o.description,
      o.notes,
      c.first_name AS client_first_name,
      c.last_name AS client_last_name,
      c.company_name AS client_company_name
    FROM order_operations op
    INNER JOIN orders o ON o.id = op.order_id
    LEFT JOIN clients c ON c.id = o.client_id
    WHERE op.dispatch_task_id IN (${placeholders})
    ORDER BY op.dispatch_task_id, o.id
  `, stopIds);

  const orderIds = [...new Set(
    linkedOrders.map(order => Number(order.id))
  )];

  let packages = [];

  if (orderIds.length) {
    const packagePlaceholders = orderIds.map(() => "?").join(",");

    const [rows] = await db.query(`
      SELECT
        id,
        order_id,
        barcode,
        package_number,
        package_type,
        description,
        weight,
        weight_unit,
        length,
        width,
        height,
        dimension_unit,
        current_status
      FROM order_packages
      WHERE order_id IN (${packagePlaceholders})
      ORDER BY order_id, package_number, id
    `, orderIds);

    packages = rows;
  }

  const packagesByOrder = new Map();

  for (const item of packages) {
    const orderId = Number(item.order_id);

    if (!packagesByOrder.has(orderId)) {
      packagesByOrder.set(orderId, []);
    }

    packagesByOrder.get(orderId).push(item);
  }

  const ordersByStop = new Map();

  for (const order of linkedOrders) {
    const stopId = Number(order.stop_id);

    if (!ordersByStop.has(stopId)) {
      ordersByStop.set(stopId, []);
    }

    ordersByStop.get(stopId).push({
      ...order,
      signature_required:
        Number(order.signature_required) === 1,
      pickup_appointment:
        Number(order.pickup_appointment) === 1,
      delivery_appointment:
        Number(order.delivery_appointment) === 1,
      pallets_count:
        Number(order.pallets_count || 0),
      packages:
        packagesByOrder.get(Number(order.id)) || []
    });
  }

  const [runs] = await db.query(`SELECT dispatch_task_id,execution_status,started_at,closed_at,close_latitude,close_longitude,close_accuracy,close_address FROM driver_stop_runs WHERE dispatch_task_id IN (${placeholders}) ORDER BY id DESC`, stopIds);
  const [exceptions] = await db.query(`SELECT id,dispatch_task_id,operation_id,order_id,package_id,driver_id,reason,comment,latitude,longitude,accuracy,proof_url,proof_public_id,created_at,updated_at FROM driver_package_exceptions WHERE dispatch_task_id IN (${placeholders}) ORDER BY created_at DESC,id DESC`, stopIds);
  const [proofs] = await db.query(`SELECT id,dispatch_task_id,operation_id,order_id,driver_id,proof_type,recipient_first_name,recipient_last_name,cloudinary_url,cloudinary_public_id,closure_address,latitude,longitude,accuracy,created_at,updated_at FROM driver_delivery_proofs WHERE dispatch_task_id IN (${placeholders}) ORDER BY created_at DESC,id DESC`, stopIds);
  const runByStop=new Map(); for(const r of runs) if(!runByStop.has(Number(r.dispatch_task_id)))runByStop.set(Number(r.dispatch_task_id),r);
  const exByOp=new Map(); for(const e of exceptions){const k=Number(e.operation_id);if(!exByOp.has(k))exByOp.set(k,[]);exByOp.get(k).push(e);}
  const proofByOp=new Map(); for(const pr of proofs) if(!proofByOp.has(Number(pr.operation_id)))proofByOp.set(Number(pr.operation_id),pr);
  const [excluded]=await db.query(`SELECT operation_id,package_id,reason,actor_user_id,created_at FROM operation_package_exclusions WHERE dispatch_task_id IN (${placeholders}) AND active=1`,stopIds);
  const excludedByOpPkg=new Map(excluded.map(x=>[`${Number(x.operation_id)}:${Number(x.package_id)}`,x]));
  for(const list of ordersByStop.values()) for(const order of list){order.exceptions=exByOp.get(Number(order.operation_id))||[];order.proof=proofByOp.get(Number(order.operation_id))||null;order.packages=order.packages.map(p=>({...p,route_exclusion:excludedByOpPkg.get(`${Number(order.operation_id)}:${Number(p.id)}`)||null}));order.scanned_packages=order.packages.filter(p=>['picked_up','warehouse_in','warehouse_storage','warehouse_out','out_for_delivery','delivered'].includes(String(p.current_status))).length;order.exception_packages=order.exceptions.length;}

  const detailedStops = stops.map(stop => {
    const orders = ordersByStop.get(Number(stop.id)) || [];

    const run=runByStop.get(Number(stop.id))||null;
    return {
      ...stop,
      run,
      orders,
      total_orders: orders.length,
      total_packages: orders.reduce(
        (sum, order) => sum + order.packages.length,
        0
      ),
      total_pallets: orders.reduce(
        (sum, order) => sum + order.pallets_count,
        0
      ),
      signature_required: orders.some(
        order => order.signature_required
      )
    };
  });

  return {
    ...route,
    total_stops: detailedStops.length,
    total_orders: new Set(detailedStops.flatMap(stop => stop.orders.map(order => Number(order.id)))).size,
    total_packages: new Set(detailedStops.flatMap(stop => stop.orders.flatMap(order => order.packages.map(item => Number(item.id))))).size,
    total_pallets: [...new Map(detailedStops.flatMap(stop => stop.orders.map(order => [Number(order.id), order]))).values()].reduce((sum, order) => sum + Number(order.pallets_count || 0), 0),
    stops: detailedStops
  };
}


async function getArchivedRouteById(db, archiveId) {
  const id = Number(archiveId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identifiant d'archive invalide.");
  }

  const [rows] = await db.query(
    `
      SELECT
        id AS archive_id,
        route_id,
        route_code,
        business_date,
        snapshot,
        archived_at
      FROM dispatch_route_daily_archives
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  if (!rows.length) return null;

  const row = rows[0];

  let snapshot = row.snapshot || {};

  if (typeof snapshot === "string") {
    try {
      snapshot = JSON.parse(snapshot);
    } catch (_) {
      snapshot = {};
    }
  }

  /*
   * IMPORTANT :
   * Le snapshot est la vérité historique.
   * On ne recharge PAS les stops depuis dispatch_tasks.
   *
   * Une route permanente peut déjà être utilisée pour une
   * nouvelle journée lorsque cette archive est consultée.
   */
  const route =
    snapshot &&
    typeof snapshot === "object" &&
    snapshot.route &&
    typeof snapshot.route === "object"
      ? snapshot.route
      : snapshot;

  return {
    archive_id: Number(row.archive_id),
    route_id: Number(row.route_id),
    route_code:
      row.route_code ||
      route?.route_code ||
      null,
    business_date: row.business_date,
    archived_at: row.archived_at,
    snapshot,
    route: {
      ...(route || {}),
      id: Number(row.route_id),
      route_code:
        row.route_code ||
        route?.route_code ||
        null,
      scheduled_date:
        route?.scheduled_date ||
        row.business_date,
      archived: true,
      archive_id: Number(row.archive_id),
      business_date: row.business_date,
      archived_at: row.archived_at
    }
  };
}

module.exports = {
  createRoute,
  createDraftRoute,
  listSectors,
  createSector,
  getRoutes,
  getArchivedRoutes,
  getArchivedRouteById,
  getRouteById,
};
