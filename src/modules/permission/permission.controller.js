const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const ErrorHandler = require("../../../utils/errorHandler");
const Permission = require("./permission.model");
const Gate = require("../gate/gate.model");

/**
 * Create a new permission
 */
exports.createPermission = catchAsyncError(async (req, res, next) => {
  const { name, description, gate, priority } = req.body;

  if (!name || !gate || !priority) {
    return next(
      new ErrorHandler("Name, gate, and priority are required", 400)
    );
  }

  // Verify gate exists
  const gateExists = await Gate.findOne({
    _id: gate,
    isDeleted: false,
  });

  if (!gateExists) {
    return next(new ErrorHandler("Gate not found", 404));
  }

  // Check if permission already exists for this gate
  const existingPermission = await Permission.findOne({
    name: name.toLowerCase(),
    gate,
    isDeleted: false,
  });

  if (existingPermission) {
    return next(
      new ErrorHandler("Permission already exists for this gate", 409)
    );
  }

  const permission = await Permission.create({
    name: name.toLowerCase(),
    description,
    gate,
    priority,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Permission created successfully",
    data: permission,
  });
});

/**
 * Get all permissions with filters
 */
exports.getAllPermissions = catchAsyncError(async (req, res) => {
  const { gate, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };

  if (gate) {
    query.gate = gate;
  }

  const permissions = await Permission.find(query)
    .populate("gate", "name description")
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  const total = await Permission.countDocuments(query);

  res.json({
    success: true,
    data: permissions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get permissions by gate
 */
exports.getPermissionsByGate = catchAsyncError(async (req, res, next) => {
  const { gateName } = req.params;

  const gate = await Gate.findOne({
    name: gateName.toLowerCase(),
    isDeleted: false,
  });

  if (!gate) {
    return next(new ErrorHandler("Gate not found", 404));
  }

  const permissions = await Permission.find({
    gate: gate._id,
    isDeleted: false,
  })
    .populate("gate", "name description")
    .lean();

  res.json({
    success: true,
    gateName: gate.name,
    data: permissions,
  });
});

/**
 * Get a single permission
 */
exports.getPermissionById = catchAsyncError(async (req, res, next) => {
  const permission = await Permission.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate("gate", "name description");

  if (!permission) {
    return next(new ErrorHandler("Permission not found", 404));
  }

  res.json({
    success: true,
    data: permission,
  });
});

/**
 * Update permission
 */
exports.updatePermission = catchAsyncError(async (req, res, next) => {
  const { name, description, priority } = req.body;
  const permission = await Permission.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!permission) {
    return next(new ErrorHandler("Permission not found", 404));
  }

  if (name) permission.name = name.toLowerCase();
  if (description) permission.description = description;
  if (priority) permission.priority = priority;

  await permission.save();

  res.json({
    success: true,
    message: "Permission updated successfully",
    data: permission,
  });
});

/**
 * Delete permission (soft delete)
 */
exports.deletePermission = catchAsyncError(async (req, res, next) => {
  const permission = await Permission.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!permission) {
    return next(new ErrorHandler("Permission not found", 404));
  }

  permission.isDeleted = true;
  await permission.save();

  res.json({
    success: true,
    message: "Permission deleted successfully",
  });
});