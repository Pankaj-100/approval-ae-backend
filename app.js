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
