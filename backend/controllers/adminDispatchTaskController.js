"use strict";

const db = require("../config/db");

const {
  getAdminDispatchTasks,
  deleteAdminDispatchTask,
} = require("../models/adminDispatchTaskModel");

/**
 * GET /api/dispatch/tasks
 *
 * L'accès est réservé aux rôles super_admin
 * et dispatcher dans dispatchRoutes.js.
 */
exports.getAdminDispatchTasks = async (req, res) => {
  try {
    const tasks = await getAdminDispatchTasks(db);

    return res.status(200).json({
      success: true,
      total: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error(
      "Erreur consultation missions admin :",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les missions regroupées.",
    });
  }
};


/** DELETE /api/dispatch/tasks/:taskId
 * Supprime le regroupement uniquement si aucune exécution métier n'a commencé.
 */
exports.deleteAdminDispatchTask = async (req, res) => {
  try {
    const result = await deleteAdminDispatchTask(db, req.params.taskId);
    return res.status(200).json({
      ...result,
      message: "Mission supprimée. Les commandes et colis ont été conservés et sont de nouveau non planifiés.",
    });
  } catch (error) {
    console.error("Suppression mission admin :", error);
    return res.status(400).json({ success: false, message: error.message || "Suppression impossible." });
  }
};
