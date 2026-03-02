const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const RolePermission = require("./rolePermission.model");

exports.assignPermissionToRole = catchAsyncError(async (req, res) => {
  const mapping = await RolePermission.create(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: mapping
  });
});