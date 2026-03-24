const express = require("express");
const { auth, isAdmin } = require("../../../middleware/auth");
const controller = require("./role.controller");

const router = express.Router();

/**
 * Role CRUD routes (Admin only)
 */
router.post("/", auth, isAdmin, controller.createRole);
router.get("/", auth, controller.getRoles);

/**
 * Gates - for admin panel
 */
router.get("/gates/list", auth, isAdmin, controller.getGates);

/**
 * Get role gates with enabled/disabled status
 * Shows which gates are enabled for a specific role
 * Used to display toggle button states in admin panel
 */
router.get("/:roleId/gates", auth, isAdmin, controller.getRoleGates);

/**
 * Gate Toggle routes (Admin only)
 * One toggle button toggles all 3 permissions (view, edit, change_status) for a gate
 */
// Toggle entire gate for role
router.post("/gate/toggle", auth, isAdmin, controller.toggleRoleGate);

// Toggle entire gate for user
router.post("/user/gate/toggle", auth, isAdmin, controller.toggleUserGate);

module.exports = router;