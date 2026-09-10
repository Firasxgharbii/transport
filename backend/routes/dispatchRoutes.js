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

module.exports = router;