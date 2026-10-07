const DriverModel = require("../models/driverModel");

const {
  notifyAdmin,
  notifyUser,
} = require("../services/notificationService");

/* =====================================================
   UTILITAIRES
===================================================== */

function parseDriverId(value) {
  const driverId = Number(value);

  if (
    !Number.isInteger(driverId) ||
    driverId <= 0
  ) {
    return null;
  }

  return driverId;
}

function parseVehicleId(value) {
  const vehicleId = Number(value);

  if (
    !Number.isInteger(vehicleId) ||
    vehicleId <= 0
  ) {
    return null;
  }

  return vehicleId;
}

function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function getDriverDisplayName(driver) {
  if (!driver) {
    return "Chauffeur";
  }

  const fullName = [
    driver.first_name,
    driver.last_name,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    cleanText(driver.name) ||
    cleanText(driver.full_name) ||
    cleanText(driver.email) ||
    `Chauffeur #${driver.id || ""}`.trim()
  );
}

function getVehicleDisplayName(vehicle) {
  if (!vehicle) {
    return "Véhicule";
  }

  return (
    cleanText(vehicle.name) ||
    cleanText(vehicle.vehicle_name) ||
    cleanText(vehicle.make_model) ||
    [
      cleanText(vehicle.make),
      cleanText(vehicle.model),
    ]
      .filter(Boolean)
      .join(" ") ||
    `Véhicule #${vehicle.id || ""}`.trim()
  );
}

async function safelyNotify(
  callback,
  context,
) {
  try {
    await callback();
  } catch (error) {
    console.error(
      `Erreur notification ${context} :`,
      error,
    );
  }
}

/* =====================================================
   GET ALL DRIVERS
===================================================== */

exports.getDrivers = async (req, res) => {
  try {
    const drivers =
      await DriverModel.getAllDrivers();

    return res.status(200).json({
      success: true,
      count: drivers.length,
      message:
        "Liste des chauffeurs récupérée avec succès.",
      drivers,
      data: drivers,
    });
  } catch (error) {
    console.error(
      "Erreur getDrivers :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des chauffeurs.",
      error: error.message,
    });
  }
};

/* =====================================================
   GET CURRENT DRIVER
   GET /api/drivers/me
===================================================== */

