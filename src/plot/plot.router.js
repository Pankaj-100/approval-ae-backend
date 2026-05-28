const express = require("express");
const {
  createPlot,
  deletePlot,
  getAllPlots,
  updatePlot,
  getPlotById,
  uploadFile,
  createProject,
  getAllProjects,
  addFloorToProject,
  deleteFloor,
  getProjectFloors,
  getUnitsByFloor,
  addUnit,
  deleteUnit,
  getUnitDetailsWithApplication,
  getProjectDetails,
  getPlotDocuments,
  getFloorDocuments,
  getApplicationDocuments,
  getUnitUsers,
} = require("./plot.controller");
const { upload } = require("../../utils/s3");
const { auth } = require("../../middleware/auth");

const route = express.Router();

// apply auth on all routes
route.use(auth);

route.get("/all", getAllProjects);
route.post("/upload", upload.single("file"), uploadFile);
route.post("/create-project", createProject);
route.post("/", createPlot);
route.put("/:id", updatePlot);
route.get("/", getAllPlots);
route.get("/:id", getPlotById);
route.delete("/:id", deletePlot);
route.post("/add-floor/:buildingId", addFloorToProject);
route.delete("/delete-floor/:floorId", deleteFloor);
route.get("/project-floors/:buildingId", getProjectFloors);
route.get("/units/:floorId", getUnitsByFloor);
route.post("/add-unit/:buildingId/:floorId", addUnit);
route.delete("/delete-unit/:unitId", deleteUnit);
route.get("/unit-details/:unitId", getUnitDetailsWithApplication);
route.get("/project-details/:buildingId", getProjectDetails);
route.get("/building-documents/:plotId", getPlotDocuments);
route.get("/floor-documents/:floorId", getFloorDocuments);
route.get("/rental-documents/:applicationId", getApplicationDocuments);
route.get("/unit-involved-users/:unitId", getUnitUsers);

module.exports = route;
