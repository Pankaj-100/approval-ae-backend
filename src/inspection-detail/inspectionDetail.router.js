const express = require("express");

const {
  submitInspection,
  getAllInspection,
  getInspectionVersions,
  reviewInspection,
  reuploadInspection,
} = require("./inspectionDetail.controller");

const route = express.Router();

route.post("/submit", submitInspection);
route.get("/all", getAllInspection);
route.get("/versions", getInspectionVersions);
route.post("/review", reviewInspection);
route.post("/reupload", reuploadInspection);

module.exports = route;
