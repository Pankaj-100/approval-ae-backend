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
    plotId,
    floorId,
    unitId,

    usageType,
    totalUnitAreaSqm,
    areaVariationSqm,
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

  if (!plotId || !floorId || !unitId) {
    return next(new ErrorHandler("Plot, Floor and Unit are required", 400));
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
  // FETCH DATA (IMPORTANT)
  // =========================

  const plot = await PlotDetails.findById(plotId);
  const floor = await FloorDetails.findById(floorId);
  const unit = await Unit.findById(unitId);

  if (!plot || !floor || !unit) {
    return next(new ErrorHandler("Invalid selection", 400));
  }

  // =========================
  // DUPLICATE CHECK
  // =========================

  const exist = await ContractorApplication.findOne({
    unitId,
    isDeleted: false,
  });

  if (exist) {
    return next(new ErrorHandler("Application already exists", 400));
  }

  // =========================
  // CREATE
  // =========================

  const application = await ContractorApplication.create({
    plotId,
    floorId,
    unitId,

    // snapshot
    plotNumber: plot.plotNumber,
    buildingName: plot.buildingName,
    floorNumber: floor.floorName,
    unitNumber: unit.unitId,

    usageType,
    totalUnitAreaSqm,
    areaVariationSqm: areaVariationSqm || 0,

    hasMezzanine: hasMezzanine || false,
    totalUnitAreaAfterMezzanineSqm: hasMezzanine
      ? totalUnitAreaAfterMezzanineSqm
      : null,

    tenantName,
    tenantMobile,
    tenantEmail,

    ejariDocument,
    appointmentLetter,
    fitOutDrawings,
  });

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: application,
  });
});
