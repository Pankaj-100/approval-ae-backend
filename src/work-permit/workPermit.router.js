const express = require("express");
const {
  getAllWorkPermit,
  getWorkPermitById,
  createWorkPermit,
  deleteWorkPermit,
  updateSingleWorkPermitFile,
  updateWorkPermitFileStatus,
} = require("./workPermit.controller");
const { upload } = require("../../utils/s3");
const { uploadFile } = require("../plot/plot.controller");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.post("/", createWorkPermit);
route.get("/", getAllWorkPermit);
route.get("/:id", getWorkPermitById);
route.put("./single-file/:id", updateSingleWorkPermitFile);
route.put("/approve/:id", updateWorkPermitFileStatus);
route.delete("/:id", deleteWorkPermit);

module.exports = route;
