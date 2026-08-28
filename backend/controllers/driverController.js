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