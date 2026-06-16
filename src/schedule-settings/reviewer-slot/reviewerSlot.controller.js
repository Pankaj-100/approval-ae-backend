const ReviewerSlot = require("./reviewerSlot.model");
const SlotTiming = require("../../superadmin-settings/slot/slot.model");
const catchAsyncError = require("../../../utils/catchAsyncError");
const ErrorHandler = require("../../../utils/errorHandler");
const { formatSlotRange } = require("../../../utils/slotHelper");

// ======================================================
// BLOCK REVIEWER SLOTS
// ======================================================
exports.blockReviewerSlots = catchAsyncError(async (req, res, next) => {
  const { reviewerId, date, blockedSlots, remarks } = req.body;

  // ================= VALIDATION =================
  if (
    !reviewerId ||
    !date ||
    !Array.isArray(blockedSlots) ||
    blockedSlots.length === 0
  ) {
    return next(
      new ErrorHandler("ReviewerId, date and blockedSlots are required", 400),
    );
  }

  // ================= GET ACTIVE SLOT CONFIG =================
  const slotTiming = await SlotTiming.findOne({
    isActive: true,
    isDeleted: false,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  // ================= VALIDATE SLOT VALUES =================
  const invalidSlots = blockedSlots.filter(
    (slot) => !slotTiming.slots.includes(slot),
  );

  if (invalidSlots.length > 0) {
    return next(
      new ErrorHandler(`Invalid slots: ${invalidSlots.join(", ")}`, 400),
    );
  }

  // ================= FIND REVIEWER SLOT DOCUMENT =================
  let reviewerSlot = await ReviewerSlot.findOne({
    reviewerId,
  });

  // ================= CREATE DOCUMENT IF NOT EXISTS =================
  if (!reviewerSlot) {
    reviewerSlot = await ReviewerSlot.create({
      reviewerId,
      blockedDates: [],
      remarks: remarks || "",
    });
  }

  // ================= CHECK DATE EXISTS =================
  const existingDateIndex = reviewerSlot.blockedDates.findIndex(
    (item) =>
      new Date(item.date).toISOString().split("T")[0] ===
      new Date(date).toISOString().split("T")[0],
  );

  // ================= UPDATE EXISTING DATE =================
  if (existingDateIndex !== -1) {
    reviewerSlot.blockedDates[existingDateIndex].slots = blockedSlots;
  }

  // ================= ADD NEW DATE =================
  else {
    reviewerSlot.blockedDates.push({
      date,
      slots: blockedSlots,
    });
  }

  // ================= UPDATE REMARKS =================
  reviewerSlot.remarks = remarks || "";

  await reviewerSlot.save();

  res.status(200).json({
    success: true,
    message: "Reviewer slots updated successfully",
    data: reviewerSlot,
  });
});

// ======================================================
// GET REVIEWER BLOCKED SLOTS
// ======================================================
exports.getReviewerBlockedSlots = catchAsyncError(async (req, res, next) => {
  const { reviewerId, date } = req.query;

  // ================= VALIDATION =================
  if (!reviewerId || !date) {
    return next(new ErrorHandler("ReviewerId and date are required", 400));
  }

  // ================= FIND REVIEWER SLOT =================
  const reviewerSlot = await ReviewerSlot.findOne({
    reviewerId,
  });

  if (!reviewerSlot) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  // ================= FIND BLOCKED DATE =================
  const blockedDate = reviewerSlot.blockedDates.find(
    (item) =>
      new Date(item.date).toISOString().split("T")[0] ===
      new Date(date).toISOString().split("T")[0],
  );

  // res.status(200).json({
  //   success: true,
  //   data: blockedDate || null,
  // });
  if (!blockedDate) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  const slotTiming = await SlotTiming.findOne({
    isActive: true,
    isDeleted: false,
  });

  const formattedSlots = blockedDate.slots.map((slot) =>
    formatSlotRange(slot, slotTiming.interval),
  );

  res.status(200).json({
    success: true,

    data: {
      date: blockedDate.date,

      slots: formattedSlots,
    },
  });
});

// ======================================================
// GET AVAILABLE SLOTS
// ======================================================
exports.getAvailableSlots = catchAsyncError(async (req, res, next) => {
  const { reviewerId, date } = req.query;

  // ================= VALIDATION =================
  if (!reviewerId || !date) {
    return next(new ErrorHandler("ReviewerId and date are required", 400));
  }

  // ================= GET ACTIVE SLOT CONFIG =================
  const slotTiming = await SlotTiming.findOne({
    isActive: true,
    isDeleted: false,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  // ================= FIND REVIEWER SLOT =================
  const reviewerSlot = await ReviewerSlot.findOne({
    reviewerId,
  });

  let blockedSlots = [];

  // ================= FIND BLOCKED DATE =================
  if (reviewerSlot) {
    const blockedDate = reviewerSlot.blockedDates.find(
      (item) =>
        new Date(item.date).toISOString().split("T")[0] ===
        new Date(date).toISOString().split("T")[0],
    );

    if (blockedDate) {
      blockedSlots = blockedDate.slots;
    }
  }

  // ================= REMOVE BLOCKED SLOTS =================
  const availableSlots = slotTiming.slots.filter(
    (slot) => !blockedSlots.includes(slot),
  );

  const formattedSlots = availableSlots.map((slot) =>
    formatSlotRange(slot, slotTiming.interval),
  );

  res.status(200).json({
    success: true,
    data: formattedSlots,
  });
});