exports.getCurrentDriver = async (
  req,
  res,
) => {
  try {
    const userId = Number(
      req.user?.id ||
        req.user?.user_id,
    );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const driver =
      await DriverModel.getDriverByUserId(
        userId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun profil chauffeur associé à cet utilisateur.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Profil chauffeur récupéré avec succès.",
      driver,
      data: driver,
    });
  } catch (error) {
    console.error(
      "Erreur getCurrentDriver :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer le profil chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   GET DRIVER BY ID
===================================================== */

exports.getDriver = async (req, res) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const driver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Chauffeur récupéré avec succès.",
      driver,
      data: driver,
    });
  } catch (error) {
    console.error(
      "Erreur getDriver :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   CREATE DRIVER
===================================================== */

exports.createDriver = async (
  req,
  res,
) => {
  try {
    const {
      user_id,
      phone,
      profile_photo_url,
      availability_status,

      license_number,
      license_expiry,

      address,
      city,
      province,
      postal_code,

      emergency_contact_name,
      emergency_contact_phone,

      onfleet_worker_id,
    } = req.body;

    const userId = Number(user_id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "user_id est obligatoire et doit être valide.",
      });
    }

    const user =
      await DriverModel.checkUserIsDriver(
        userId,
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Utilisateur introuvable.",
      });
    }

    if (user.role !== "driver") {
      return res.status(400).json({
        success: false,
        message:
          "Cet utilisateur n'a pas le rôle driver.",
      });
    }

    const existingDriver =
      await DriverModel.checkDriverExistsForUser(
        userId,
      );

    if (existingDriver) {
      return res.status(409).json({
        success: false,
        message:
          "Ce chauffeur existe déjà pour cet utilisateur.",
      });
    }

    const allowedAvailabilityStatuses = [
      "available",
      "busy",
      "offline",
      "on_break",
    ];

    const normalizedAvailabilityStatus =
      allowedAvailabilityStatuses.includes(
        availability_status,
      )
        ? availability_status
        : "offline";

    const driverId =
      await DriverModel.createDriver({
        user_id: userId,

        phone: phone || null,

        profile_photo_url:
          profile_photo_url || null,

        availability_status:
          normalizedAvailabilityStatus,

        license_number:
          license_number || null,

        license_expiry:
          license_expiry || null,

        address:
          address || null,

        city:
          city || null,

        province:
          province || null,

        postal_code:
          postal_code || null,

        emergency_contact_name:
          emergency_contact_name || null,

        emergency_contact_phone:
          emergency_contact_phone || null,

        onfleet_worker_id:
          onfleet_worker_id || null,
      });

    const driver =
      await DriverModel.getDriverById(
        driverId,
      );

    const io =
      req.app.get("io");

    const driverName =
      getDriverDisplayName(
        driver,
      );

    await safelyNotify(
      () =>
        notifyAdmin({
          io,

          type:
            "driver_created",

          level:
            "success",

          title:
            "Nouveau chauffeur créé",

          message:
            `${driverName} a été ajouté aux chauffeurs Glory Solutions.`,

          entityType:
            "driver",

          entityId:
            driverId,

          actionUrl:
            `/dashboard/admin/drivers/${driverId}`,

          email:
            true,
        }),
      "création chauffeur → admin",
    );

    await safelyNotify(
      () =>
        notifyUser(
          userId,
          {
            io,

            type:
              "driver_account_created",

            level:
              "success",

            title:
              "Votre profil chauffeur est prêt",

            message:
              "Votre profil chauffeur Glory Solutions a été créé avec succès.",

            entityType:
              "driver",

            entityId:
              driverId,

            actionUrl:
              "/dashboard/driver",

            email:
              true,
          },
        ),
      "création chauffeur → chauffeur",
    );

    return res.status(201).json({
      success: true,
      message:
        "Chauffeur créé avec succès.",
      driver,
      data: driver,
    });
  } catch (error) {
    console.error(
      "Erreur createDriver :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la création du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE DRIVER
===================================================== */

exports.updateDriver = async (
  req,
  res,
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const existingDriver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const allowedAvailabilityStatuses = [
      "available",
      "busy",
      "offline",
      "on_break",
    ];

    const updateData = {
      ...req.body,
    };

    if (
      updateData.availability_status &&
      !allowedAvailabilityStatuses.includes(
        updateData.availability_status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Statut de disponibilité invalide.",
      });
    }

    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    delete updateData.updated_at;

    delete updateData.vehicle_name;
    delete updateData.vehicle_plate;
    delete updateData.vehicle_id;

    const result =
      await DriverModel.updateDriver(
        driverId,
        updateData,
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable ou aucune modification effectuée.",
      });
    }

    const updatedDriver =
      await DriverModel.getDriverById(
        driverId,
      );

    const io =
      req.app.get("io");

    const driverName =
      getDriverDisplayName(
        updatedDriver,
      );

    const oldStatus =
      cleanText(
        existingDriver.availability_status,
      );

    const newStatus =
      cleanText(
        updatedDriver?.availability_status,
      );

    const statusChanged =
      oldStatus &&
      newStatus &&
      oldStatus !== newStatus;

    await safelyNotify(
      () =>
        notifyAdmin({
          io,

          type:
            statusChanged
              ? "driver_status_changed"
              : "driver_updated",

          level:
            statusChanged
              ? "info"
              : "success",

          title:
            statusChanged
              ? "Statut chauffeur modifié"
              : "Chauffeur modifié",

          message:
            statusChanged
              ? `${driverName} est passé de "${oldStatus}" à "${newStatus}".`
              : `Le profil de ${driverName} a été mis à jour.`,

          entityType:
            "driver",

          entityId:
            driverId,

          actionUrl:
            `/dashboard/admin/drivers/${driverId}`,

          email:
            true,
        }),
      "mise à jour chauffeur → admin",
    );

    if (
      updatedDriver?.user_id
    ) {
      await safelyNotify(
        () =>
          notifyUser(
            Number(
              updatedDriver.user_id,
            ),
            {
              io,

              type:
                statusChanged
                  ? "driver_status_changed"
                  : "driver_profile_updated",

              level:
                "info",

              title:
                statusChanged
                  ? "Votre disponibilité a changé"
                  : "Votre profil a été mis à jour",

              message:
                statusChanged
                  ? `Votre statut est maintenant "${newStatus}".`
                  : "Votre profil chauffeur Glory Solutions a été mis à jour.",

              entityType:
                "driver",

              entityId:
                driverId,

              actionUrl:
                "/dashboard/driver",

              email:
                true,
            },
          ),
        "mise à jour chauffeur → chauffeur",
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Chauffeur modifié avec succès.",
      driver:
        updatedDriver,
      data:
        updatedDriver,
    });
  } catch (error) {
    console.error(
      "Erreur updateDriver :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE DRIVER
===================================================== */

exports.deleteDriver = async (
  req,
  res,
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const existingDriver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const result =
      await DriverModel.deleteDriver(
        driverId,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const io =
      req.app.get("io");

    const driverName =
      getDriverDisplayName(
        existingDriver,
      );

    await safelyNotify(
      () =>
        notifyAdmin({
          io,

          type:
            "driver_deleted",

          level:
            "warning",

          title:
            "Chauffeur supprimé",

          message:
            `${driverName} a été supprimé de la liste des chauffeurs.`,

          entityType:
            "driver",

          entityId:
            driverId,

          actionUrl:
            "/dashboard/admin/drivers",

          email:
            true,
        }),
      "suppression chauffeur → admin",
    );

    return res.status(200).json({
      success: true,
      message:
        "Chauffeur supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteDriver :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   GET VEHICLE OF DRIVER
===================================================== */

exports.getDriverVehicle = async (
  req,
  res,
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const driver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const vehicle =
      await DriverModel.getDriverVehicle(
        driverId,
      );

    return res.status(200).json({
      success: true,
      vehicle,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Erreur getDriverVehicle :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer le véhicule du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   ASSIGN VEHICLE TO DRIVER
===================================================== */

exports.assignVehicle = async (
  req,
  res,
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    const vehicleId =
      parseVehicleId(
        req.body.vehicle_id,
      );

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message:
          "vehicle_id est obligatoire et doit être valide.",
      });
    }

    const driver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const result =
      await DriverModel.assignVehicle(
        driverId,
        vehicleId,
      );

    if (
      result.affectedRows === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Véhicule introuvable.",
      });
    }

    const vehicle =
      await DriverModel.getDriverVehicle(
        driverId,
      );

    const io =
      req.app.get("io");

    const driverName =
      getDriverDisplayName(
        driver,
      );

    const vehicleName =
      getVehicleDisplayName(
        vehicle,
      );

    await safelyNotify(
      () =>
        notifyAdmin({
          io,

          type:
            "driver_vehicle_assigned",

          level:
            "success",

          title:
            "Véhicule assigné",

          message:
            `${vehicleName} a été assigné à ${driverName}.`,

          entityType:
            "driver",

          entityId:
            driverId,

          actionUrl:
            `/dashboard/admin/drivers/${driverId}`,

          email:
            true,
        }),
      "assignation véhicule → admin",
    );

    if (
      driver?.user_id
    ) {
      await safelyNotify(
        () =>
          notifyUser(
            Number(
              driver.user_id,
            ),
            {
              io,

              type:
                "vehicle_assigned",

              level:
                "success",

              title:
                "Un véhicule vous a été assigné",

              message:
                `${vehicleName} vous a été assigné.`,

              entityType:
                "driver",

              entityId:
                driverId,

              actionUrl:
                "/dashboard/driver",

              email:
                true,
            },
          ),
        "assignation véhicule → chauffeur",
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Véhicule assigné au chauffeur avec succès.",
      vehicle,
      data:
        vehicle,
    });
  } catch (error) {
    console.error(
      "Erreur assignVehicle :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible d'assigner le véhicule au chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   UNASSIGN VEHICLE FROM DRIVER
===================================================== */

exports.unassignVehicle = async (
  req,
  res,
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const driver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const previousVehicle =
      await DriverModel.getDriverVehicle(
        driverId,
      );

    await DriverModel.unassignVehicle(
      driverId,
    );

    const io =
      req.app.get("io");

    const driverName =
      getDriverDisplayName(
        driver,
      );

    const vehicleName =
      getVehicleDisplayName(
        previousVehicle,
      );

    await safelyNotify(
      () =>
        notifyAdmin({
          io,

          type:
            "driver_vehicle_unassigned",

          level:
            "warning",

          title:
            "Véhicule désassigné",

          message:
            `${vehicleName} a été retiré de ${driverName}.`,

          entityType:
            "driver",

          entityId:
            driverId,

          actionUrl:
            `/dashboard/admin/drivers/${driverId}`,

          email:
            true,
        }),
      "désassignation véhicule → admin",
    );

    if (
      driver?.user_id
    ) {
      await safelyNotify(
        () =>
          notifyUser(
            Number(
              driver.user_id,
            ),
            {
              io,

              type:
                "vehicle_unassigned",

              level:
                "warning",

              title:
                "Votre véhicule a été désassigné",

              message:
                `${vehicleName} n’est plus assigné à votre profil chauffeur.`,

              entityType:
                "driver",

              entityId:
                driverId,

              actionUrl:
                "/dashboard/driver",

              email:
                true,
            },
          ),
        "désassignation véhicule → chauffeur",
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Véhicule désassigné avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur unassignVehicle :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de désassigner le véhicule.",
      error: error.message,
    });
  }
};

/* =====================================================
   GET DRIVER ORDERS
===================================================== */

exports.getDriverOrders = async (
  req,
  res,
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du chauffeur invalide.",
      });
    }

    const driver =
      await DriverModel.getDriverById(
        driverId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    const orders =
      await DriverModel.getDriverOrders(
        driverId,
      );

    return res.status(200).json({
      success: true,
      count:
        orders.length,
      orders,
      data:
        orders,
    });
  } catch (error) {
    console.error(
      "Erreur getDriverOrders :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les commandes du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   GET CURRENT DRIVER OPERATIONS
   GET /api/drivers/me/operations
===================================================== */

exports.getCurrentDriverOperations = async (req, res) => {
  try {
    const userId = Number(
      req.user?.id ||
        req.user?.user_id,
    );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const driver =
      await DriverModel.getDriverByUserId(
        userId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun profil chauffeur associé à cet utilisateur.",
      });
    }

    const operations =
      await DriverModel.getDriverOperations(
        driver.id,
      );

    return res.status(200).json({
      success: true,
      count: operations.length,
      operations,
      data: operations,
    });
  } catch (error) {
    console.error(
      "Erreur getCurrentDriverOperations :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les opérations du chauffeur.",
      error: error.message,
    });
  }
};


/* =====================================================
   GET CURRENT DRIVER OPERATION BY ID
   GET /api/drivers/me/operations/:operationId

   SÉCURITÉ :
   - L'utilisateur vient de req.user.
   - Le chauffeur est retrouvé depuis user_id.
   - operationId est validé.
   - Le modèle exige que l'opération appartienne
     au chauffeur connecté.
===================================================== */

exports.getCurrentDriverOperation = async (
  req,
  res,
) => {
  try {
    const userId = Number(
      req.user?.id ||
        req.user?.user_id,
    );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const operationId = Number(
      req.params?.operationId,
    );

    if (
      !Number.isInteger(operationId) ||
      operationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de tâche invalide.",
      });
    }

    const driver =
      await DriverModel.getDriverByUserId(
        userId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun profil chauffeur associé à cet utilisateur.",
      });
    }

    const operation =
      await DriverModel.getDriverOperationById(
        driver.id,
        operationId,
      );

    if (!operation) {
      /*
       * On renvoie 404 plutôt que 403.
       *
       * Cela évite de révéler au chauffeur
       * qu'une opération existe mais appartient
       * à un autre chauffeur.
       */
      return res.status(404).json({
        success: false,
        message:
          "Tâche introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Tâche chauffeur récupérée avec succès.",
      operation,
      task: operation,
      data: operation,
    });
  } catch (error) {
    console.error(
      "Erreur getCurrentDriverOperation :",
      error,
    );

    const statusCode = Number(
      error?.statusCode,
    );

    return res
      .status(
        Number.isInteger(statusCode) &&
          statusCode >= 400 &&
          statusCode <= 599
          ? statusCode
          : 500,
      )
      .json({
        success: false,
        message:
          error.message ||
          "Impossible de récupérer la tâche chauffeur.",
      });
  }
};

