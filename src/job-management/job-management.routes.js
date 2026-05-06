const express = require("express");
const {
  getAssignableUsers,
  assignEmployee,
  unassignEmployee,
  getApplicationDetails,
  getApplicationById,
  reviewApplication,
  getDrawingByApplicationId,
  reviewDrawingFile,
  uploadNOC,
  getWorkPermitByApplicationId,
  reviewWorkPermitFile,
  uploadWorkPermitDoc,
  getInspectionByApplicationId,
  reviewInspectionFile,
} = require("./job-management.controller");
const { uploadFile } = require("../plot/plot.controller");
const { upload } = require("../../utils/s3");

const route = express.Router();
route.post("/upload", upload.single("file"), uploadFile);
route.get("/users/assignable", getAssignableUsers);
route.patch("/application/:applicationId/assign", assignEmployee);
route.patch("/application/:applicationId/unassign", unassignEmployee);
route.get("/application/details", getApplicationDetails);
route.get("/application/:applicationId", getApplicationById);
route.patch("/application/:applicationId/review", reviewApplication);
route.get("/drawing/:applicationId", getDrawingByApplicationId);
route.post("/drawing/review", reviewDrawingFile);
route.post("/upload/noc", uploadNOC);
route.get("/work-permit/:applicationId", getWorkPermitByApplicationId);
route.post("/work-permit/review", reviewWorkPermitFile);
route.post("/upload/work-permit", uploadWorkPermitDoc);
route.get("/inspection-detail/:applicationId", getInspectionByApplicationId);
route.post("/inspection-detail/review", reviewInspectionFile);

module.exports = route;
