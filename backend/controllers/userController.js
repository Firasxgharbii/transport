const UserModel = require("../models/userModel");

exports.getUsers = async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();

    res.json({
      message: "Liste des utilisateurs récupérée avec succès.",
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs.",
      error: error.message,
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (req.user.role !== "super_admin" && req.user.id !== userId) {
      return res.status(403).json({
        message: "Accès refusé. Vous pouvez consulter uniquement votre propre profil.",
      });
    }

    const user = await UserModel.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    res.json({
      message: "Utilisateur récupéré avec succès.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération de l'utilisateur.",
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (req.user.role !== "super_admin" && req.user.id !== userId) {
      return res.status(403).json({
        message: "Accès refusé. Vous pouvez modifier uniquement votre propre profil.",
      });
    }

    const allowedStatuses = ["active", "inactive", "blocked"];

    if (req.body.status && !allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({
        message: "Statut invalide. Utilisez active, inactive ou blocked.",
      });
    }

    if (req.user.role !== "super_admin" && req.body.status) {
      return res.status(403).json({
        message: "Seul le super_admin peut modifier le statut d'un utilisateur.",
      });
    }

    const result = await UserModel.updateUser(userId, req.body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    const updatedUser = await UserModel.getUserById(userId);

    res.json({
      message: "Utilisateur modifié avec succès.",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la modification de l'utilisateur.",
      error: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (req.user.id === userId) {
      return res.status(400).json({
        message: "Vous ne pouvez pas supprimer votre propre compte administrateur.",
      });
    }

    const result = await UserModel.deleteUser(userId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    res.json({
      message: "Utilisateur supprimé avec succès.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de l'utilisateur.",
      error: error.message,
    });
  }
}; 