const express = require("express");

const {
  getUnitsByFloorId,
  submitApplication,
  getBuildingsByPlotNumber,
  getFloorsByBuildingId,
} = require("./contractor-application.controller");

const route = express.Router();

route.get("/building/:plotNumber", getBuildingsByPlotNumber);
route.get("/floor/:buildingId", getFloorsByBuildingId);
route.get("/unit/:floorId", getUnitsByFloorId);
route.post("/submit-application", submitApplication);

module.exports = route;
