const express = require("express");

const {
  getPlotByPlotNumber,
  getFloorsByPlotId,
} = require("./contractor-application.controller");

const route = express.Router();

route.get("/plot/:plotNumber", getPlotByPlotNumber);
route.get("/floor/plot/:plotId", getFloorsByPlotId);

module.exports = route;