/* =====================================================
   GET CURRENT DRIVER SCAN HISTORY
   GET /api/drivers/me/scans
===================================================== */

exports.getCurrentDriverScanHistory = async (
  req,
  res,
) => {
  try {
    const userId = Number(
      req.user?.id ||
        req.user?.user_id,
    );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const driver =
      await DriverModel.getDriverByUserId(
        userId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun profil chauffeur associé à cet utilisateur.",
      });
    }

    const limit = req.query?.limit;

    const scans =
      await DriverModel.getDriverScanHistory(
        driver.id,
        limit,
      );

    return res.status(200).json({
      success: true,
      count: scans.length,
      scans,
      data: scans,
    });
  } catch (error) {
    console.error(
      "Erreur getCurrentDriverScanHistory :",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer l'historique des scans du chauffeur.",
      error: error.message,
    });
  }
};

/* =====================================================
   SCAN PACKAGE FOR CURRENT DRIVER
   POST /api/drivers/me/scan
===================================================== */

exports.lookupPackage = async (req, res) => {
  try {
    const userId = Number(req.user?.id || req.user?.user_id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: "Non authentifié." });
    }
    const driver = await DriverModel.getDriverByUserId(userId);
    if (!driver) {
      return res.status(403).json({ success: false, message: "Profil chauffeur introuvable." });
    }
    const result = await DriverModel.lookupDriverPackage(driver.id, req.body?.scanned_code);
    return res.json(result);
  } catch (error) {
    const status = Number(error.statusCode);
    if (!Number.isInteger(status) || status >= 500) console.error("lookupPackage:", error);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message: status >= 400 && status < 500 ? error.message : "Recherche du colis impossible.",
    });
  }
};

