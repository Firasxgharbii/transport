const db = require("../config/db");
const DispatchTaskModel = require("../models/dispatchTaskModel");

function parseId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function makeCreateTaskHandler(taskType) {
  return async (req, res) => {
    if (!parseId(req.user?.id ?? req.user?.user_id)) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Données invalides.",
      });
    }

    const orderIds = req.body.order_ids;

    if (
      !Array.isArray(orderIds) ||
      orderIds.length < 1 ||
      orderIds.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Sélectionne entre 1 et 1000 commandes.",
      });
    }

    const parsedIds = orderIds.map(parseId);

    if (
      parsedIds.some((id) => id === null) ||
      new Set(parsedIds).size !== parsedIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Liste de commandes invalide ou en double.",
      });
    }

    const driverId =
      req.body.driver_id == null ||
      req.body.driver_id === ""
        ? null
        : parseId(req.body.driver_id);

    const vehicleId =
      req.body.vehicle_id == null ||
      req.body.vehicle_id === ""
        ? null
        : parseId(req.body.vehicle_id);

    if (
      (req.body.driver_id != null &&
        req.body.driver_id !== "" &&
        driverId === null) ||
      (req.body.vehicle_id != null &&
        req.body.vehicle_id !== "" &&
        vehicleId === null)
    ) {
      return res.status(400).json({
        success: false,
        message: "Chauffeur ou véhicule invalide.",
      });
    }

    const connection = await db.getConnection();

    try {
      const createTask =
        taskType === "pickup"
          ? DispatchTaskModel.createPickupTask
          : DispatchTaskModel.createDeliveryTask;

      const result = await createTask(connection, {
        order_ids: parsedIds,
        driver_id: driverId,
        vehicle_id: vehicleId,
        actor_user_id: parseId(req.user?.id ?? req.user?.user_id),
        dispatch_override: taskType === "delivery",

        // Cette route est protégée par roleMiddleware
        // super_admin / dispatcher.
        // Le navigateur ne contrôle donc pas ce privilège.
        dispatch_override: taskType === "delivery",

        notes:
          typeof req.body.notes === "string"
            ? req.body.notes.slice(0, 5000)
            : null,
      });

      return res.status(201).json({
        ...result,
        success: true,
        message:
          taskType === "pickup"
            ? "Mission de ramassage regroupée créée."
            : "Mission de livraison regroupée créée.",
      });
    } catch (error) {
      console.error(
        `Erreur création mission ${taskType} :`,
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Impossible de créer la mission regroupée.",
      });
    } finally {
      connection.release();
    }
  };
}

exports.createGroupedPickupTask =
  makeCreateTaskHandler("pickup");

exports.createGroupedDeliveryTask =
  makeCreateTaskHandler("delivery");
