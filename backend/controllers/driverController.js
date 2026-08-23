const DriverModel = require("../models/driverModel");

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
      error
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
        driverId
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
      error
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
  res
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
        userId
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
        userId
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
        availability_status
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
        driverId
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
      error
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
  res
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
        driverId
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
        updateData.availability_status
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

    /*
     * Le véhicule est maintenant géré dans la table vehicles.
     * On empêche donc la modification directe de ces anciens
     * champs présents dans drivers.
     */
    delete updateData.vehicle_name;
    delete updateData.vehicle_plate;
    delete updateData.vehicle_id;

    const result =
      await DriverModel.updateDriver(
        driverId,
        updateData
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
        driverId
      );

    return res.status(200).json({
      success: true,
      message:
        "Chauffeur modifié avec succès.",
      driver: updatedDriver,
      data: updatedDriver,
    });
  } catch (error) {
    console.error(
      "Erreur updateDriver :",
      error
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
  res
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
        driverId
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
        driverId
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Chauffeur supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteDriver :",
      error
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
  res
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
        driverId
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
        driverId
      );

    return res.status(200).json({
      success: true,
      vehicle,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Erreur getDriverVehicle :",
      error
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
  res
) => {
  try {
    const driverId =
      parseDriverId(req.params.id);

    const vehicleId =
      parseVehicleId(
        req.body.vehicle_id
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
        driverId
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
        vehicleId
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Véhicule introuvable.",
      });
    }

    const vehicle =
      await DriverModel.getDriverVehicle(
        driverId
      );

    return res.status(200).json({
      success: true,
      message:
        "Véhicule assigné au chauffeur avec succès.",
      vehicle,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Erreur assignVehicle :",
      error
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
  res
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
        driverId
      );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message:
          "Chauffeur introuvable.",
      });
    }

    await DriverModel.unassignVehicle(
      driverId
    );

    return res.status(200).json({
      success: true,
      message:
        "Véhicule désassigné avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur unassignVehicle :",
      error
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
  res
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
        driverId
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
        driverId
      );

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
      data: orders,
    });
  } catch (error) {
    console.error(
      "Erreur getDriverOrders :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les commandes du chauffeur.",
      error: error.message,
    });
  }
};