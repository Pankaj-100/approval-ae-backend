const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const ErrorHandler = require("../../../utils/errorHandler");
const Gate = require("./gate.model");

/**
 * Create a new gate
 */
exports.createGate = catchAsyncError(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name) {
    return next(new ErrorHandler("Gate name is required", 400));
  }

  // Check if gate already exists
  const existingGate = await Gate.findOne({
    name: name.toLowerCase(),
    isDeleted: false,
  });

  if (existingGate) {
    return next(new ErrorHandler("Gate already exists", 409));
  }

  const gate = await Gate.create({
    name: name.toLowerCase(),
    description,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Gate created successfully",
    data: gate,
  });
});

/**
 * Get all gates
 */
exports.getAllGates = catchAsyncError(async (req, res) => {
  const gates = await Gate.find({ isDeleted: false }).lean();

  res.json({
    success: true,
    data: gates,
  });
});

/**
 * Get a single gate with its permissions
 */
exports.getGateById = catchAsyncError(async (req, res, next) => {
  const gate = await Gate.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).lean();

  if (!gate) {
    return next(new ErrorHandler("Gate not found", 404));
  }

  res.json({
    success: true,
    data: gate,
  });
});

/**
 * Delete a gate (soft delete)
 */
exports.deleteGate = catchAsyncError(async (req, res, next) => {
  const gate = await Gate.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!gate) {
    return next(new ErrorHandler("Gate not found", 404));
  }

  gate.isDeleted = true;
  await gate.save();

  res.json({
    success: true,
    message: "Gate deleted successfully",
  });
});