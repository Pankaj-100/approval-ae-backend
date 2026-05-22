const express = require("express");
const { createPricing, getPricing } = require("./pricing.controller");
const { auth } = require("../../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.post("/create/pricing", createPricing);
route.get("/pricing", getPricing);

module.exports = route;
