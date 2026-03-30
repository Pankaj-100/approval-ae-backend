const express = require("express");
const {
  createUser,
  getUsers,
  deleteUser,
} = require("./userManagemnet.controller");

const route = express.Router();

// POST /api/v1/superadmin/users
route.post("/users", createUser);
route.get("/users", getUsers);
route.delete("/users/:user_id", deleteUser);

module.exports = route;
