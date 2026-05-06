const Pricing = require("./pricing.model");
const catchAsyncError = require("../../../utils/catchAsyncError");
const ErrorHandler = require("../../../utils/errorHandler");

// Create Pricing
exports.createPricing = catchAsyncError(async (req, res, next) => {
  const { pricePerSqFt } = req.body;

  if (pricePerSqFt === undefined) {
    return next(new ErrorHandler("Price per sqft is required", 400));
  }

  // deactivate old pricing
  await Pricing.updateMany({ isActive: true }, { isActive: false });

  const pricing = await Pricing.create({
    pricePerSqFt,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Pricing created successfully",
    data: pricing,
  });
});

// Get Active Pricing
exports.getPricing = catchAsyncError(async (req, res, next) => {
  const pricing = await Pricing.findOne({
    isActive: true,
  });

  if (!pricing) {
    return next(new ErrorHandler("Pricing not found", 404));
  }

  res.status(200).json({
    success: true,
    data: pricing,
  });
});