exports.scanPackage = async (req, res) => {
  try {
    const userId = Number(
      req.user?.id ||
        req.user?.user_id,
    );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const driver =
      await DriverModel.getDriverByUserId(
        userId,
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun profil chauffeur associé à cet utilisateur.",
      });
    }

    const result =
      await DriverModel.processDriverScan(
        driver.id,
        userId,
        req.body || {},
      );

    const statusCode = Number(
      result?.statusCode,
    );

    if (
      result?.success === false
    ) {
      return res
        .status(
          Number.isInteger(statusCode) &&
            statusCode >= 400 &&
            statusCode <= 599
            ? statusCode
            : 400,
        )
        .json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Erreur scanPackage :",
      error,
    );

    const statusCode = Number(
      error?.statusCode,
    );

    return res
      .status(
        Number.isInteger(statusCode) &&
          statusCode >= 400 &&
          statusCode <= 599
          ? statusCode
          : 500,
      )
      .json({
        success: false,
        message:
          error.message ||
          "Impossible de traiter le scan.",
      });
  }
};

const DispatchModel = require("../models/dispatchModel");

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

exports.getDispatchOrders = async (req, res) => {
  try {
    const result = await DispatchModel.getOrders(req.query);
    return res.status(200).json({
      success: true,
      data: result.rows,
      orders: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Erreur getDispatchOrders :", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de charger le Dispatch Center.",
      error: error.message,
    });
  }
};

