const express = require("express");
const {
  createUser,
  getUsers,
  deleteUser,
  getUserTypes,
  getUserDetails,
  updateUser,
  getUserProjects,
} = require("./userManagemnet.controller");
const { auth } = require("../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.post("/users", createUser);
route.get("/users", getUsers);
route.delete("/users/:user_id", deleteUser);
route.get("/users/types", getUserTypes);
route.get("/user/:user_id", getUserDetails);
route.put("/user/:user_id", updateUser);
route.get("/user/:user_id/projects", getUserProjects);

module.exports = route;
