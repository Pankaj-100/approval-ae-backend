const express = require("express");
const {
  getAssignableUsers,
  assignEmployee,
  unassignEmployee,
  getApplicationDetails,
  getApplicationById,
  reviewApplication,
  getDrawingByApplicationId,
} = require("./job-management.controller");

const route = express.Router();

route.get("/users/assignable", getAssignableUsers);
route.patch("/application/:applicationId/assign", assignEmployee);
route.patch("/application/:applicationId/unassign", unassignEmployee);
route.get("/application/details", getApplicationDetails);
route.get("/application/:applicationId", getApplicationById);
route.patch("/application/:applicationId/review", reviewApplication);
route.get("/drawing/:applicationId", getDrawingByApplicationId);

module.exports = route;
