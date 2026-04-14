const express = require("express");
const {
  submitWorkPermit,
  getWorkPermitVersions,
  reviewWorkPermit,
  reuploadWorkPermit,
  getAllWorkPermit,
} = require("./workPermit.controller");
const { upload } = require("../../utils/s3");
const { uploadFile } = require("../plot/plot.controller");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.post("/submit", submitWorkPermit);
route.get("/all", getAllWorkPermit);
route.get("/versions", getWorkPermitVersions);
route.post("/review", reviewWorkPermit);
route.post("/reupload", reuploadWorkPermit);

module.exports = route;
