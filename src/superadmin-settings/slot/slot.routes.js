const express = require("express");
const {
  createSlotTiming,
  getSlotTiming,
  deleteSlotTiming,
  removeSlot,
} = require("./slot.controller");
const { auth } = require("../../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.post("/create/slot", createSlotTiming);
route.get("/slots", getSlotTiming);
route.patch("/remove/slot", removeSlot);

module.exports = route;
