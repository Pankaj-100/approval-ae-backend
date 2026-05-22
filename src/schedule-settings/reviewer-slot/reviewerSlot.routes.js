const express = require("express");

const {
  blockReviewerSlots,
  getReviewerBlockedSlots,
  getAvailableSlots,
} = require("./reviewerSlot.controller");
const { auth } = require("../../../middleware/auth");

const route = express.Router();

// apply auth to all routes
route.use(auth);

// Block Slots
route.post("/block-slots", blockReviewerSlots);

// Get Blocked Slots
route.get("/blocked-slots", getReviewerBlockedSlots);

// Get Available Slots
route.get("/available-slots", getAvailableSlots);

module.exports = route;
