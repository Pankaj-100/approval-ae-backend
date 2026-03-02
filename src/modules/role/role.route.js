const express = require("express");
const { createRole, getRoles } = require("./role.controller");

const router = express.Router();

router.post("/", createRole);   // Later protect with auth("SUPER_ADMIN")
router.get("/", getRoles);

module.exports = router;