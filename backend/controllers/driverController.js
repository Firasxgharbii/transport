const DriverModel = require("../models/driverModel");

exports.getDrivers = async (req, res) => {
  try {
    const drivers = await DriverModel.getAllDrivers();

    res.json({
      message: "Liste des chauffeurs récupérée avec succès.",
      drivers,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des chauffeurs.",
      error: error.message,
    });
  }
};

exports.getDriver = async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    const driver = await DriverModel.getDriverById(driverId);

    if (!driver) {
      return res.status(404).json({
        message: "Chauffeur introuvable.",
      });
    }

    res.json({
      message: "Chauffeur récupéré avec succès.",
      driver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération du chauffeur.",
      error: error.message,
    });
  }
};

exports.createDriver = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        message: "user_id est obligatoire.",
      });
    }

    const user = await DriverModel.checkUserIsDriver(user_id);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    if (user.role !== "driver") {
      return res.status(400).json({
        message: "Cet utilisateur n'a pas le rôle driver.",
      });
    }

    const existingDriver = await DriverModel.checkDriverExistsForUser(user_id);

    if (existingDriver) {
      return res.status(409).json({
        message: "Ce chauffeur existe déjà pour cet utilisateur.",
      });
    }

    const driverId = await DriverModel.createDriver(req.body);
    const driver = await DriverModel.getDriverById(driverId);

    res.status(201).json({
      message: "Chauffeur créé avec succès.",
      driver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création du chauffeur.",
      error: error.message,
    });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const driverId = Number(req.params.id);

    const result = await DriverModel.updateDriver(driverId, req.body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Chauffeur introuvable.",
      });
    }

    const updatedDriver = await DriverModel.getDriverById(driverId);

    res.json({
      message: "Chauffeur modifié avec succès.",
      driver: updatedDriver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la modification du chauffeur.",
      error: error.message,
    });
  }
};

exports.deleteDriver = async (req, res) => {
  try {
    const driverId = Number(req.params.id);

    const result = await DriverModel.deleteDriver(driverId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Chauffeur introuvable.",
      });
    }

    res.json({
      message: "Chauffeur supprimé avec succès.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du chauffeur.",
      error: error.message,
    });
  }
};