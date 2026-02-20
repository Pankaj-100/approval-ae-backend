const express = require("express");

const {
  getAllDrawingSubmission,
  getDrawingSubmissionById,
  createDrawingSubmission,
  updateDrawingSubmission,
  deleteDrawingSubmission,
  updateFileStatus,
  updateSingleDrawingSubmission,
} = require("./drawing-submission.controller");
const { upload } = require("../../utils/s3");
const { uploadFile } = require("../plot/plot.controller");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.get("/", getAllDrawingSubmission);
route.get("/:id", getDrawingSubmissionById);
route.post("/", createDrawingSubmission);
route.put("/:id", updateDrawingSubmission);
route.put("./single-file/:id", updateSingleDrawingSubmission);
route.put("/approve/:id", updateFileStatus);
route.delete("/:id", deleteDrawingSubmission);

module.exports = route;
