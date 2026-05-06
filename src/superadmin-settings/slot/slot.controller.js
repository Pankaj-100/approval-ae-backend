const SlotTiming = require("./slot.model");
const ErrorHandler = require("../../../utils/errorHandler");
const catchAsyncError = require("../../../utils/catchAsyncError");

// Create Slot Timing
exports.createSlotTiming = catchAsyncError(async (req, res, next) => {
  const { startTime, interval, numberOfSlots, slots } = req.body;

  if (!startTime || !interval || !numberOfSlots || !slots?.length) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // deactivate old active records
  await SlotTiming.updateMany({ isActive: true }, { isActive: false });

  const slotTiming = await SlotTiming.create({
    startTime,
    interval,
    numberOfSlots,
    slots,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Slot timing created successfully",
    data: slotTiming,
  });
});

// Get Active Slot Timing
exports.getSlotTiming = catchAsyncError(async (req, res, next) => {
  const slotTiming = await SlotTiming.findOne({
    isActive: true,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  res.status(200).json({
    success: true,
    data: slotTiming,
  });
});
