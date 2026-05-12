const express = require("express");

const {
  createPolicy,
  getAllPolicies,
  getSinglePolicy,
  updatePolicy,
  deletePolicy,
  getPolicyForUser,
} = require("./policy-management.controller");
const { auth } = require("../../middleware/auth");

const route = express.Router();

route.post("/content", createPolicy);
route.get("/content", getAllPolicies);
route.get("/single-content", getSinglePolicy);
route.put("/content/:id", updatePolicy);
route.delete("/content/:id", deletePolicy);
route.get("/user/content", auth, getPolicyForUser);

module.exports = route;
