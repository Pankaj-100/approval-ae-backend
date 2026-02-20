const express = require("express");

const {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("./policy-management.controller");

const route = express.Router();

route.get("/", getAllPolicies);
route.get("/:id", getPolicyById);
route.post("/", createPolicy);
route.put("/:id", updatePolicy);
route.delete("/:id", deletePolicy);

module.exports = route;