exports.getDispatchOrderIds = async (req, res) => {
  try {
    const ids = await DispatchModel.getMatchingIds(req.query);
    return res.status(200).json({
      success: true,
      count: ids.length,
      ids,
      data: ids,
    });
  } catch (error) {
    console.error("Erreur getDispatchOrderIds :", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer les commandes filtrées.",
      error: error.message,
    });
  }
};

exports.bulkUpdateOrders = async (req, res) => {
  try {
    const orderIds = Array.isArray(req.body?.order_ids)
      ? req.body.order_ids
      : [];
    const changes =
      req.body?.changes && typeof req.body.changes === "object"
        ? req.body.changes
        : {};

    if (!orderIds.length) {
      return res.status(400).json({
        success: false,
        message: "Sélectionne au moins une commande.",
      });
    }

    if (orderIds.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 1000 commandes par opération.",
      });
    }

    const result = await DispatchModel.bulkUpdate(orderIds, changes);
    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} commande(s) mise(s) à jour.`,
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Erreur bulkUpdateOrders :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Mise à jour massive impossible.",
    });
  }
};

exports.reorderOrders = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "Aucune commande à réordonner.",
      });
    }

    if (items.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 1000 positions par opération.",
      });
    }

    const result = await DispatchModel.reorder(items);
    return res.status(200).json({
      success: true,
      message: "Ordre des livraisons enregistré.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Erreur reorderOrders :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Réorganisation impossible.",
    });
  }
};

exports.getOrderOperations = async (req, res) => {
  try {
    const orderId = parseId(req.params.orderId);
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Commande invalide.",
      });
    }

    const operations = await DispatchModel.getOrderOperations(orderId);
    return res.status(200).json({
      success: true,
      count: operations.length,
      data: operations,
      operations,
    });
  } catch (error) {
    console.error("Erreur getOrderOperations :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de charger les opérations.",
    });
  }
};

exports.createOrderOperation = async (req, res) => {
  try {
    const orderId = parseId(req.params.orderId);
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Commande invalide.",
      });
    }

    const operation = await DispatchModel.createOperation(orderId, req.body || {});
    return res.status(201).json({
      success: true,
      message: "Opération créée.",
      data: operation,
      operation,
    });
  } catch (error) {
    console.error("Erreur createOrderOperation :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de créer l’opération.",
    });
  }
};

exports.updateOrderOperation = async (req, res) => {
  try {
    const operationId = parseId(req.params.operationId);
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Opération invalide.",
      });
    }

    const operation = await DispatchModel.updateOperation(
      operationId,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      message: "Opération mise à jour.",
      data: operation,
      operation,
    });
  } catch (error) {
    console.error("Erreur updateOrderOperation :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de modifier l’opération.",
    });
  }
};

exports.deleteOrderOperation = async (req, res) => {
  try {
    const operationId = parseId(req.params.operationId);
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Opération invalide.",
      });
    }

    const result = await DispatchModel.deleteOperation(operationId);
    return res.status(200).json({
      success: true,
      message: "Opération supprimée.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Erreur deleteOrderOperation :", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Impossible de supprimer l’opération.",
    });
  }
};

/* =========================================================
   ANNULER LE DERNIER SCAN DU STOP
========================================================= */
exports.cancelLastScan = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const driver = await DriverModel.getDriverByUserId(userId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Profil chauffeur introuvable.",
      });
    }

    const taskId = Number(req.params.taskId);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Stop invalide.",
      });
    }

    const reason = String(req.body?.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "La raison de l'annulation est obligatoire.",
      });
    }

    const result = await DriverModel.cancelLastDriverScan(
      driver.id,
      userId,
      taskId,
      reason
    );

    /* Synchronisation temps réel */
    try {
      const io = req.app.get("io");

      if (io) {
        io.emit("driver:tasks:sync", {
          type: "scan_cancelled",
          task_id: taskId,
          driver_id: driver.id,
          timestamp: new Date().toISOString(),
        });

        io.to("role:super_admin").emit("dispatch:sync", {
          type: "scan_cancelled",
          task_id: taskId,
          driver_id: driver.id,
        });

        io.to("role:dispatcher").emit("dispatch:sync", {
          type: "scan_cancelled",
          task_id: taskId,
          driver_id: driver.id,
        });
      }
    } catch (socketError) {
      console.error(
        "Socket scan cancellation:",
        socketError.message
      );
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Erreur cancelLastScan :", error);

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Impossible d'annuler le dernier scan.",
      });
  }
};


/* =========================================================
   ANNULER LE SCAN D'UN COLIS PRECIS
========================================================= */
exports.cancelPackageScan = async (req, res) => {
  try {
    const userId = req.user?.id;

    const driver =
      await DriverModel.getDriverByUserId(userId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Profil chauffeur introuvable.",
      });
    }

    const taskId = Number(req.params.taskId);
    const packageId = Number(req.params.packageId);
    const reason = String(req.body?.reason || "").trim();

    if (
      !Number.isInteger(taskId) ||
      taskId <= 0 ||
      !Number.isInteger(packageId) ||
      packageId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stop ou colis invalide.",
      });
    }

    const result =
      await DriverModel.cancelPackageScan(
        driver.id,
        userId,
        taskId,
        packageId,
        reason
      );

    try {
      const io = req.app.get("io");

      if (io) {
        io.emit("driver:tasks:sync", {
          type: "package_scan_cancelled",
          task_id: taskId,
          package_id: packageId,
          driver_id: driver.id,
          timestamp: new Date().toISOString(),
        });

        io.to("role:super_admin").emit("dispatch:sync", {
          type: "package_scan_cancelled",
          task_id: taskId,
          package_id: packageId,
        });

        io.to("role:dispatcher").emit("dispatch:sync", {
          type: "package_scan_cancelled",
          task_id: taskId,
          package_id: packageId,
        });
      }
    } catch (e) {
      console.error(
        "Socket package scan cancellation:",
        e.message
      );
    }

    return res.json(result);

  } catch (error) {
    console.error(
      "Erreur cancelPackageScan:",
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Impossible d'annuler le scan.",
      });
  }
};

/* =========================================================
   V5 — RÉINITIALISER TOUS LES SCANS ACTIFS D'UN STOP
========================================================= */
exports.resetStopScans = async (req, res) => {
  const db = require("../config/db");
  let conn;

  try {
    const userId = req.user?.id;
    const driver = await DriverModel.getDriverByUserId(userId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Profil chauffeur introuvable.",
      });
    }

    const taskId = Number(req.params.taskId);
    const reason = String(
      req.body?.reason || "Réinitialisation complète du stop"
    ).trim();

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Stop invalide.",
      });
    }

    if (reason.length < 3) {
      return res.status(400).json({
        success: false,
        message: "La raison est obligatoire.",
      });
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    /*
     * Verrouiller le stop et vérifier qu'il appartient bien au chauffeur.
     */
    const [taskRows] = await conn.query(
      `SELECT id, driver_id, status, route_id
       FROM dispatch_tasks
       WHERE id=?
       FOR UPDATE`,
      [taskId]
    );

    const task = taskRows[0];

    if (!task) {
      const e = new Error("Stop introuvable.");
      e.statusCode = 404;
      throw e;
    }

    if (
      task.driver_id != null &&
      Number(task.driver_id) !== Number(driver.id)
    ) {
      const e = new Error("Ce stop n'appartient pas à ce chauffeur.");
      e.statusCode = 403;
      throw e;
    }

    if (String(task.status) === "completed") {
      const e = new Error(
        "Un stop déjà fermé ne peut pas être réinitialisé depuis l'application chauffeur."
      );
      e.statusCode = 409;
      throw e;
    }

    /*
     * 1. Annuler tous les scans actifs.
     *    scan_events reste intact : traçabilité conservée.
     */
    const [scanRows] = await conn.query(
      `SELECT
         se.id AS scan_event_id,
         se.package_id,
         se.operation_id
       FROM scan_events se
       JOIN order_operations op
         ON op.id=se.operation_id
       LEFT JOIN scan_cancellations sc
         ON sc.scan_event_id=se.id
       WHERE op.dispatch_task_id=?
         AND se.driver_id=?
         AND se.scan_status='accepted'
         AND sc.id IS NULL
       FOR UPDATE`,
      [taskId, driver.id]
    );

    for (const scan of scanRows) {
      await conn.query(
        `INSERT INTO scan_cancellations
           (scan_event_id, cancelled_by, reason)
         VALUES (?, ?, ?)`,
        [scan.scan_event_id, userId || null, reason]
      );
    }

    /*
     * 2. Archiver les exceptions dans l'audit avant de les retirer
     *    de l'état actif du stop.
     */
    const [exceptions] = await conn.query(
      `SELECT *
       FROM driver_package_exceptions
       WHERE dispatch_task_id=?
         AND driver_id=?
       FOR UPDATE`,
      [taskId, driver.id]
    );

    for (const ex of exceptions) {
      try {
        await conn.query(
          `INSERT INTO operational_audit_log
             (
               entity_type,
               entity_id,
               action,
               route_id,
               dispatch_task_id,
               driver_id,
               metadata
             )
           VALUES ('package', ?, 'stop_reset_exception_archived', ?, ?, ?, ?)`,
          [
            ex.package_id,
            task.route_id || null,
            taskId,
            driver.id,
            JSON.stringify({
              exception_id: ex.id,
              operation_id: ex.operation_id,
              order_id: ex.order_id,
              package_id: ex.package_id,
              reason: ex.reason,
              comment: ex.comment,
              latitude: ex.latitude,
              longitude: ex.longitude,
              accuracy: ex.accuracy,
              original_created_at: ex.created_at,
              reset_reason: reason,
            }),
          ]
        );
      } catch (auditError) {
        if (
          auditError?.code !== "ER_NO_SUCH_TABLE" &&
          auditError?.code !== "ER_BAD_FIELD_ERROR"
        ) {
          throw auditError;
        }
      }
    }

    await conn.query(
      `DELETE FROM driver_package_exceptions
       WHERE dispatch_task_id=?
         AND driver_id=?`,
      [taskId, driver.id]
    );

    /*
     * 3. Les preuves temporaires d'une livraison recommencée
     *    ne doivent pas rester actives.
     *    On les archive avant suppression.
     */
    const [proofs] = await conn.query(
      `SELECT *
       FROM driver_delivery_proofs
       WHERE dispatch_task_id=?
         AND driver_id=?
       FOR UPDATE`,
      [taskId, driver.id]
    );

    for (const proof of proofs) {
      try {
        await conn.query(
          `INSERT INTO operational_audit_log
             (
               entity_type,
               entity_id,
               action,
               route_id,
               dispatch_task_id,
               driver_id,
               metadata
             )
           VALUES ('stop', ?, 'stop_reset_proof_archived', ?, ?, ?, ?)`,
          [
            taskId,
            task.route_id || null,
            taskId,
            driver.id,
            JSON.stringify({
              proof_id: proof.id,
              operation_id: proof.operation_id,
              order_id: proof.order_id,
              proof_type: proof.proof_type,
              recipient_first_name: proof.recipient_first_name,
              recipient_last_name: proof.recipient_last_name,
              latitude: proof.latitude,
              longitude: proof.longitude,
              accuracy: proof.accuracy,
              original_created_at: proof.created_at,
              reset_reason: reason,
            }),
          ]
        );
      } catch (auditError) {
        if (
          auditError?.code !== "ER_NO_SUCH_TABLE" &&
          auditError?.code !== "ER_BAD_FIELD_ERROR"
        ) {
          throw auditError;
        }
      }
    }

    await conn.query(
      `DELETE FROM driver_delivery_proofs
       WHERE dispatch_task_id=?
         AND driver_id=?`,
      [taskId, driver.id]
    );

    /*
     * 4. Revenir réellement AVANT "Commencer le stop".
     */
    await conn.query(
      `UPDATE driver_stop_runs
       SET execution_status='todo',
           started_at=NULL,
           closed_at=NULL,
           start_latitude=NULL,
           start_longitude=NULL,
           start_accuracy=NULL,
           close_latitude=NULL,
           close_longitude=NULL,
           close_accuracy=NULL,
           close_address=NULL
       WHERE dispatch_task_id=?
         AND driver_id=?`,
      [taskId, driver.id]
    );

    /*
     * Le stop et ses opérations redeviennent assignés/pending,
     * mais restent affectés au même chauffeur.
     */
    await conn.query(
      `UPDATE dispatch_tasks
       SET status=CASE
         WHEN driver_id IS NULL THEN 'pending'
         ELSE 'assigned'
       END
       WHERE id=?`,
      [taskId]
    );

    await conn.query(
      `UPDATE order_operations
       SET status=CASE
             WHEN driver_id IS NULL THEN 'pending'
             ELSE 'assigned'
           END,
           started_at=NULL,
           completed_at=NULL
       WHERE dispatch_task_id=?
         AND status <> 'cancelled'`,
      [taskId]
    );

    /*
     * 5. Audit global du reset.
     */
    try {
      await conn.query(
        `INSERT INTO operational_audit_log
           (
             entity_type,
             entity_id,
             action,
             route_id,
             dispatch_task_id,
             driver_id,
             metadata
           )
         VALUES ('stop', ?, 'stop_full_reset', ?, ?, ?, ?)`,
        [
          taskId,
          task.route_id || null,
          taskId,
          driver.id,
          JSON.stringify({
            reason,
            reset_by_user_id: userId || null,
            cancelled_scan_count: scanRows.length,
            cleared_exception_count: exceptions.length,
            cleared_proof_count: proofs.length,
          }),
        ]
      );
    } catch (auditError) {
      if (
        auditError?.code !== "ER_NO_SUCH_TABLE" &&
        auditError?.code !== "ER_BAD_FIELD_ERROR"
      ) {
        throw auditError;
      }
    }

    await conn.commit();

    const io = req.app.get("io");

    if (io) {
      const payload = {
        type: "stop_full_reset",
        task_id: taskId,
        driver_id: driver.id,
      };

      io.emit("driver:tasks:sync", payload);

      io.to("role:super_admin")
        .to("role:dispatcher")
        .emit("dispatch:sync", payload);
    }

    return res.json({
      success: true,
      message:
        "Stop complètement réinitialisé. Cliquez de nouveau sur Commencer le stop.",
      reset_count: scanRows.length,
      exception_count: exceptions.length,
      proof_count: proofs.length,
      requires_restart: true,
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }

    console.error("Erreur resetStopScans:", error);

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Impossible de réinitialiser complètement le stop.",
      });
  } finally {
    if (conn) conn.release();
  }
};

