const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const Role = require("./role.model");

/* ===============================
   CREATE ROLE
=============================== */
exports.createRole = catchAsyncError(async (req, res, next) => {
  const { name, description } = req.body;

  const existing = await Role.findOne({
    name: name.toUpperCase(),
    isDeleted: false,
  });

  if (existing) {
    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: "Role already exists",
    });
  }

  const role = await Role.create({
    name: name.toUpperCase(),
    description,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: role,
  });
});

/* ===============================
   GET ROLES
=============================== */
exports.getRoles = catchAsyncError(async (req, res) => {
  const roles = await Role.find({ isDeleted: false });

  res.status(StatusCodes.OK).json({
    success: true,
    data: roles,
  });
});