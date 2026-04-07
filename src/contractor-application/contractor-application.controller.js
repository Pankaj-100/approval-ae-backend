const PlotDetails = require("../plot/plot.model");
const FloorDetails = require("../floor/floor.model");
const Unit = require("../floor-unit/floor-unit.model");
const ContractorApplication = require("./contractor-application.model");
const ErrorHandler = require("../../utils/errorHandler");
const catchAsync = require("../../utils/catchAsyncError");

// =========================
// GET PLOT BY PLOT NUMBER
// =========================
exports.getPlotByPlotNumber = catchAsync(async (req, res, next) => {
  const { plotNumber } = req.params;

  if (!plotNumber) {
    return next(new ErrorHandler("Plot number is required", 400));
  }

  const plot = await PlotDetails.find({
    plotNumber,
    isDeleted: false,
    isActive: true,
  }).select("_id buildingName");

  if (!plot || plot.length === 0) {
    return next(new ErrorHandler("Plot not found", 404));
  }

  res.status(200).json({
    success: true,
    data: plot,
  });
});

// =========================
// GET FLOORS BY PLOT ID
// =========================
exports.getFloorsByPlotId = catchAsync(async (req, res, next) => {
  const { plotId } = req.params;

  if (!plotId) {
    return next(new ErrorHandler("Plot ID is required", 400));
  }

  const floors = await FloorDetails.find({
    plotId,
    isDeleted: false,
    isActive: true,
  }).select("_id floorName");

  if (!floors || floors.length === 0) {
    return next(new ErrorHandler("No floors found for this plot", 404));
  }

  res.status(200).json({
    success: true,
    data: floors,
  });
});

// =========================
// GET UNITS BY FLOOR ID
// =========================
exports.getUnitsByFloorId = catchAsync(async (req, res, next) => {
  const { floorId } = req.params;

  // validation
  if (!floorId) {
    return next(new ErrorHandler("Floor ID is required", 400));
  }

  // fetch units
  const units = await Unit.find({
    floorId,
    isDeleted: false,
  }).select("_id unitId usageType tenantName totalSqm");

  // check empty
  if (!units || units.length === 0) {
    return next(new ErrorHandler("No units found for this floor", 404));
  }

  // response
  res.status(200).json({
    success: true,
    data: units,
  });
});

exports.submitApplication = catchAsync(async (req, res, next) => {
  const {
    plotNumber,
    buildingName,
    floorNumber,
    unitNumber,

    unitType,
    usageType,

    areaVariationSqm,
    totalUnitAreaSqm,
    hasMezzanine,
    totalUnitAreaAfterMezzanineSqm,

    tenantName,
    tenantMobile,
    tenantEmail,

    ejariDocument,
    appointmentLetter,
    fitOutDrawings,
  } = req.body;

  // =========================
  // VALIDATION
  // =========================

  if (!plotNumber || !buildingName || !floorNumber || !unitNumber) {
    return next(
      new ErrorHandler("Plot, Building, Floor and Unit are required", 400),
    );
  }

  if (!usageType || !totalUnitAreaSqm) {
    return next(new ErrorHandler("Unit details missing", 400));
  }

  if (hasMezzanine && !totalUnitAreaAfterMezzanineSqm) {
    return next(
      new ErrorHandler("Mezzanine area is required when enabled", 400),
    );
  }

  // =========================
  // DUPLICATE CHECK
  // =========================

  const exist = await ContractorApplication.findOne({
    plotNumber,
    floorNumber,
    unitNumber,
    isDeleted: false,
  });

  if (exist) {
    return next(
      new ErrorHandler("Application already exists for this unit", 400),
    );
  }

  // =========================
  // CREATE APPLICATION
  // =========================

  const application = await ContractorApplication.create({
    plotNumber,
    buildingName,
    floorNumber,
    unitNumber,

    unitType: unitType || "Single Unit",
    usageType,

    areaVariationSqm: areaVariationSqm || 0,
    totalUnitAreaSqm,

    hasMezzanine: hasMezzanine || false,
    totalUnitAreaAfterMezzanineSqm: hasMezzanine
      ? totalUnitAreaAfterMezzanineSqm
      : null,

    tenantName: tenantName || null,
    tenantMobile: tenantMobile || null,
    tenantEmail: tenantEmail || null,

    ejariDocument: ejariDocument || null,
    appointmentLetter: appointmentLetter || null,
    fitOutDrawings: fitOutDrawings || null,
  });

  // =========================
  // RESPONSE
  // =========================

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: application,
  });
});
