const express = require("express");
const { auth, isAdmin } = require("../../../middleware/auth");
const controller = require("./permission.controller");

const router = express.Router();

/**
 * Admin only routes
 */
router.post("/", auth, isAdmin, controller.createPermission);
router.put("/:id", auth, isAdmin, controller.updatePermission);
router.delete("/:id", auth, isAdmin, controller.deletePermission);

/**
 * Public routes (authenticated)
 */
router.get("/", auth, controller.getAllPermissions);
router.get("/by-gate/:gateName", auth, controller.getPermissionsByGate);
router.get("/:id", auth, controller.getPermissionById);

module.exports = router;