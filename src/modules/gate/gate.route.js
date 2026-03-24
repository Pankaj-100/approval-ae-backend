const express = require("express");
const { auth, isAdmin } = require("../../../middleware/auth");
const controller = require("./gate.controller");

const router = express.Router();

/**
 * Admin only routes
 */
router.post("/", auth, isAdmin, controller.createGate);
router.delete("/:id", auth, isAdmin, controller.deleteGate);

/**
 * Public routes (authenticated)
 */
router.get("/", auth, controller.getAllGates);
router.get("/:id", auth, controller.getGateById);

module.exports = router;