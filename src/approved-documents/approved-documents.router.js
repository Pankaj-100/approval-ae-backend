const express = require("express");

const {
  getAllApprovedDocuments,
  getApprovedDocument,
  createApprovedDocument,
  updateApprovedDocument,
  deleteApprovedDocument,
} = require("./approved-documents.controller");
const { upload } = require("../../utils/s3");
const { uploadFile } = require("../plot/plot.controller");

const route = express.Router();

route.post("/", upload.single("file"), uploadFile);
route.post("/:floorId", createApprovedDocument);
route.get("/", getAllApprovedDocuments);
route.get("/:id", getApprovedDocument);
route.put("/:id", updateApprovedDocument);
route.delete("/:id", deleteApprovedDocument);

module.exports = route;
