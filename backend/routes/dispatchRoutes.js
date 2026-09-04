const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  getDispatchOrders,
  getDispatchOrderIds,
  bulkUpdateOrders,
  reorderOrders,
} = require("../controllers/dispatchController");

const router = express.Router();
router.use(authMiddleware);
router.get("/orders", roleMiddleware("super_admin", "dispatcher"), getDispatchOrders);
router.get("/order-ids", roleMiddleware("super_admin", "dispatcher"), getDispatchOrderIds);
router.patch("/bulk", roleMiddleware("super_admin", "dispatcher"), bulkUpdateOrders);
router.patch("/reorder", roleMiddleware("super_admin", "dispatcher"), reorderOrders);
module.exports = router;
