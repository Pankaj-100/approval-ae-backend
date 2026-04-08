
const PlotDetails = require("../plot/plot.model");
const BuildingDetails = require("../Building/building.model");
const FloorDetails = require("../floor/floor.model");
const Unit = require("../floor-unit/floor-unit.model");
const ContractorApplication = require("./contractor-application.model");
const ErrorHandler = require("../../utils/errorHandler");
const catchAsync = require("../../utils/catchAsyncError");


exports.getBuildingByPlotNumber = catchAsync(async (req, res, next) => {
  const { plotNumber } = req.params;

  if (!plotNumber) {
    return next(new ErrorHandler("Plot number is required", 400));
  }
  
  const plot = await PlotDetails.findOne({
    plotNumber,
    isDeleted: false,
    isActive: true,
  });

  if (!plot) {
    return next(new ErrorHandler("Plot not found", 404));
  }

  const building = await BuildingDetails.findOne({
    plotId: plot._id,
    isDeleted: false,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: building,
  });
});

