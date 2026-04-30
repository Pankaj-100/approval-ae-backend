const express = require("express");
const {
  getAssignableUsers,
  assignEmployee,
  unassignEmployee,
  getApplicationDetails,
} = require("./job-management.controller");

const route = express.Router();

route.get("/users/assignable", getAssignableUsers);
route.patch("/application/:applicationId/assign", assignEmployee);
route.patch("/application/:applicationId/unassign", unassignEmployee);
route.get("/application/details", getApplicationDetails);

module.exports = route;
