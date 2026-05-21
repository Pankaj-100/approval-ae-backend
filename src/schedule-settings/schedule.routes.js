const express = require("express");

const {
  createAppointment,
  getAppointments,
  getSingleAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAvailableSlots,
  createInspectionAppointment,
  rescheduleInspectionAppointment,
  cancelInspectionAppointment,
  getReviewerList,
} = require("./schedule.controller");

const route = express.Router();

// ================= CREATE APPOINTMENT =================
route.post("/create-appointment", createAppointment);

// ================= GET ALL APPOINTMENTS =================
route.get("/appointments", getAppointments);

// ================= GET SINGLE APPOINTMENT =================
route.get("/appointment/:appointmentId", getSingleAppointment);

// ================= CANCEL APPOINTMENT =================
route.patch("/cancel-appointment/:appointmentId", cancelAppointment);

// ================= RESCHEDULE APPOINTMENT =================
route.patch("/reschedule-appointment/:appointmentId", rescheduleAppointment);

// ================= GET AVAILABLE SLOTS =================
route.get("/available-slots", getAvailableSlots);

// ======================================================
// CREATE INSPECTION APPOINTMENT
// ======================================================
route.post("/create-inspection-appointment", createInspectionAppointment);

// ======================================================
// RESCHEDULE INSPECTION APPOINTMENT
// ======================================================
route.patch(
  "/reschedule-inspection-appointment/:appointmentId",
  rescheduleInspectionAppointment,
);

// ======================================================
// CANCEL INSPECTION APPOINTMENT
// ======================================================
route.patch(
  "/cancel-inspection-appointment/:appointmentId",
  cancelInspectionAppointment,
);

// ================= REVIEWER LIST =================
route.get("/reviewers", getReviewerList);

module.exports = route;
