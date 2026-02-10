const express = require("express");
const {
  createPlot,
  deletePlot,
  getAllPlots,
  updatePlot,
  getPlotById,
  uploadFile,
} = require("./plot.controller");
const { upload } = require("../../utils/s3");

const route = express.Router();

route.post("/upload", upload.single("file"), uploadFile);
route.post("/", createPlot);
route.put("/:id", updatePlot);
route.get("/", getAllPlots);
route.get("/:id", getPlotById);
route.delete("/:id", deletePlot);

module.exports = route;
