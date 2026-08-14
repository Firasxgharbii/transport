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
      availability_status,
      profile_photo_url,
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
        availability_status:
          normalizedAvailabilityStatus,
        profile_photo_url:
          profile_photo_url || null,
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