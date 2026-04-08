const express = require("express");

const { getBuildingByPlotNumber } = require("./building.controller");

const route = express.Router();

route.get("/:plotNumber", getBuildingByPlotNumber);

module.exports = route;
