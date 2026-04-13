const express = require("express");

const {
  submitDrawing,
  getAllDrawings,
  getDocumentVersions,
  reviewDrawing,
  reuploadDrawing,
} = require("./drawing-submission.controller");
const { upload } = require("../../utils/s3");
const { uploadFile } = require("../plot/plot.controller");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.post("/submit", submitDrawing);
route.get("/all", getAllDrawings);
route.get("/versions", getDocumentVersions);
route.post("/review", reviewDrawing);
route.post("/reupload", reuploadDrawing);

module.exports = route;
