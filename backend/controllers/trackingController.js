const TrackingModel = require("../models/trackingModel");

/* ============================================================
   UTILITAIRES
============================================================ */

function parsePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
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
   POST /api/tracking/location

   ENREGISTRER UNE POSITION GPS
============================================================ */

async function createLocation(req, res) {
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

    /* --------------------------------------------------------
       DRIVER
    -------------------------------------------------------- */

    const driverId =
      parsePositiveInteger(driver_id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "driver_id est obligatoire et invalide.",
      });
    }

    const driver =
      await TrackingModel.driverExists(
        driverId
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    /* --------------------------------------------------------
       GPS
    -------------------------------------------------------- */

    if (!isValidLatitude(latitude)) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude invalide.",
      });
    }

    if (!isValidLongitude(longitude)) {
      return res.status(400).json({
        success: false,
        message:
          "Longitude invalide.",
      });
    }

    /* --------------------------------------------------------
       ORDER OPTIONNEL
    -------------------------------------------------------- */

    let orderId = null;

    if (
      order_id !== undefined &&
      order_id !== null &&
      order_id !== ""
    ) {
      orderId =
        parsePositiveInteger(order_id);

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message:
            "order_id invalide.",
        });
      }

      const order =
        await TrackingModel.orderExists(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Commande introuvable.",
        });
      }

      /*
       * Si la commande possède déjà un chauffeur,
       * empêcher un autre chauffeur d'envoyer sa position.
       */

      if (
        order.driver_id !== null &&
        order.driver_id !== undefined &&
        Number(order.driver_id) !==
          driverId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Cette commande est assignée à un autre chauffeur.",
        });
      }
    }

    /* --------------------------------------------------------
       DONNÉES OPTIONNELLES
    -------------------------------------------------------- */

    const parsedSpeed =
      parseOptionalNumber(speed);

    const parsedHeading =
      parseOptionalNumber(heading);

    const parsedAccuracy =
      parseOptionalNumber(accuracy);

    const parsedBatteryLevel =
      parseOptionalNumber(
        battery_level
      );

    if (
      parsedSpeed !== null &&
      parsedSpeed < 0
    ) {
      return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message:
          "Le heading doit être compris entre 0 et 360.",
      });
    }

    if (
      parsedAccuracy !== null &&
      parsedAccuracy < 0
    ) {
      return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message:
          "Le niveau de batterie doit être compris entre 0 et 100.",
      });
    }

    /* --------------------------------------------------------
       DATE GPS
    -------------------------------------------------------- */

    let recordedAt = new Date();

    if (recorded_at) {
      const parsedDate =
        new Date(recorded_at);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "recorded_at est invalide.",
        });
      }

      recordedAt = parsedDate;
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
          Number(latitude),

        longitude:
          Number(longitude),

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
        Number(latitude),

      longitude:
        Number(longitude),

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

    /* --------------------------------------------------------
       SOCKET.IO
    -------------------------------------------------------- */

    const io =
      req.app.get("io");

    if (io) {
      /*
       * Carte globale admin.
       */

      io.to("tracking").emit(
        "driver:location",
        location
      );

      /*
       * Canal spécifique chauffeur.
       */

      io.to(
        `driver:${driverId}`
      ).emit(
        "driver:location",
        location
      );

      /*
       * Canal spécifique commande.
       */

      if (orderId) {
        io.to(
          `order:${orderId}`
        ).emit(
          "order:location",
          location
        );
      }
    }

    return res.status(201).json({
      success: true,

      message:
        "Position GPS enregistrée avec succès.",

      location,

      data:
        location,
    });
  } catch (error) {
    console.error(
      "Erreur createLocation :",
      error
    );

    return res.status(500).json({
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

    return res.status(200).json({
      success: true,

      count:
        locations.length,

      locations,

      data:
        locations,
    });
  } catch (error) {
    console.error(
      "Erreur getLatestLocations :",
      error
    );

    return res.status(500).json({
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
      return res.status(400).json({
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
      return res.status(404).json({
        success: false,

        message:
          "Chauffeur introuvable.",
      });
    }

    const location =
      await TrackingModel.getLatestDriverLocation(
        driverId
      );

    if (!location) {
      return res.status(404).json({
        success: false,

        message:
          "Aucune position GPS trouvée pour ce chauffeur.",
      });
    }

    return res.status(200).json({
      success: true,

      location,

      data:
        location,
    });
  } catch (error) {
    console.error(
      "Erreur getLatestDriverLocation :",
      error
    );

    return res.status(500).json({
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
      return res.status(400).json({
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
      return res.status(404).json({
        success: false,

        message:
          "Chauffeur introuvable.",
      });
    }

    const limit =
      Number(req.query.limit) ||
      100;

    const locations =
      await TrackingModel.getDriverLocationHistory(
        driverId,
        limit
      );

    return res.status(200).json({
      success: true,

      driver_id:
        driverId,

      count:
        locations.length,

      locations,

      data:
        locations,
    });
  } catch (error) {
    console.error(
      "Erreur getDriverLocationHistory :",
      error
    );

    return res.status(500).json({
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
      return res.status(400).json({
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
      return res.status(404).json({
        success: false,

        message:
          "Commande introuvable.",
      });
    }

    const location =
      await TrackingModel.getLatestOrderLocation(
        orderId
      );

    if (!location) {
      return res.status(404).json({
        success: false,

        message:
          "Aucune position GPS disponible pour cette commande.",
      });
    }

    return res.status(200).json({
      success: true,

      order_id:
        orderId,

      order_number:
        order.order_number,

      location,

      data:
        location,
    });
  } catch (error) {
    console.error(
      "Erreur getLatestOrderLocation :",
      error
    );

    return res.status(500).json({
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
      return res.status(400).json({
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
      return res.status(404).json({
        success: false,

        message:
          "Commande introuvable.",
      });
    }

    const limit =
      Number(req.query.limit) ||
      500;

    const locations =
      await TrackingModel.getOrderLocationHistory(
        orderId,
        limit
      );

    return res.status(200).json({
      success: true,

      order_id:
        orderId,

      order_number:
        order.order_number,

      count:
        locations.length,

      locations,

      data:
        locations,
    });
  } catch (error) {
    console.error(
      "Erreur getOrderLocationHistory :",
      error
    );

    return res.status(500).json({
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
    const days =
      Number(
        req.body?.days ||
        req.query?.days ||
        30
      );

    if (
      !Number.isInteger(days) ||
      days <= 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Le nombre de jours doit être supérieur à zéro.",
      });
    }

    const result =
      await TrackingModel.deleteOldLocations(
        days
      );

    return res.status(200).json({
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

    return res.status(500).json({
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

   IMPORTANT :
   Ces noms doivent être EXACTEMENT les mêmes que ceux
   utilisés dans trackingRoutes.js.
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