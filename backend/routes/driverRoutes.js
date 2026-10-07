const express = require("express");

const router = express.Router();

const driverController = require(
  "../controllers/driverController"
);

const driverDispatchTaskController = require(
  "../controllers/driverDispatchTaskController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const roleMiddleware = require(
  "../middleware/roleMiddleware"
);

/* =========================================================

   RÉCUPÉRER LE CHAUFFEUR CONNECTÉ

   GET /api/drivers/me

========================================================= */

router.get(
  "/me",

  authMiddleware,

  roleMiddleware("driver"),

  driverController.getCurrentDriver
);

/* =========================================================

   RÉCUPÉRER LES OPÉRATIONS DU CHAUFFEUR CONNECTÉ

   GET /api/drivers/me/operations

========================================================= */

router.get(
  "/me/operations",

  authMiddleware,

  roleMiddleware("driver"),

  driverController.getCurrentDriverOperations
);

/* =========================================================

   RÉCUPÉRER UNE OPÉRATION PRÉCISE DU CHAUFFEUR CONNECTÉ

   GET /api/drivers/me/operations/:operationId

   SÉCURITÉ :

   - Le chauffeur vient obligatoirement du JWT.
   - Le frontend ne choisit jamais driver_id.
   - Le backend doit vérifier que l'opération demandée
     appartient réellement au chauffeur connecté.

   Cette route est utilisée notamment par :

   /dashboard/driver/tasks/[id]

========================================================= */

router.get(
  "/me/operations/:operationId",

  authMiddleware,

  roleMiddleware("driver"),

  driverController.getCurrentDriverOperation
);

/* =========================================================

   RÉCUPÉRER L'HISTORIQUE DES SCANS DU CHAUFFEUR CONNECTÉ

   GET /api/drivers/me/scans

   Optionnel :

   GET /api/drivers/me/scans?limit=50

========================================================= */

router.get(
  "/me/scans",

  authMiddleware,

  roleMiddleware("driver"),

  driverController.getCurrentDriverScanHistory
);

/* =========================================================

   SCANNER UN COLIS / UNE COMMANDE

   POST /api/drivers/me/scan

   IMPORTANT :

   - Le chauffeur est identifié depuis req.user.
   - Aucun driver_id n'est accepté comme autorité
     depuis le frontend.
   - Le backend vérifie :
       colis
       commande
       opération
       chauffeur assigné
       statut
       doublon
       historique du scan

   Le résultat peut retourner :

   operation.id

   afin d'ouvrir automatiquement :

   /dashboard/driver/tasks/:operationId

========================================================= */

router.post(
  "/me/scan/lookup",
  authMiddleware,
  roleMiddleware("driver"),
  driverController.lookupPackage
);

router.post(
  "/me/scan",

  authMiddleware,

  roleMiddleware("driver"),

  driverController.scanPackage
);

/* V5 : un seul bouton remet tous les scans actifs du stop à zéro. */
router.post(
  "/me/dispatch-tasks/:taskId/scans/reset",
  authMiddleware,
  roleMiddleware("driver"),
  driverController.resetStopScans
);

/* =========================================================

   RÉCUPÉRER LES COMMANDES D'UN CHAUFFEUR

   GET /api/drivers/:id/orders

   COMPATIBILITÉ AVEC L'ANCIEN DASHBOARD

========================================================= */

router.get(
  "/:id/orders",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  driverController.getDriverOrders
);

/* =========================================================

   RÉCUPÉRER LE VÉHICULE D'UN CHAUFFEUR

   GET /api/drivers/:id/vehicle

========================================================= */

router.get(
  "/:id/vehicle",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher",
    "driver"
  ),

  driverController.getDriverVehicle
);

/* =========================================================

   ASSIGNER UN VÉHICULE À UN CHAUFFEUR

   PUT /api/drivers/:id/vehicle

========================================================= */

router.put(
  "/:id/vehicle",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.assignVehicle
);

/* =========================================================

   DÉSAFFECTER LE VÉHICULE D'UN CHAUFFEUR

   DELETE /api/drivers/:id/vehicle

========================================================= */

router.delete(
  "/:id/vehicle",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.unassignVehicle
);

/* =========================================================

   RÉCUPÉRER TOUS LES CHAUFFEURS

   GET /api/drivers

========================================================= */

router.get(
  "/",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.getDrivers
);

/* =========================================================

   RÉCUPÉRER UN CHAUFFEUR

   GET /api/drivers/:id

========================================================= */

router.get(
  "/:id",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.getDriver
);

/* =========================================================

   CRÉER UN CHAUFFEUR

   POST /api/drivers

========================================================= */

router.post(
  "/",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.createDriver
);

/* =========================================================

   MODIFIER UN CHAUFFEUR

   PUT /api/drivers/:id

========================================================= */

router.put(
  "/:id",

  authMiddleware,

  roleMiddleware(
    "super_admin",
    "dispatcher"
  ),

  driverController.updateDriver
);

/* =========================================================

   SUPPRIMER UN CHAUFFEUR

   DELETE /api/drivers/:id

========================================================= */

router.delete(
  "/:id",

  authMiddleware,

  roleMiddleware("super_admin"),

  driverController.deleteDriver
);

/* =========================================================

   EXPORT

========================================================= */

/* =========================================================

   MISSIONS REGROUPÉES DU CHAUFFEUR CONNECTÉ

   GET /api/drivers/me/dispatch-tasks
   GET /api/drivers/me/dispatch-tasks/:taskId

========================================================= */

router.get(
  "/me/dispatch-tasks",
  authMiddleware,
  roleMiddleware("driver"),
  driverDispatchTaskController.getMyDispatchTasks
);

router.get(
  "/me/dispatch-tasks/:taskId",
  authMiddleware,
  roleMiddleware("driver"),
  driverDispatchTaskController.getMyDispatchTaskById
);


router.post("/me/dispatch-tasks/:taskId/start",authMiddleware,roleMiddleware("driver"),driverDispatchTaskController.startMyStop);
router.put("/me/dispatch-tasks/:taskId/packages/:packageId/exception",authMiddleware,roleMiddleware("driver"),driverDispatchTaskController.savePackageException);
router.put("/me/dispatch-tasks/:taskId/operations/:operationId/proof",authMiddleware,roleMiddleware("driver"),driverDispatchTaskController.saveDeliveryProof);
router.get("/me/dispatch-tasks/:taskId/operations/:operationId/proof",authMiddleware,roleMiddleware("driver"),driverDispatchTaskController.getDeliveryProof);
router.post("/me/dispatch-tasks/:taskId/close",authMiddleware,roleMiddleware("driver"),driverDispatchTaskController.closeMyStop);

module.exports = router;