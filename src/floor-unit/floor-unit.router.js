const express = require("express");
const {
  createUnit,
  updateUnit,
  getUnitsByFloorId,
  getUnitsByPlotId,
  getUnitWithFloor,
  getUnitById,
  deleteUnit,
  getAllUnits,
} = require("./floor-unit.controller");

const route = express.Router();

route.post("/", createUnit);
route.get("/floor/:floorId", getUnitsByFloorId);
route.get("/unit/plot/:plotId", getUnitsByPlotId);
route.get("/unit/:unitId", getUnitWithFloor);
route.put("/:id", updateUnit);
route.get("/:id", getUnitById);
route.get("/", getAllUnits);
route.delete("/:id", deleteUnit);

module.exports = route;
