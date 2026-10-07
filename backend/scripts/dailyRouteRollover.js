'use strict';

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env')
});

const db = require('../config/db');

/*
 * GLORY SOLUTIONS
 * ROLLOVER JOURNALIER DES ROUTES
 *
 * PRINCIPE :
 *
 * La route est PERMANENTE.
 * La journée de la route est TEMPORAIRE.
 *
 * Exemple :
 *
 * MTL-001 / 2026-10-06
 *      ↓ archive
 * MTL-001 / 2026-10-07
 *
 * Le route_code et l'id restent identiques.
 *
 * L'historique de la veille est conservé dans
 * dispatch_route_daily_archives.
 *
 * Les anciens stops sont détachés de la route active,
 * mais JAMAIS supprimés.
 */

(async () => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [routes] = await conn.query(`
      SELECT *
      FROM dispatch_routes
      WHERE scheduled_date < CURDATE()
      FOR UPDATE
    `);

    console.log(
      `Routes à archiver/réinitialiser : ${routes.length}`
    );

    for (const route of routes) {

      console.log(
        `\n--- ${route.route_code} / ${route.scheduled_date} ---`
      );

      /*
       * =====================================================
       * 1. CHARGER LES STOPS DE LA JOURNÉE
       * =====================================================
       */

      const [stops] = await conn.query(`
        SELECT *
        FROM dispatch_tasks
        WHERE route_id = ?
        ORDER BY stop_position, id
      `, [route.id]);

      const stopIds = stops.map(s => Number(s.id));

      let operations = [];
      let packages = [];
      let runs = [];
      let exceptions = [];
      let proofs = [];

      if (stopIds.length) {

        const stopPH = stopIds.map(() => '?').join(',');

        /*
         * Opérations
         */

        [operations] = await conn.query(`
          SELECT *
          FROM order_operations
          WHERE dispatch_task_id IN (${stopPH})
          ORDER BY id
        `, stopIds);

        /*
         * Colis
         */

        const orderIds = [
          ...new Set(
            operations
              .map(op => Number(op.order_id))
              .filter(Boolean)
          )
        ];

        if (orderIds.length) {

          const orderPH =
            orderIds.map(() => '?').join(',');

          [packages] = await conn.query(`
            SELECT *
            FROM order_packages
            WHERE order_id IN (${orderPH})
            ORDER BY order_id, id
          `, orderIds);
        }

        /*
         * Exécution chauffeur
         */

        [runs] = await conn.query(`
          SELECT *
          FROM driver_stop_runs
          WHERE dispatch_task_id IN (${stopPH})
          ORDER BY id
        `, stopIds);

        /*
         * Incidents
         */

        [exceptions] = await conn.query(`
          SELECT *
          FROM driver_package_exceptions
          WHERE dispatch_task_id IN (${stopPH})
          ORDER BY id
        `, stopIds);

        /*
         * Preuves livraison
         *
         * IMPORTANT :
         * on conserve les références Cloudinary.
         * On ne supprime aucune preuve.
         */

        [proofs] = await conn.query(`
          SELECT
            id,
            dispatch_task_id,
            operation_id,
            order_id,
            driver_id,
            proof_type,
            recipient_first_name,
            recipient_last_name,
            cloudinary_url,
            cloudinary_public_id,
            closure_address,
            latitude,
            longitude,
            accuracy,
            created_at,
            updated_at
          FROM driver_delivery_proofs
          WHERE dispatch_task_id IN (${stopPH})
          ORDER BY id
        `, stopIds);
      }

      /*
       * =====================================================
       * 2. SNAPSHOT COMPLET
       * =====================================================
       */

      const snapshot = {
        route: { ...route },

        business_date:
          route.scheduled_date,

        archived_at:
          new Date().toISOString(),

        stops,

        operations,

        packages,

        runs,

        exceptions,

        proofs
      };

      /*
       * =====================================================
       * 3. ARCHIVER LA JOURNÉE
       * =====================================================
       *
       * UNIQUE(route_id,business_date)
       *
       * Donc relancer le script ne crée pas
       * plusieurs archives identiques.
       */

      await conn.query(`
        INSERT INTO dispatch_route_daily_archives
        (
          route_id,
          route_code,
          business_date,
          snapshot
        )
        VALUES (?, ?, ?, ?)

        ON DUPLICATE KEY UPDATE
          route_code = VALUES(route_code),
          snapshot = VALUES(snapshot),
          archived_at = CURRENT_TIMESTAMP
      `, [
        route.id,
        route.route_code,
        route.scheduled_date,
        JSON.stringify(snapshot)
      ]);

      /*
       * =====================================================
       * 4. DÉTACHER LES STOPS DE L'ANCIENNE JOURNÉE
       * =====================================================
       *
       * ATTENTION :
       *
       * ON NE DELETE RIEN.
       *
       * Les stops restent dans dispatch_tasks.
       * Les opérations restent dans order_operations.
       * Les preuves restent présentes.
       * Les incidents restent présents.
       *
       * Mais ils ne font plus partie de la route ACTIVE.
       */

      if (stopIds.length) {

        const stopPH =
          stopIds.map(() => '?').join(',');

        await conn.query(`
          UPDATE dispatch_tasks
          SET
            route_id = NULL,
            stop_position = NULL
          WHERE id IN (${stopPH})
            AND route_id = ?
        `, [
          ...stopIds,
          route.id
        ]);
      }

      /*
       * =====================================================
       * 5. RÉINITIALISER LA ROUTE POUR AUJOURD'HUI
       * =====================================================
       *
       * La route elle-même reste exactement la même.
       *
       * Même :
       *   id
       *   route_code
       *
       * Nouvelle journée :
       *   0 stop
       *   0 commande
       *   0 colis actif
       *
       * Chauffeur et véhicule sont remis à NULL.
       */

      await conn.query(`
        UPDATE dispatch_routes
        SET
          scheduled_date = CURDATE(),
          status = 'draft',
          driver_id = NULL,
          vehicle_id = NULL
        WHERE id = ?
      `, [route.id]);

      /*
       * =====================================================
       * 6. AUDIT
       * =====================================================
       */

      try {

        await conn.query(`
          INSERT INTO dispatch_route_activity
          (
            route_id,
            user_id,
            action,
            details
          )
          VALUES (?, NULL, ?, ?)
        `, [
          route.id,

          'route.archived.midnight',

          JSON.stringify({
            route_code:
              route.route_code,

            business_date:
              route.scheduled_date,

            archived_stops:
              stopIds.length,

            new_business_date:
              new Date()
                .toISOString()
                .slice(0, 10),

            route_preserved:
              true
          })
        ]);

      } catch (auditError) {

        console.warn(
          'Audit rollover ignoré :',
          auditError.message
        );
      }

      console.log(
        `✅ ${route.route_code} archivée puis remise disponible`
      );
    }

    await conn.commit();

    console.log(
      `\n✅ ROLLOVER TERMINÉ : ${routes.length} route(s)`
    );

  } catch (error) {

    await conn.rollback();

    console.error(
      '\n❌ ERREUR ROLLOVER :',
      error
    );

    process.exitCode = 1;

  } finally {

    conn.release();

    process.exit();
  }

})().catch(error => {

  console.error(error);

  process.exit(1);
});
