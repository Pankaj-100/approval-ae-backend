const express = require("express");
const { getLandlordProjects } = require("./landlordList.controller");

const route = express.Router();

route.get("/:landlord_id/projects", getLandlordProjects);

module.exports = route;
