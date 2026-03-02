const express = require("express");
const { createPermission } = require("./permission.controller");

const router = express.Router();
router.post("/", createPermission);

module.exports = router;