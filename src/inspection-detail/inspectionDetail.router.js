const express = require("express");

const {
  submitInspection,
  getAllInspection,
  getInspectionVersions,
  reviewInspection,
  reuploadInspection,
} = require("./inspectionDetail.controller");
const { auth } = require("../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.post("/submit", submitInspection);
route.get("/all", getAllInspection);
route.get("/versions", getInspectionVersions);
route.post("/review", reviewInspection);
route.post("/reupload", reuploadInspection);

module.exports = route;
