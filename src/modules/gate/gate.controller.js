const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const Gate = require("./gate.model");

exports.createGate = catchAsyncError(async (req, res) => {
  const gate = await Gate.create(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: gate
  });
});