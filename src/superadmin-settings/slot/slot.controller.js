const SlotTiming = require("./slot.model");
const ErrorHandler = require("../../../utils/errorHandler");
const catchAsyncError = require("../../../utils/catchAsyncError");
const Appointment = require("../../schedule-settings/schedule.model");

// Create Slot Timing
exports.createSlotTiming = catchAsyncError(async (req, res, next) => {
  const { startTime, interval, numberOfSlots, slots } = req.body;

  if (!startTime || !interval || !numberOfSlots || !slots?.length) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const uniqueSlots = [...new Set(slots)];

  if (uniqueSlots.length !== slots.length) {
    return next(new ErrorHandler("Duplicate slots are not allowed", 400));
  }

  if (numberOfSlots !== slots.length) {
    return next(new ErrorHandler("numberOfSlots must match slots length", 400));
  }

  // ================= EXISTING SLOT CONFIG =================

  const existingSlotTiming = await SlotTiming.findOne({
    isActive: true,
    isDeleted: false,
  });

  let removedSlots = [];

  if (existingSlotTiming) {
    removedSlots = existingSlotTiming.slots.filter(
      (slot) => !slots.includes(slot),
    );
  }

  if (
    existingSlotTiming &&
    existingSlotTiming.startTime === startTime &&
    existingSlotTiming.interval === interval &&
    existingSlotTiming.numberOfSlots === numberOfSlots &&
    JSON.stringify(existingSlotTiming.slots) === JSON.stringify(slots)
  ) {
    return next(
      new ErrorHandler("Same slot configuration already exists", 400),
    );
  }

  // ================= VALIDATE REMOVED SLOTS =================

  if (removedSlots.length > 0) {
    const appointments = await Appointment.find({
      appointmentSlot: {
        $in: removedSlots,
      },
      status: {
        $ne: "CANCELLED",
      },
    });

    const now = new Date();

    for (const appointment of appointments) {
      if (appointment.status === "SCHEDULED") {
        return next(
          new ErrorHandler(
            `Slot ${appointment.appointmentSlot} cannot be removed because appointments are scheduled`,
            400,
          ),
        );
      }

      if (appointment.status === "COMPLETED" && appointment.completedAt) {
        const unlockTime = new Date(appointment.completedAt);

        unlockTime.setHours(unlockTime.getHours() + 24);

        if (unlockTime > now) {
          return next(
            new ErrorHandler(
              `Slot ${appointment.appointmentSlot} cannot be removed because appointment completed less than 24 hours ago`,
              400,
            ),
          );
        }
      }
    }
  }

  // deactivate old active records
  await SlotTiming.updateMany(
    { isActive: true, isDeleted: false },
    { isActive: false },
  );

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
    isDeleted: false,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  res.status(200).json({
    success: true,
    data: slotTiming,
  });
});

exports.removeSlot = catchAsyncError(async (req, res, next) => {
  const { slot } = req.body;

  if (!slot) {
    return next(new ErrorHandler("Slot is required", 400));
  }

  const slotTiming = await SlotTiming.findOne({
    isActive: true,
    isDeleted: false,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  // slot exists check
  if (!slotTiming.slots.includes(slot)) {
    return next(new ErrorHandler("Slot not found", 404));
  }

  // appointment validation
  const appointments = await Appointment.find({
    appointmentSlot: slot,
    status: {
      $ne: "CANCELLED",
    },
  });

  const now = new Date();

  for (const appointment of appointments) {
    // scheduled appointment
    if (appointment.status === "SCHEDULED") {
      return next(
        new ErrorHandler(
          `Slot ${slot} cannot be removed because appointments are scheduled`,
          400,
        ),
      );
    }

    // completed within 24 hours
    if (appointment.status === "COMPLETED" && appointment.completedAt) {
      const unlockTime = new Date(appointment.completedAt);

      unlockTime.setHours(unlockTime.getHours() + 24);

      if (unlockTime > now) {
        return next(
          new ErrorHandler(
            `Slot ${slot} cannot be removed because appointment completed less than 24 hours ago`,
            400,
          ),
        );
      }
    }
  }

  // remove slot
  slotTiming.slots = slotTiming.slots.filter((item) => item !== slot);

  slotTiming.numberOfSlots = slotTiming.slots.length;

  // at least one slot required
  if (slotTiming.slots.length === 0) {
    return next(new ErrorHandler("At least one slot must remain", 400));
  }

  await slotTiming.save();

  res.status(200).json({
    success: true,
    message: "Slot removed successfully",
    data: slotTiming,
  });
});
