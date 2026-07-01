require("dotenv").config({ path: "./config/config.env" });
const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/error");

// RBAC Routes
const roleRoutes = require("./src/modules/role/role.route");
const gateRoutes = require("./src/modules/gate/gate.route");
const permissionRoutes = require("./src/modules/permission/permission.route");
const documentRoutes = require("./src/modules/document/document.routes");

// Existing Routes
const superAdminRoutes = require("./src/modules/superadmin/superadmin.routes");
const contractorRoutes = require("./src/modules/contractor/contractor.routes");
const lanlordRoutes = require("./src/modules/landlord/landlord.routes");
const architectRoutes = require("./src/modules/architect/architect.routes");
const reviewEngineerRoutes = require("./src/modules/review-engineer/review-engineer.routes");
const inspectionAgentRoutes = require("./src/modules/inspection-agent/inspection-agent.routes");
const subAdminRoutes = require("./src/modules/sub-admin/sub-admin.routes");
const jobManagementRoutes = require("./src/job-management/job-management.routes");
const plotRoutes = require("./src/plot/plot.router");
const workPermitRoutes = require("./src/work-permit/workPermit.router");
const floorRoutes = require("./src/floor/floor.router");
const floorUnitRoutes = require("./src/floor-unit/floor-unit.router");
const contractorApplicationRoutes = require("./src/contractor-application/contractor-application.router");
const policyRoutes = require("./src/policy-management/policy-management.router");
const drawingSubmissionRoutes = require("./src/drawing-submission/drawing-submission.router");
const approvedDocumentRoutes = require("./src/approved-documents/approved-documents.router");
const inspectionRoutes = require("./src/inspection-detail/inspectionDetail.router");
const userManagementRoutes = require("./src/user-management/userManagement.router");
const landlordListRoutes = require("./src/landlordList/landlordList.router");
const buildingRoutes = require("./src/Building/building.router");
const slotRoutes = require("./src/superadmin-settings/slot/slot.routes");
const pricingRoutes = require("./src/superadmin-settings/pricing/pricing.routes");
const checklistRoutes = require("./src/superadmin-settings/checklist/checklist.routes");
const scheduleSlot = require("./src/schedule-settings/schedule.routes");
const reviewerSlot = require("./src/schedule-settings/reviewer-slot/reviewerSlot.routes");
const subAdminApplicationRoutes = require("./src/sub-admin-management/sub-admin-management.routes");
const auth = require("./src/modules/auth/auth.routes");

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true,
  }),
);

/* =========================
   API ROUTES
========================= */

// Authentication

// RBAC Management
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/gates", gateRoutes);
app.use("/api/v1/permissions", permissionRoutes);

// Resources
app.use("/api/v1/documents", documentRoutes);

// Existing Routes
app.use("/api/v1/superadmin", superAdminRoutes);
app.use("/api/v1/contractor", contractorRoutes);
app.use("/api/v1/landlord", lanlordRoutes);
app.use("/api/v1/architect", architectRoutes);
app.use("/api/v1/review-engineer", reviewEngineerRoutes);
app.use("/api/v1/inspection-agent", inspectionAgentRoutes);
app.use("/api/v1/sub-admin", subAdminRoutes);
app.use("/api/v1/job-management", jobManagementRoutes);
app.use("/api/v1/plot", plotRoutes);
app.use("/api/v1/work-permit", workPermitRoutes);
app.use("/api/v1/floor", floorRoutes);
app.use("/api/v1/floor-unit", floorUnitRoutes);
app.use("/api/v1/contractor-application", contractorApplicationRoutes);
app.use("/api/v1/policy-management", policyRoutes);
app.use("/api/v1/drawing-submission", drawingSubmissionRoutes);
app.use("/api/v1/approved-documents", approvedDocumentRoutes);
app.use("/api/v1/inspection-detail", inspectionRoutes);
app.use("/api/v1/user-management", userManagementRoutes);
app.use("/api/v1/landlord", landlordListRoutes);
app.use("/api/v1/building", buildingRoutes);
app.use("/api/v1/slot-settings", slotRoutes);
app.use("/api/v1/pricing-settings", pricingRoutes);
app.use("/api/v1/checklist-settings", checklistRoutes);
app.use("/api/v1/schedule-slot", scheduleSlot);
app.use("/api/v1/reviewer-slot", reviewerSlot);
// app.use("/api/v1/sub-admin/application", subAdminApplicationRoutes);
app.use("/api/v1/auth", auth);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    message: "API is working 🚀",
    version: "1.0.0",
    status: "RBAC Backend",
    endpoints: {
      auth: "/api/v1/auth",
      roles: "/api/v1/roles",
      gates: "/api/v1/gates",
      permissions: "/api/v1/permissions",
      documents: "/api/v1/documents",
    },
  });
});

/* =========================
   404 HANDLER
========================= */
app.all("*", async (req, res) => {
  res.status(404).json({
    error: {
      message: "Not Found. Kindly check API path and method",
    },
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use(errorMiddleware);

module.exports = app;
