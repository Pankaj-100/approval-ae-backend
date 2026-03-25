const express = require("express");

const {
  getAllInspectionDetails,
  createInspectionDetail,
  deleteInspectionDetail,
  updateInspectionFileStatus,
  updateSingleInspectionFile,
} = require("./inspectionDetail.controller");

const route = express.Router();

route.get("/", getAllInspectionDetails);
route.post("/", createInspectionDetail);
route.put("/:id", updateInspectionFileStatus);
route.put("single-file/:id", updateSingleInspectionFile);
route.delete("/:id", deleteInspectionDetail);

module.exports = route;
