const express = require("express");
const { auth } = require("../../../middleware/auth");
const authorize = require("../../../middleware/authorization");
const controller = require("./document.controller");

const router = express.Router();

/**
 * Documents endpoint
 * Priority 1 (view) - Read documents
 * Priority 2 (edit) - Update documents
 * Priority 3 (delete) - Delete documents
 */

// View documents - requires gate "documents" with priority 1+
router.get("/", auth, authorize("documents", 1), controller.viewDocuments);

// Edit documents - requires gate "documents" with priority 2+
router.put("/", auth, authorize("documents", 2), controller.editDocuments);

// Delete documents - requires gate "documents" with priority 3+
router.delete("/", auth, authorize("documents", 3), controller.deleteDocuments);

/**
 * Approvals endpoint
 * Priority 1 (approve) - Approve documents
 * Priority 2 (reject) - Reject documents
 */

// Approve documents - requires gate "approvals" with priority 1+
router.post("/approve", auth, authorize("approvals", 1), controller.approveDocuments);

// Reject documents - requires gate "approvals" with priority 2+
router.post("/reject", auth, authorize("approvals", 2), controller.rejectDocuments);

module.exports = router;
