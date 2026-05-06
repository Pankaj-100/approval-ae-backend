const express = require("express");
const { createSlotTiming, getSlotTiming } = require("./slot.controller");

const route = express.Router();

route.post("/create/slot", createSlotTiming);
route.get("/slots", getSlotTiming);

module.exports = route;
