const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getDispatchOrders,
  getDispatchOrderIds,
  bulkUpdateOrders,
  reorderOrders,
  getOrderOperations,
  createOrderOperation,
  updateOrderOperation,
  deleteOrderOperation,
  getWarehouseScanHistory,
  scanWarehousePackage,
} = require("../controllers/dispatchController");


const {
  createGroupedPickupTask,
  createGroupedDeliveryTask,
} = require("../controllers/dispatchTaskController");

const {
  getAdminDispatchTasks,
  deleteAdminDispatchTask,
} = require("../controllers/adminDispatchTaskController");

const {
  createRoute,
  getRoutes,
  getArchivedRoutes,
  getRouteById,
  getSectors,
  createSector,
} = require("../controllers/dispatchRouteController");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/orders",
  roleMiddleware("super_admin", "dispatcher"),
  getDispatchOrders,
);

router.get(
  "/order-ids",
  roleMiddleware("super_admin", "dispatcher"),
  getDispatchOrderIds,
);

router.patch(
  "/bulk",
  roleMiddleware("super_admin", "dispatcher"),
  bulkUpdateOrders,
);

router.patch(
  "/reorder",
  roleMiddleware("super_admin", "dispatcher"),
  reorderOrders,
);

/* =====================================================
   SCANNER ENTREPÔT / DISPATCH
   IMPORTANT :
   - routes réservées à super_admin et dispatcher
   - scanned_by_user_id est récupéré côté contrôleur depuis le JWT
===================================================== */

router.get(
  "/warehouse/scans",
  roleMiddleware("super_admin", "dispatcher"),
  getWarehouseScanHistory,
);

router.post(
  "/warehouse/scan",
  roleMiddleware("super_admin", "dispatcher"),
  scanWarehousePackage,
);

router.get(
  "/orders/:orderId/operations",
  roleMiddleware("super_admin", "dispatcher"),
  getOrderOperations,
);

router.post(
  "/orders/:orderId/operations",
  roleMiddleware("super_admin", "dispatcher"),
  createOrderOperation,
);

router.patch(
  "/operations/:operationId",
  roleMiddleware("super_admin", "dispatcher"),
  updateOrderOperation,
);

router.delete(
  "/operations/:operationId",
  roleMiddleware("super_admin", "dispatcher"),
  deleteOrderOperation,
);


/* MISSIONS REGROUPÉES */

router.get(
  "/tasks",
  roleMiddleware("super_admin", "dispatcher"),
  getAdminDispatchTasks,
);

router.delete(
  "/tasks/:taskId",
  roleMiddleware("super_admin", "dispatcher"),
  deleteAdminDispatchTask,
);



router.post(
  "/tasks/pickup",
  roleMiddleware("super_admin", "dispatcher"),
  createGroupedPickupTask,
);

router.post(
  "/tasks/delivery",
  roleMiddleware("super_admin", "dispatcher"),
  createGroupedDeliveryTask,
);


/* SECTEURS PERSONNALISÉS */
router.get("/sectors", roleMiddleware("super_admin", "dispatcher"), getSectors);
router.post("/sectors", roleMiddleware("super_admin", "dispatcher"), createSector);

/* ROUTES DE TRANSPORT */

router.get(
  "/routes",
  roleMiddleware("super_admin", "dispatcher"),
  getRoutes,
);

router.get(
  "/routes/archive",
  roleMiddleware("super_admin", "dispatcher"),
  getArchivedRoutes,
);

router.get(
  "/routes/archive/:archiveId",
  roleMiddleware("super_admin", "dispatcher"),
  getArchivedRouteById,
);

router.get(
  "/routes/:routeId",
  roleMiddleware("super_admin", "dispatcher"),
  getRouteById,
);

router.post(
  "/routes",
  roleMiddleware("super_admin", "dispatcher"),
  createRoute,
);


/* FICHE DE ROUTE — ADMIN / DISPATCHER */
const routeControl = require("../controllers/dispatchRouteController");
const routeRoles = roleMiddleware("super_admin", "dispatcher");
router.get("/unassigned-operations", routeRoles, routeControl.unassignedOperations);
router.get("/available-route-stops", routeRoles, routeControl.availableRouteStops);
router.get("/route-choices", routeRoles, routeControl.routeChoices);
router.post("/routes/:routeId/stops/assign", routeRoles, routeControl.assignRouteStop);
router.get("/routes/:routeId/history", routeRoles, routeControl.routeHistory);
router.get("/routes/:routeId/removal-history", routeRoles, routeControl.routeRemovalHistory);
router.get("/triage", routeRoles, routeControl.triageOperations);
router.patch("/routes/:routeId/stops/order", routeRoles, routeControl.reorderRouteStops);
router.delete("/routes/:routeId/stops/:stopId", routeRoles, routeControl.detachRouteStop);
router.delete("/routes/:routeId/stops/:stopId/operations/:operationId", routeRoles, routeControl.detachRouteOperation);
router.post("/routes/:routeId/stops/:stopId/reopen", routeRoles, routeControl.reopenRouteStop);
router.delete("/routes/:routeId/stops/:stopId/operations/:operationId/packages/:packageId", routeRoles, routeControl.detachRoutePackage);
router.patch("/routes/:routeId/stops/:stopId/operations/:operationId/packages/:packageId/status", routeRoles, routeControl.correctRoutePackage);

router.get('/route-crew-choices',routeRoles,routeControl.routeCrewChoices);
router.patch('/routes/:routeId/crew',routeRoles,routeControl.assignRouteCrew);
router.post('/routes/:routeId/operations/assign',routeRoles,routeControl.assignIndividualOperation);
router.post('/routes/:routeId/operations/group',routeRoles,routeControl.groupRouteOperations);
router.post('/routes/:routeId/orders/:orderId/:operationType/assign',routeRoles,routeControl.assignOrderOperation);
router.post('/routes/:routeId/complete',routeRoles,routeControl.completeRoute);
router.delete('/routes/:routeId',routeRoles,routeControl.deleteRoute);
module.exports = router;