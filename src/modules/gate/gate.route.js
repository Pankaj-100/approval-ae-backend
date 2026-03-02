const express = require("express");
const { createGate } = require("./gate.controller");

const router = express.Router();
router.post("/", createGate);

module.exports = router;