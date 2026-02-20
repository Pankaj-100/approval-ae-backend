const express = require("express");
const {
  createFloor,
  deleteFloor,
  getFloorById,
  getFloorsByPlotId,
  updateFloor,
  getAllFloors,
} = require("./floor.controller");
const { upload } = require("../../utils/s3");
const { uploadFile } = require("../plot/plot.controller");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.post("/", createFloor);
route.put("/:id", updateFloor);
route.get("/plot/:plotId", getFloorsByPlotId);
route.get("/:id", getFloorById);
route.get("/", getAllFloors);
route.delete("/:id", deleteFloor);

module.exports = route;
