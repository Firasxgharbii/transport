const TrackingModel = require("../models/trackingModel");

/* ============================================================
   CONFIGURATION
============================================================ */

const DEFAULT_DRIVER_HISTORY_LIMIT = 100;
const MAX_DRIVER_HISTORY_LIMIT = 1000;

const DEFAULT_ORDER_HISTORY_LIMIT = 500;
const MAX_ORDER_HISTORY_LIMIT = 2000;

/*
 * Une position est considérée comme "fraîche"
 * pendant 2 minutes par défaut.
 *
 * Cette valeur pourra ensuite être déplacée dans .env.
 */
const GPS_FRESHNESS_MS = 2 * 60 * 1000;

/* ============================================================
   UTILITAIRES
============================================================ */

function parsePositiveInteger(value) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function parseOptionalNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseLimit(
  value,
  defaultValue,
  maxValue
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return Math.min(
    parsed,
    maxValue
  );
}

function isValidLatitude(value) {
  const latitude = Number(value);

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function isValidLongitude(value) {
  const longitude = Number(value);

  return (
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/* ============================================================
   GPS FRESHNESS
============================================================ */

function getLocationFreshness(
  recordedAt
) {
  if (!recordedAt) {
    return {
      is_fresh: false,
      is_stale: true,
      age_seconds: null,
      freshness_threshold_seconds:
        Math.floor(
          GPS_FRESHNESS_MS / 1000
        ),
    };
  }

  const recordedTime =
    new Date(
      recordedAt
    ).getTime();

  if (
    Number.isNaN(
      recordedTime
    )
  ) {
    return {
      is_fresh: false,
      is_stale: true,
      age_seconds: null,
      freshness_threshold_seconds:
        Math.floor(
          GPS_FRESHNESS_MS / 1000
        ),
    };
  }

  const now =
    Date.now();

  const ageMs =
    Math.max(
      now - recordedTime,
      0
    );

  const ageSeconds =
    Math.floor(
      ageMs / 1000
    );

  const isFresh =
    ageMs <=
    GPS_FRESHNESS_MS;

  return {
    is_fresh:
      isFresh,

    is_stale:
      !isFresh,

    age_seconds:
      ageSeconds,

    freshness_threshold_seconds:
      Math.floor(
        GPS_FRESHNESS_MS /
          1000
      ),
  };
}

/* ============================================================
   RÉCUPÉRER LE DRIVER AUTHENTIFIÉ
============================================================ */

async function getAuthenticatedDriver(
  req
) {
  if (
    !req.user ||
    req.user.role !== "driver"
  ) {
    return null;
  }

  const userId =
    parsePositiveInteger(
      req.user.id
    );

  if (!userId) {
    return null;
  }

  return TrackingModel.getDriverByUserId(
    userId
  );
}

/* ============================================================
   RÉCUPÉRER LE CLIENT AUTHENTIFIÉ
============================================================ */

async function getAuthenticatedClient(
  req
) {
  if (
    !req.user ||
    req.user.role !== "client"
  ) {
    return null;
  }

  const userId =
    parsePositiveInteger(
      req.user.id
    );

  if (!userId) {
    return null;
  }

  return TrackingModel.getClientByUserId(
    userId
  );
}

/* ============================================================
   AUTORISATION D'ACCÈS À UN DRIVER
============================================================ */

async function authorizeDriverAccess(
  req,
  requestedDriverId
) {
  const role =
    req.user?.role;

  /*
   * Super admin et dispatcher :
   * accès aux chauffeurs.
   */
  if (
    role === "super_admin" ||
    role === "dispatcher"
  ) {
    return {
      authorized: true,
      driver: null,
    };
  }

  /*
   * Chauffeur :
   * accès uniquement à lui-même.
   */
  if (role === "driver") {
    const authenticatedDriver =
      await getAuthenticatedDriver(
        req
      );

    if (
      !authenticatedDriver
    ) {
      return {
        authorized: false,
        status: 403,
        message:
          "Aucun profil chauffeur n'est associé à ce compte.",
      };
    }

    if (
      Number(
        authenticatedDriver.id
      ) !==
      Number(
        requestedDriverId
      )
    ) {
      return {
        authorized: false,
        status: 403,
        message:
          "Vous n'êtes pas autorisé à consulter les données GPS de ce chauffeur.",
      };
    }

    return {
      authorized: true,
      driver:
        authenticatedDriver,
    };
  }

  return {
    authorized: false,
    status: 403,
    message:
      "Accès refusé.",
  };
}

/* ============================================================
   AUTORISATION D'ACCÈS À UNE COMMANDE
============================================================ */

async function authorizeOrderAccess(
  req,
  order
) {
  const role =
    req.user?.role;

  /*
   * Administration.
   */
  if (
    role === "super_admin" ||
    role === "dispatcher"
  ) {
    return {
      authorized: true,
    };
  }

  /*
   * Chauffeur.
   *
   * La commande doit être assignée
   * au chauffeur réellement lié au JWT.
   */
  if (role === "driver") {
    const driver =
      await getAuthenticatedDriver(
        req
      );

    if (!driver) {
      return {
        authorized: false,
        status: 403,
        message:
          "Aucun profil chauffeur n'est associé à ce compte.",
      };
    }

    if (
      !order.driver_id ||
      Number(
        order.driver_id
      ) !==
        Number(
          driver.id
        )
    ) {
      return {
        authorized: false,
        status: 403,
        message:
          "Vous n'êtes pas autorisé à consulter cette commande.",
      };
    }

    return {
      authorized: true,
      driver,
    };
  }

  /*
   * Client.
   *
   * On ne fait JAMAIS confiance à un client_id
   * envoyé par le frontend.
   *
   * JWT users.id
   *      ↓
   * clients.user_id
   *      ↓
   * clients.id
   *      ↓
   * orders.client_id
   */
  if (role === "client") {
    const client =
      await getAuthenticatedClient(
        req
      );

    if (!client) {
      /*
       * On évite d'exposer des informations
       * supplémentaires concernant la commande.
       */
      return {
        authorized: false,
        status: 404,
        message:
          "Commande introuvable.",
      };
    }

    if (
      Number(
        order.client_id
      ) !==
      Number(
        client.id
      )
    ) {
      /*
       * 404 volontaire pour éviter qu'un client
       * puisse tester des orderId et déterminer
       * quelles commandes existent.
       */
      return {
        authorized: false,
        status: 404,
        message:
          "Commande introuvable.",
      };
    }

    return {
      authorized: true,
      client,
    };
  }

  return {
    authorized: false,
    status: 403,
    message:
      "Accès refusé.",
  };
}

/* ============================================================
   POST /api/tracking/location

   ENREGISTRER UNE POSITION GPS
============================================================ */

async function createLocation(
  req,
  res
) {
  try {
    const {
      driver_id,
      order_id,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      battery_level,
      recorded_at,
    } = req.body || {};

    const role =
      req.user?.role;

    /* --------------------------------------------------------
       DRIVER
    -------------------------------------------------------- */

    let driverId = null;
    let driver = null;

    /*
     * IMPORTANT :
     *
     * Pour un chauffeur, driver_id envoyé par le frontend
     * n'est PAS une source de confiance.
     *
     * On récupère le vrai driver_id à partir du JWT.
     */
    if (role === "driver") {
      driver =
        await getAuthenticatedDriver(
          req
        );

      if (!driver) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Aucun profil chauffeur n'est associé à ce compte.",
          });
      }

      driverId =
        Number(
          driver.id
        );

      /*
       * Si le frontend envoie quand même driver_id,
       * on vérifie qu'il correspond réellement.
       *
       * Cela permet de détecter une tentative
       * d'usurpation ou un frontend mal configuré.
       */
      if (
        driver_id !== undefined &&
        driver_id !== null &&
        driver_id !== ""
      ) {
        const suppliedDriverId =
          parsePositiveInteger(
            driver_id
          );

        if (
          !suppliedDriverId ||
          suppliedDriverId !==
            driverId
        ) {
          return res
            .status(403)
            .json({
              success: false,

              message:
                "Le chauffeur indiqué ne correspond pas au compte authentifié.",
            });
        }
      }
    } else {
      /*
       * Super admin / dispatcher.
       *
       * On conserve le fonctionnement existant :
       * driver_id doit être fourni.
       */
      driverId =
        parsePositiveInteger(
          driver_id
        );

      if (!driverId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "driver_id est obligatoire et invalide.",
          });
      }

      driver =
        await TrackingModel.driverExists(
          driverId
        );

      if (!driver) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Chauffeur introuvable.",
          });
      }
    }

    /* --------------------------------------------------------
       GPS
    -------------------------------------------------------- */

    if (
      !isValidLatitude(
        latitude
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Latitude invalide.",
        });
    }

    if (
      !isValidLongitude(
        longitude
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Longitude invalide.",
        });
    }

    /* --------------------------------------------------------
       ORDER OPTIONNEL
    -------------------------------------------------------- */

    let orderId = null;
    let order = null;

    if (
      order_id !== undefined &&
      order_id !== null &&
      order_id !== ""
    ) {
      orderId =
        parsePositiveInteger(
          order_id
        );

      if (!orderId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "order_id invalide.",
          });
      }

      order =
        await TrackingModel.orderExists(
          orderId
        );

      if (!order) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Commande introuvable.",
          });
      }

      /*
       * Pour un chauffeur connecté :
       * la commande doit réellement lui être assignée.
       */
      if (
        role === "driver"
      ) {
        if (
          !order.driver_id ||
          Number(
            order.driver_id
          ) !== driverId
        ) {
          return res
            .status(403)
            .json({
              success: false,

              message:
                "Cette commande n'est pas assignée à ce chauffeur.",
            });
        }
      } else {
        /*
         * On conserve également la protection existante
         * pour admin / dispatcher.
         */
        if (
          order.driver_id !== null &&
          order.driver_id !== undefined &&
          Number(
            order.driver_id
          ) !== driverId
        ) {
          return res
            .status(403)
            .json({
              success: false,

              message:
                "Cette commande est assignée à un autre chauffeur.",
            });
        }
      }
    }

    /* --------------------------------------------------------
       DONNÉES OPTIONNELLES
    -------------------------------------------------------- */

    const parsedSpeed =
      parseOptionalNumber(
        speed
      );

    const parsedHeading =
      parseOptionalNumber(
        heading
      );

    const parsedAccuracy =
      parseOptionalNumber(
        accuracy
      );

    const parsedBatteryLevel =
      parseOptionalNumber(
        battery_level
      );

    if (
      parsedSpeed !== null &&
      parsedSpeed < 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "La vitesse ne peut pas être négative.",
        });
    }

    if (
      parsedHeading !== null &&
      (
        parsedHeading < 0 ||
        parsedHeading > 360
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le heading doit être compris entre 0 et 360.",
        });
    }

    if (
      parsedAccuracy !== null &&
      parsedAccuracy < 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "La précision GPS ne peut pas être négative.",
        });
    }

    if (
      parsedBatteryLevel !== null &&
      (
        parsedBatteryLevel < 0 ||
        parsedBatteryLevel > 100
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le niveau de batterie doit être compris entre 0 et 100.",
        });
    }

    /* --------------------------------------------------------
       DATE GPS
    -------------------------------------------------------- */

    let recordedAt =
      new Date();

    if (recorded_at) {
      const parsedDate =
        new Date(
          recorded_at
        );

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "recorded_at est invalide.",
          });
      }

      /*
       * Protection contre une date GPS située
       * trop loin dans le futur.
       *
       * Une position future pourrait autrement devenir
       * artificiellement la "dernière position" pendant
       * une longue période.
       */
      const maxFutureTimestamp =
        Date.now() +
        5 * 60 * 1000;

      if (
        parsedDate.getTime() >
        maxFutureTimestamp
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "recorded_at ne peut pas être situé dans le futur.",
          });
      }

      recordedAt =
        parsedDate;
    }

    /* --------------------------------------------------------
       INSERTION MYSQL
    -------------------------------------------------------- */

    const locationId =
      await TrackingModel.createLocation({
        driver_id:
          driverId,

        order_id:
          orderId,

        latitude:
          Number(
            latitude
          ),

        longitude:
          Number(
            longitude
          ),

        speed:
          parsedSpeed,

        heading:
          parsedHeading,

        accuracy:
          parsedAccuracy,

        battery_level:
          parsedBatteryLevel,

        recorded_at:
          recordedAt,
      });

    /* --------------------------------------------------------
       LAST SEEN
    -------------------------------------------------------- */

    await TrackingModel.updateDriverLastSeen(
      driverId
    );

    /* --------------------------------------------------------
       PAYLOAD
    -------------------------------------------------------- */

    const location = {
      id:
        locationId,

      driver_id:
        driverId,

      order_id:
        orderId,

      latitude:
        Number(
          latitude
        ),

      longitude:
        Number(
          longitude
        ),

      speed:
        parsedSpeed,

      heading:
        parsedHeading,

      accuracy:
        parsedAccuracy,

      battery_level:
        parsedBatteryLevel,

      recorded_at:
        recordedAt.toISOString(),
    };

    const freshness =
      getLocationFreshness(
        location.recorded_at
      );

    /* --------------------------------------------------------
       SOCKET.IO
    -------------------------------------------------------- */

    const io =
      req.app.get("io");

    if (io) {
      /*
       * Carte globale admin / dispatcher.
       */
      io.to(
        "tracking"
      ).emit(
        "driver:location",
        {
          ...location,
          freshness,
        }
      );

      /*
       * Canal spécifique chauffeur.
       */
      io.to(
        `driver:${driverId}`
      ).emit(
        "driver:location",
        {
          ...location,
          freshness,
        }
      );

      /*
       * Canal spécifique commande.
       */
      if (orderId) {
        io.to(
          `order:${orderId}`
        ).emit(
          "order:location",
          {
            ...location,
            freshness,
          }
        );
      }
    }

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Position GPS enregistrée avec succès.",

        location,

        freshness,

        data:
          location,
      });
  } catch (error) {
    console.error(
      "Erreur createLocation :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible d'enregistrer la position GPS.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   GET /api/tracking/drivers

   DERNIÈRES POSITIONS DE TOUS LES CHAUFFEURS
============================================================ */

async function getLatestLocations(
  req,
  res
) {
  try {
    const locations =
      await TrackingModel.getLatestLocations();

    /*
     * Ajout de l'état fresh / stale
     * sans supprimer aucune donnée existante.
     */
    const enrichedLocations =
      locations.map(
        (location) => ({
          ...location,

          freshness:
            getLocationFreshness(
              location.recorded_at
            ),
        })
      );

    return res
      .status(200)
      .json({
        success: true,

        count:
          enrichedLocations.length,

        locations:
          enrichedLocations,

        data:
          enrichedLocations,
      });
  } catch (error) {
    console.error(
      "Erreur getLatestLocations :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible de récupérer les positions des chauffeurs.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   GET /api/tracking/drivers/:driverId/latest

   DERNIÈRE POSITION D'UN CHAUFFEUR
============================================================ */

async function getLatestDriverLocation(
  req,
  res
) {
  try {
    const driverId =
      parsePositiveInteger(
        req.params.driverId
      );

    if (!driverId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Identifiant chauffeur invalide.",
        });
    }

    const driver =
      await TrackingModel.driverExists(
        driverId
      );

    if (!driver) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Chauffeur introuvable.",
        });
    }

    /* --------------------------------------------------------
       AUTORISATION
    -------------------------------------------------------- */

    const authorization =
      await authorizeDriverAccess(
        req,
        driverId
      );

    if (
      !authorization.authorized
    ) {
      return res
        .status(
          authorization.status ||
          403
        )
        .json({
          success: false,

          message:
            authorization.message ||
            "Accès refusé.",
        });
    }

    const location =
      await TrackingModel.getLatestDriverLocation(
        driverId
      );

    if (!location) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Aucune position GPS trouvée pour ce chauffeur.",
        });
    }

    const freshness =
      getLocationFreshness(
        location.recorded_at
      );

    return res
      .status(200)
      .json({
        success: true,

        location: {
          ...location,
          freshness,
        },

        freshness,

        data: {
          ...location,
          freshness,
        },
      });
  } catch (error) {
    console.error(
      "Erreur getLatestDriverLocation :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible de récupérer la dernière position du chauffeur.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   GET /api/tracking/drivers/:driverId/history

   HISTORIQUE GPS D'UN CHAUFFEUR
============================================================ */

async function getDriverLocationHistory(
  req,
  res
) {
  try {
    const driverId =
      parsePositiveInteger(
        req.params.driverId
      );

    if (!driverId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Identifiant chauffeur invalide.",
        });
    }

    const driver =
      await TrackingModel.driverExists(
        driverId
      );

    if (!driver) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Chauffeur introuvable.",
        });
    }

    /* --------------------------------------------------------
       AUTORISATION
    -------------------------------------------------------- */

    const authorization =
      await authorizeDriverAccess(
        req,
        driverId
      );

    if (
      !authorization.authorized
    ) {
      return res
        .status(
          authorization.status ||
          403
        )
        .json({
          success: false,

          message:
            authorization.message ||
            "Accès refusé.",
        });
    }

    /* --------------------------------------------------------
       LIMIT
    -------------------------------------------------------- */

    const limit =
      parseLimit(
        req.query.limit,
        DEFAULT_DRIVER_HISTORY_LIMIT,
        MAX_DRIVER_HISTORY_LIMIT
      );

    if (!limit) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "La limite demandée est invalide.",
        });
    }

    const locations =
      await TrackingModel.getDriverLocationHistory(
        driverId,
        limit
      );

    return res
      .status(200)
      .json({
        success: true,

        driver_id:
          driverId,

        count:
          locations.length,

        limit,

        locations,

        data:
          locations,
      });
  } catch (error) {
    console.error(
      "Erreur getDriverLocationHistory :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible de récupérer l'historique GPS du chauffeur.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   GET /api/tracking/orders/:orderId/latest

   DERNIÈRE POSITION D'UNE COMMANDE
============================================================ */

async function getLatestOrderLocation(
  req,
  res
) {
  try {
    const orderId =
      parsePositiveInteger(
        req.params.orderId
      );

    if (!orderId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Identifiant commande invalide.",
        });
    }

    const order =
      await TrackingModel.orderExists(
        orderId
      );

    if (!order) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Commande introuvable.",
        });
    }

    /* --------------------------------------------------------
       AUTORISATION
    -------------------------------------------------------- */

    const authorization =
      await authorizeOrderAccess(
        req,
        order
      );

    if (
      !authorization.authorized
    ) {
      return res
        .status(
          authorization.status ||
          403
        )
        .json({
          success: false,

          message:
            authorization.message ||
            "Accès refusé.",
        });
    }

    const location =
      await TrackingModel.getLatestOrderLocation(
        orderId
      );

    if (!location) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Aucune position GPS disponible pour cette commande.",
        });
    }

    const freshness =
      getLocationFreshness(
        location.recorded_at
      );

    const enrichedLocation = {
      ...location,
      freshness,
    };

    return res
      .status(200)
      .json({
        success: true,

        order_id:
          orderId,

        order_number:
          order.order_number,

        location:
          enrichedLocation,

        freshness,

        data:
          enrichedLocation,
      });
  } catch (error) {
    console.error(
      "Erreur getLatestOrderLocation :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible de récupérer la dernière position de la commande.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   GET /api/tracking/orders/:orderId/history

   HISTORIQUE GPS D'UNE COMMANDE
============================================================ */

async function getOrderLocationHistory(
  req,
  res
) {
  try {
    const orderId =
      parsePositiveInteger(
        req.params.orderId
      );

    if (!orderId) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Identifiant commande invalide.",
        });
    }

    const order =
      await TrackingModel.orderExists(
        orderId
      );

    if (!order) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Commande introuvable.",
        });
    }

    /* --------------------------------------------------------
       AUTORISATION
    -------------------------------------------------------- */

    const authorization =
      await authorizeOrderAccess(
        req,
        order
      );

    if (
      !authorization.authorized
    ) {
      return res
        .status(
          authorization.status ||
          403
        )
        .json({
          success: false,

          message:
            authorization.message ||
            "Accès refusé.",
        });
    }

    /* --------------------------------------------------------
       LIMIT
    -------------------------------------------------------- */

    const limit =
      parseLimit(
        req.query.limit,
        DEFAULT_ORDER_HISTORY_LIMIT,
        MAX_ORDER_HISTORY_LIMIT
      );

    if (!limit) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "La limite demandée est invalide.",
        });
    }

    const locations =
      await TrackingModel.getOrderLocationHistory(
        orderId,
        limit
      );

    return res
      .status(200)
      .json({
        success: true,

        order_id:
          orderId,

        order_number:
          order.order_number,

        count:
          locations.length,

        limit,

        locations,

        data:
          locations,
      });
  } catch (error) {
    console.error(
      "Erreur getOrderLocationHistory :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible de récupérer l'historique GPS de la commande.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   DELETE /api/tracking/cleanup

   SUPPRIMER LES ANCIENNES POSITIONS
============================================================ */

async function deleteOldLocations(
  req,
  res
) {
  try {
    const rawDays =
      req.body?.days ??
      req.query?.days ??
      30;

    const days =
      Number(
        rawDays
      );

    if (
      !Number.isInteger(days) ||
      days <= 0
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le nombre de jours doit être supérieur à zéro.",
        });
    }

    /*
     * Protection contre une valeur absurde.
     *
     * 3650 = 10 ans.
     */
    if (
      days > 3650
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Le nombre de jours demandé est trop élevé.",
        });
    }

    const result =
      await TrackingModel.deleteOldLocations(
        days
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Anciennes positions GPS supprimées.",

        deleted:
          result.affectedRows,
      });
  } catch (error) {
    console.error(
      "Erreur deleteOldLocations :",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Impossible de supprimer les anciennes positions GPS.",

        error:
          process.env.NODE_ENV ===
          "production"
            ? undefined
            : error.message,
      });
  }
}

/* ============================================================
   EXPORTS

   Ces noms correspondent exactement
   à trackingRoutes.js.
============================================================ */

module.exports = {
  createLocation,

  getLatestLocations,

  getLatestDriverLocation,

  getDriverLocationHistory,

  getLatestOrderLocation,

  getOrderLocationHistory,

  deleteOldLocations,
};