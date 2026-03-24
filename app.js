const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/error");
const dotenv = require("dotenv");

// RBAC Routes
const roleRoutes = require("./src/modules/role/role.route");
const gateRoutes = require("./src/modules/gate/gate.route");
const permissionRoutes = require("./src/modules/permission/permission.route");
const documentRoutes = require("./src/modules/document/document.routes");

// Existing Routes
const superAdminRoutes = require("./src/modules/superadmin/superadmin.routes");
const contractorRoutes = require("./src/modules/contractor/contractor.routes");
const lanlordRoutes = require("./src/modules/landlord/landlord.routes");

dotenv.config({ path: "./config/config.env" });

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
      documents: "/api/v1/documents"
    }
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