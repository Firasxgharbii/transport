const ClientModel = require("../models/clientModel");

exports.getClients = async (req, res) => {
  try {
    const clients = await ClientModel.getAllClients();

    res.json({
      message: "Liste des clients récupérée avec succès.",
      clients,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des clients.",
      error: error.message,
    });
  }
};

exports.getClient = async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const client = await ClientModel.getClientById(clientId);

    if (!client) {
      return res.status(404).json({
        message: "Client introuvable.",
      });
    }

    res.json({
      message: "Client récupéré avec succès.",
      client,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération du client.",
      error: error.message,
    });
  }
};

exports.createClient = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({
        message: "Le prénom, le nom et le téléphone sont obligatoires.",
      });
    }

    const clientId = await ClientModel.createClient(req.body);
    const client = await ClientModel.getClientById(clientId);

    res.status(201).json({
      message: "Client créé avec succès.",
      client,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création du client.",
      error: error.message,
    });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const clientId = Number(req.params.id);

    const result = await ClientModel.updateClient(clientId, req.body);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Client introuvable.",
      });
    }

    const updatedClient = await ClientModel.getClientById(clientId);

    res.json({
      message: "Client modifié avec succès.",
      client: updatedClient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la modification du client.",
      error: error.message,
    });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const clientId = Number(req.params.id);

    const result = await ClientModel.deleteClient(clientId);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Client introuvable.",
      });
    }

    res.json({
      message: "Client supprimé avec succès.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du client.",
      error: error.message,
    });
  }
};