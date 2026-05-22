const express = require("express");
const {
  createUser,
  getUsers,
  deleteUser,
} = require("./userManagemnet.controller");
const { auth } = require("../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.post("/users", createUser);
route.get("/users", getUsers);
route.delete("/users/:user_id", deleteUser);

module.exports = route;
