const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middlewares/error");
const dotenv = require("dotenv");
const app = express();
const userRoute = require("./src/user/user.router");
const plotRoute = require("./src/plot/plot.router");
const floorRoute = require("./src/floor/floor.router");
const floorUnitRoute = require("./src/floor-unit/floor-unit.router");
const approvedDocumentRoute = require("./src/approved-documents/approved-documents.router");
const policyManagementRoute = require("./src/policy-management/policy-management.router");
const contractorApplicationRoute = require("./src/contractor-application/contractor-application.router");
const drawingSubmissionRoute = require("./src/drawing-submission/drawing-submission.router");
dotenv.config({ path: "./config/config.env" });

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true,
  }),
);

app.use("/api/v1/users", userRoute);
app.use("/api/v1/plots", plotRoute);
app.use("/api/v1/floors", floorRoute);
app.use("/api/v1/floor-units", floorUnitRoute);
app.use("/api/v1/approved-documents", approvedDocumentRoute);
app.use("/api/v1/policy-management", policyManagementRoute);
app.use("/api/v1/contractor-application", contractorApplicationRoute);
app.use("/api/v1/drawing-submission", drawingSubmissionRoute);

app.get("/", (req, res, next) => res.json({ message: "API is working" }));

app.all("*", async (req, res) => {
  res.status(404).json({
    error: {
      message: "Not Found. Kindly Check the API path as well as request type",
    },
  });
});
app.use(errorMiddleware);

module.exports = app;
