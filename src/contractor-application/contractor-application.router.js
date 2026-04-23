const express = require("express");

const {
  getUnitsByFloorId,
  // submitApplication,
  getBuildingsByPlotNumber,
  getFloorsByBuildingId,
  getAllApplications,
  getApplicationById,
  submitApplicationSingle,
  submitApplicationRedesign,
} = require("./contractor-application.controller");
const { uploadFile } = require("../plot/plot.controller");
const { upload } = require("../../utils/s3");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.get("/application", getAllApplications);
route.get("/building/:plotNumber", getBuildingsByPlotNumber);
route.get("/floor/:buildingId", getFloorsByBuildingId);
route.get("/unit/:floorId", getUnitsByFloorId);
// route.post("/submit-application", submitApplication);
route.get("/:id", getApplicationById);
route.post("/submit-application", (req, res, next) => {
  if (req.body.unitType === "Redesign Unit") {
    return submitApplicationRedesign(req, res, next);
  }
  return submitApplicationSingle(req, res, next);
});

module.exports = route;
