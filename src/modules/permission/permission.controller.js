const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const Permission = require("./permission.model");

exports.createPermission = catchAsyncError(async (req, res) => {
  const permission = await Permission.create(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: permission
  });
});