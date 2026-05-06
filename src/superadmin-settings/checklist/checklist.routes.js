const express = require("express");

const {
  createChecklist,
  getChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  deleteChecklist,
  reorderChecklistItems,
  updateChecklist,
} = require("./checklist.controller");

const route = express.Router();

// ================= CHECKLIST CATEGORY =================

// Create Checklist Category
route.post("/create/checklist", createChecklist);

// Get Checklist By Type
route.get("/checklist", getChecklist);

// Delete Checklist Category
route.delete("/delete/checklist/:checklistId", deleteChecklist);

// ================= CHECKLIST ITEMS =================

// Add Checklist Item
route.post("/add/:checklistId/checklist-item", addChecklistItem);

// Update Checklist Item
route.put("/update/:checklistId/checklist-item/:itemId", updateChecklistItem);

// Delete Checklist Item
route.delete(
  "/delete/:checklistId/checklist-item/:itemId",
  deleteChecklistItem,
);

route.patch("/reorder/:checklistId/checklist-item", reorderChecklistItems);

route.put("/update/checklist/:checklistId", updateChecklist);

module.exports = route;
