const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/error");
const dotenv = require("dotenv");

const superAdminRoutes = require("./src/modules/superadmin/superadmin.routes");
const roleRoutes = require("./src/modules/role/role.route");
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
   ROUTES
========================= */

app.use("/api/v1/superadmin", superAdminRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/contractor", contractorRoutes);
app.use("/api/v1/landlord", lanlordRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({ message: "API is working 🚀" });
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