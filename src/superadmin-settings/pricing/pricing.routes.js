const express = require("express");
const { createPricing, getPricing } = require("./pricing.controller");

const route = express.Router();

route.post("/create/pricing", createPricing);
route.get("/pricing", getPricing);

module.exports = route;
