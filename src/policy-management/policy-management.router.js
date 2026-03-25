const express = require("express");

const {
  createPolicy,
  getAllPolicies,
  getSinglePolicy,
  updatePolicy,
  deletePolicy,
} = require("./policy-management.controller");

const route = express.Router();

route.post("/content", createPolicy);
route.get("/content", getAllPolicies);
route.get("/single-content", getSinglePolicy);
route.put("/content/:id", updatePolicy);
route.delete("/content/:id", deletePolicy);

module.exports = route;
