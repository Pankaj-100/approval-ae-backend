const express = require("express");

const {
  getPlotByPlotNumber,
  getFloorsByPlotId,
  getUnitsByFloorId,
  submitApplication,
} = require("./contractor-application.controller");

const route = express.Router();

route.get("/plot/:plotNumber", getPlotByPlotNumber);
route.get("/floor/plot/:plotId", getFloorsByPlotId);
route.get("/unit/:floorId", getUnitsByFloorId);
route.post("/submit-application", submitApplication);

module.exports = route;
