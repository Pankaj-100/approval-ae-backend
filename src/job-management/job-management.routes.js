const express = require("express");
const {
  getAssignableUsers,
  assignEmployee,
  unassignEmployee,
} = require("./job-management.controller");

const route = express.Router();

route.get("/users/assignable", getAssignableUsers);
route.patch("/application/:applicationId/assign", assignEmployee);
route.patch("/application/:applicationId/unassign", unassignEmployee);

module.exports = route;
