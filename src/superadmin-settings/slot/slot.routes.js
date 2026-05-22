const express = require("express");
const { createSlotTiming, getSlotTiming } = require("./slot.controller");
const { auth } = require("../../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.post("/create/slot", createSlotTiming);
route.get("/slots", getSlotTiming);

module.exports = route;
