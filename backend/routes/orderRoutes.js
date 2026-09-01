const express = require("express");

const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  assignDriver,
  assignVehicle,
  updateOrderStatus,
  getDriverOrders,
  getOrderStops,
  addOrderStop,
  updateOrderStop,
  deleteOrderStop,
  getOrderTimeline,
  getDeliveryProofs,
  createDeliveryProof,

  // Bons de livraison
  getAllDeliveryNotes,
  getDeliveryNoteByOrderId,
} = require("../controllers/orderController");

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

const upload = require(
  "../middleware/uploadMiddleware"
);

const router = express.Router();

/* ============================================================

   AUTHENTIFICATION

============================================================ */

router.use(authMiddleware);

/* ============================================================

   BONS DE LIVRAISON

   IMPORTANT :
   Ces routes doivent rester AVANT "/:id".

============================================================ */

/* ------------------------------------------------------------
   Tous les bons de livraison
   GET /api/orders/delivery-notes

   Accessible :
   - super_admin
   - dispatcher
------------------------------------------------------------ */

router.get(
  "/delivery-notes",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  getAllDeliveryNotes
);

/* ------------------------------------------------------------
   Un bon de livraison précis
   GET /api/orders/delivery-notes/:id

   Accessible :
   - super_admin
   - dispatcher
   - driver
   - client
------------------------------------------------------------ */

router.get(
  "/delivery-notes/:id",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),

  getDeliveryNoteByOrderId
);

/* ============================================================

   COMMANDES D'UN CHAUFFEUR

============================================================ */

/* ------------------------------------------------------------
   GET /api/orders/driver/:driverId
------------------------------------------------------------ */

router.get(
  "/driver/:driverId",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  getDriverOrders
);

/* ============================================================

   LISTER TOUTES LES COMMANDES

============================================================ */

/* ------------------------------------------------------------
   GET /api/orders
------------------------------------------------------------ */

router.get(
  "/",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  getAllOrders
);

/* ============================================================

   CRÉER UNE COMMANDE

============================================================ */

/* ------------------------------------------------------------
   POST /api/orders
------------------------------------------------------------ */

router.post(
  "/",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  createOrder
);

/* ============================================================

   ASSIGNER UN CHAUFFEUR

============================================================ */

/* ------------------------------------------------------------
   PATCH /api/orders/:id/assign-driver
------------------------------------------------------------ */

router.patch(
  "/:id/assign-driver",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  assignDriver
);

/* ============================================================

   ASSIGNER UN VÉHICULE

============================================================ */

/* ------------------------------------------------------------
   PATCH /api/orders/:id/assign-vehicle
------------------------------------------------------------ */

router.patch(
  "/:id/assign-vehicle",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  assignVehicle
);

/* ============================================================

   MODIFIER LE STATUT D'UNE COMMANDE

============================================================ */

/* ------------------------------------------------------------
   PATCH /api/orders/:id/status

   Accessible :
   - super_admin
   - dispatcher
   - driver
------------------------------------------------------------ */

router.patch(
  "/:id/status",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  updateOrderStatus
);

/* ============================================================

   ARRÊTS D'UNE COMMANDE

============================================================ */

/* ------------------------------------------------------------
   Récupérer les arrêts
   GET /api/orders/:id/stops
------------------------------------------------------------ */

router.get(
  "/:id/stops",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),

  getOrderStops
);

/* ------------------------------------------------------------
   Ajouter un arrêt
   POST /api/orders/:id/stops
------------------------------------------------------------ */

router.post(
  "/:id/stops",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  addOrderStop
);

/* ------------------------------------------------------------
   Modifier un arrêt
   PUT /api/orders/stops/:stopId
------------------------------------------------------------ */

router.put(
  "/stops/:stopId",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  updateOrderStop
);

/* ------------------------------------------------------------
   Supprimer un arrêt
   DELETE /api/orders/stops/:stopId
------------------------------------------------------------ */

router.delete(
  "/stops/:stopId",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  deleteOrderStop
);

/* ============================================================

   PREUVES DE LIVRAISON

============================================================ */

/* ------------------------------------------------------------
   Récupérer les preuves
   GET /api/orders/:id/proofs

   Retour attendu :
   - nom du destinataire
   - photo
   - signature
   - notes
   - date/heure réelle
------------------------------------------------------------ */

router.get(
  "/:id/proofs",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),

  getDeliveryProofs
);

/* ------------------------------------------------------------
   Ajouter une preuve de livraison complète
   POST /api/orders/:id/proofs

   Content-Type :
   multipart/form-data

   Champs texte possibles :
   - driver_id
   - receiver_first_name
   - receiver_last_name
   - notes
   - latitude
   - longitude
   - accuracy

   Fichiers :
   - photo
   - signature

   Les fichiers sont reçus en mémoire via Multer
   puis envoyés vers Cloudinary par le controller/service.
------------------------------------------------------------ */

router.post(
  "/:id/proofs",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  upload.fields([
    {
      name: "photo",
      maxCount: 1,
    },

    {
      name: "signature",
      maxCount: 1,
    },
  ]),

  createDeliveryProof
);

/* ============================================================

   HISTORIQUE DES STATUTS

============================================================ */

/* ------------------------------------------------------------
   GET /api/orders/:id/timeline
------------------------------------------------------------ */

router.get(
  "/:id/timeline",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),

  getOrderTimeline
);

/* ============================================================

   RÉCUPÉRER UNE COMMANDE PAR ID

   IMPORTANT :
   Doit rester après les routes spécifiques.

============================================================ */

/* ------------------------------------------------------------
   GET /api/orders/:id
------------------------------------------------------------ */

router.get(
  "/:id",

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver",
    "client"
  ),

  getOrderById
);

/* ============================================================

   MODIFIER UNE COMMANDE

============================================================ */

/* ------------------------------------------------------------
   PUT /api/orders/:id
------------------------------------------------------------ */

router.put(
  "/:id",

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  updateOrder
);

/* ============================================================

   SUPPRIMER UNE COMMANDE

============================================================ */

/* ------------------------------------------------------------
   DELETE /api/orders/:id
------------------------------------------------------------ */

router.delete(
  "/:id",

  roleMiddleware(
    "super_admin"
  ),

  deleteOrder
);

/* ============================================================

   ERREUR MULTER / UPLOAD

============================================================ */

/*
 * Cette gestion d'erreur attrape notamment :
 * - fichier trop volumineux
 * - mauvais champ multipart
 * - format refusé par uploadMiddleware
 */

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (!error) {
      return next();
    }

    console.error(
      "Erreur upload preuve de livraison :",
      error
    );

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Une image dépasse la taille maximale autorisée de 10 Mo.",
      });
    }

    if (
      error.code ===
      "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Champ de fichier non autorisé. Utilisez uniquement 'photo' et 'signature'.",
      });
    }

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Erreur lors de l'envoi des fichiers.",
    });
  }
);

/* ============================================================

   EXPORT

============================================================ */

module.exports = router;