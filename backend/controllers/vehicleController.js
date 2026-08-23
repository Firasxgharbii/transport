const VehicleModel = require("../models/vehicleModel");

/* =====================================================
   UTILITAIRES
===================================================== */

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
   GET ALL VEHICLES
===================================================== */

exports.getVehicles = async (req, res) => {
  try {
    const vehicles =
      await VehicleModel.getAllVehicles();

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      message:
        "Liste des véhicules récupérée avec succès.",
      vehicles,
      data: vehicles,
    });
  } catch (error) {
    console.error(
      "Erreur getVehicles :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération des véhicules.",
      error: error.message,
    });
  }
};

/* =====================================================
   GET VEHICLE BY ID
===================================================== */

exports.getVehicle = async (req, res) => {
  try {
    const vehicleId =
      parseVehicleId(req.params.id);

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du véhicule invalide.",
      });
    }

    const vehicle =
      await VehicleModel.getVehicleById(
        vehicleId
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Véhicule introuvable.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Véhicule récupéré avec succès.",
      vehicle,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Erreur getVehicle :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la récupération du véhicule.",
      error: error.message,
    });
  }
};

/* =====================================================
   CREATE VEHICLE
===================================================== */

exports.createVehicle = async (
  req,
  res
) => {
  try {
    const {
      driver_id,

      make,
      model,
      year,

      plate,
      vin,

      vehicle_type,

      capacity_kg,
      capacity_pallets,

      fuel_type,
      mileage,

      status,

      insurance_number,
      insurance_expiry,

      registration_number,
      registration_expiry,

      notes,
    } = req.body;

    /* -----------------------------------------------------
       VALIDATION CHAMPS OBLIGATOIRES
    ----------------------------------------------------- */

    if (
      !make ||
      !String(make).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La marque du véhicule est obligatoire.",
      });
    }

    if (
      !model ||
      !String(model).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le modèle du véhicule est obligatoire.",
      });
    }

    if (
      !plate ||
      !String(plate).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La plaque du véhicule est obligatoire.",
      });
    }

    /* -----------------------------------------------------
       VALIDATION DU CHAUFFEUR
    ----------------------------------------------------- */

    let normalizedDriverId = null;

    if (
      driver_id !== undefined &&
      driver_id !== null &&
      driver_id !== ""
    ) {
      const parsedDriverId =
        Number(driver_id);

      if (
        !Number.isInteger(parsedDriverId) ||
        parsedDriverId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "driver_id est invalide.",
        });
      }

      normalizedDriverId =
        parsedDriverId;
    }

    /* -----------------------------------------------------
       VALIDATION ANNÉE
    ----------------------------------------------------- */

    let normalizedYear = null;

    if (
      year !== undefined &&
      year !== null &&
      year !== ""
    ) {
      const parsedYear =
        Number(year);

      if (
        !Number.isInteger(parsedYear) ||
        parsedYear < 1900 ||
        parsedYear > 2100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "L'année du véhicule est invalide.",
        });
      }

      normalizedYear = parsedYear;
    }

    /* -----------------------------------------------------
       VALIDATION CARBURANT
    ----------------------------------------------------- */

    const allowedFuelTypes = [
      "gasoline",
      "diesel",
      "electric",
      "hybrid",
      "other",
    ];

    const normalizedFuelType =
      allowedFuelTypes.includes(
        fuel_type
      )
        ? fuel_type
        : "gasoline";

    /* -----------------------------------------------------
       VALIDATION STATUT
    ----------------------------------------------------- */

    const allowedStatuses = [
      "available",
      "in_service",
      "maintenance",
      "inactive",
    ];

    const normalizedStatus =
      allowedStatuses.includes(status)
        ? status
        : "available";

    /* -----------------------------------------------------
       CRÉATION
    ----------------------------------------------------- */

    const vehicleId =
      await VehicleModel.createVehicle({
        driver_id:
          normalizedDriverId,

        make:
          String(make).trim(),

        model:
          String(model).trim(),

        year:
          normalizedYear,

        plate:
          String(plate)
            .trim()
            .toUpperCase(),

        vin:
          vin
            ? String(vin)
                .trim()
                .toUpperCase()
            : null,

        vehicle_type:
          vehicle_type
            ? String(
                vehicle_type
              ).trim()
            : null,

        capacity_kg:
          capacity_kg || null,

        capacity_pallets:
          capacity_pallets || null,

        fuel_type:
          normalizedFuelType,

        mileage:
          mileage || 0,

        status:
          normalizedStatus,

        insurance_number:
          insurance_number || null,

        insurance_expiry:
          insurance_expiry || null,

        registration_number:
          registration_number || null,

        registration_expiry:
          registration_expiry || null,

        notes:
          notes || null,
      });

    const vehicle =
      await VehicleModel.getVehicleById(
        vehicleId
      );

    return res.status(201).json({
      success: true,
      message:
        "Véhicule créé avec succès.",
      vehicle,
      data: vehicle,
    });
  } catch (error) {
    console.error(
      "Erreur createVehicle :",
      error
    );

    if (
      error.code ===
      "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Un véhicule avec cette plaque ou ce VIN existe déjà.",
      });
    }

    if (
      error.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le chauffeur sélectionné n'existe pas.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la création du véhicule.",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE VEHICLE
===================================================== */

exports.updateVehicle = async (
  req,
  res
) => {
  try {
    const vehicleId =
      parseVehicleId(req.params.id);

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du véhicule invalide.",
      });
    }

    const existingVehicle =
      await VehicleModel.getVehicleById(
        vehicleId
      );

    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Véhicule introuvable.",
      });
    }

    const updateData = {
      ...req.body,
    };

    /* -----------------------------------------------------
       NE PAS MODIFIER LES CHAMPS SYSTÈME
    ----------------------------------------------------- */

    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    /* -----------------------------------------------------
       DRIVER
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "driver_id"
      )
    ) {
      if (
        updateData.driver_id === "" ||
        updateData.driver_id === null
      ) {
        updateData.driver_id = null;
      } else {
        const parsedDriverId =
          Number(
            updateData.driver_id
          );

        if (
          !Number.isInteger(
            parsedDriverId
          ) ||
          parsedDriverId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "driver_id est invalide.",
          });
        }

        updateData.driver_id =
          parsedDriverId;
      }
    }

    /* -----------------------------------------------------
       ANNÉE
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "year"
      )
    ) {
      if (
        updateData.year === "" ||
        updateData.year === null
      ) {
        updateData.year = null;
      } else {
        const parsedYear =
          Number(updateData.year);

        if (
          !Number.isInteger(
            parsedYear
          ) ||
          parsedYear < 1900 ||
          parsedYear > 2100
        ) {
          return res.status(400).json({
            success: false,
            message:
              "L'année du véhicule est invalide.",
          });
        }

        updateData.year =
          parsedYear;
      }
    }

    /* -----------------------------------------------------
       PLAQUE
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "plate"
      )
    ) {
      if (
        !updateData.plate ||
        !String(
          updateData.plate
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La plaque du véhicule ne peut pas être vide.",
        });
      }

      updateData.plate =
        String(updateData.plate)
          .trim()
          .toUpperCase();
    }

    /* -----------------------------------------------------
       VIN
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "vin"
      )
    ) {
      updateData.vin =
        updateData.vin
          ? String(updateData.vin)
              .trim()
              .toUpperCase()
          : null;
    }

    /* -----------------------------------------------------
       MARQUE
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "make"
      )
    ) {
      if (
        !updateData.make ||
        !String(
          updateData.make
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La marque ne peut pas être vide.",
        });
      }

      updateData.make =
        String(updateData.make).trim();
    }

    /* -----------------------------------------------------
       MODÈLE
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "model"
      )
    ) {
      if (
        !updateData.model ||
        !String(
          updateData.model
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le modèle ne peut pas être vide.",
        });
      }

      updateData.model =
        String(updateData.model).trim();
    }

    /* -----------------------------------------------------
       CARBURANT
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "fuel_type"
      )
    ) {
      const allowedFuelTypes = [
        "gasoline",
        "diesel",
        "electric",
        "hybrid",
        "other",
      ];

      if (
        !allowedFuelTypes.includes(
          updateData.fuel_type
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Type de carburant invalide.",
        });
      }
    }

    /* -----------------------------------------------------
       STATUT
    ----------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "status"
      )
    ) {
      const allowedStatuses = [
        "available",
        "in_service",
        "maintenance",
        "inactive",
      ];

      if (
        !allowedStatuses.includes(
          updateData.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Statut du véhicule invalide.",
        });
      }
    }

    /* -----------------------------------------------------
       MODIFICATION
    ----------------------------------------------------- */

    const result =
      await VehicleModel.updateVehicle(
        vehicleId,
        updateData
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

    const updatedVehicle =
      await VehicleModel.getVehicleById(
        vehicleId
      );

    return res.status(200).json({
      success: true,
      message:
        "Véhicule modifié avec succès.",
      vehicle:
        updatedVehicle,
      data:
        updatedVehicle,
    });
  } catch (error) {
    console.error(
      "Erreur updateVehicle :",
      error
    );

    if (
      error.code ===
      "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Cette plaque ou ce VIN est déjà utilisé par un autre véhicule.",
      });
    }

    if (
      error.code ===
      "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le chauffeur sélectionné n'existe pas.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la modification du véhicule.",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE VEHICLE
===================================================== */

exports.deleteVehicle = async (
  req,
  res
) => {
  try {
    const vehicleId =
      parseVehicleId(req.params.id);

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du véhicule invalide.",
      });
    }

    const existingVehicle =
      await VehicleModel.getVehicleById(
        vehicleId
      );

    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        message:
          "Véhicule introuvable.",
      });
    }

    const result =
      await VehicleModel.deleteVehicle(
        vehicleId
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

    return res.status(200).json({
      success: true,
      message:
        "Véhicule supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur deleteVehicle :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la suppression du véhicule.",
      error: error.message,
    });
  }
};