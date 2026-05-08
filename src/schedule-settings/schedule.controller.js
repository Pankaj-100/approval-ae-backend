const Appointment = require("./schedule.model");
const ReviewerSlot = require("./reviewer-slot/reviewerSlot.model");
const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const SlotTiming = require("../superadmin-settings/slot/slot.model");
const { formatSlotRange } = require("../../utils/slotHelper");

// ================= CREATE APPOINTMENT =================
exports.createAppointment = catchAsyncError(async (req, res, next) => {
  const {
    contractorApplicationId,
    reviewerId,
    contractorId,
    appointmentDate,
    appointmentSlot,
    document,
    remarks,
  } = req.body;

  // required validation
  if (
    !contractorApplicationId ||
    !reviewerId ||
    !contractorId ||
    !appointmentDate ||
    !appointmentSlot ||
    !document?.fileUrl ||
    !document?.fileName
  ) {
    return next(new ErrorHandler("All required fields are mandatory", 400));
  }

  // check active slot timing
  const slotTiming = await SlotTiming.findOne({
    isActive: true,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  // validate slot exists
  if (!slotTiming.slots.includes(appointmentSlot)) {
    return next(new ErrorHandler("Invalid appointment slot", 400));
  }

  // reviewer blocked slot check
  const reviewerSlot = await ReviewerSlot.findOne({
    reviewerId,
    date: appointmentDate,
  });

  if (reviewerSlot && reviewerSlot.blockedSlots.includes(appointmentSlot)) {
    return next(new ErrorHandler("Selected slot is blocked", 400));
  }

  // already booked check
  const alreadyBooked = await Appointment.findOne({
    reviewerId,
    appointmentDate,
    appointmentSlot,
    status: {
      $ne: "CANCELLED",
    },
  });

  if (alreadyBooked) {
    return next(new ErrorHandler("Slot already booked", 400));
  }

  // create appointment
  const appointment = await Appointment.create({
    contractorApplicationId,
    reviewerId,
    contractorId,
    appointmentDate,
    appointmentSlot,
    document,
    remarks,
    scheduledBy: req.user?._id || null,
  });

  res.status(201).json({
    success: true,
    message: "Appointment created successfully",

    data: {
      ...appointment.toObject(),

      appointmentSlot: formatSlotRange(
        appointment.appointmentSlot,
        slotTiming.interval,
      ),
    },
  });
});

// ================= GET APPOINTMENTS =================
exports.getAppointments = catchAsyncError(async (req, res, next) => {
  const appointments = await Appointment.find()
    .populate("reviewerId", "name email phone")
    .populate("contractorId", "name email phone")
    .populate("contractorApplicationId")
    .populate("scheduledBy", "name email")
    .populate("cancelledBy", "name email")
    .sort({
      createdAt: -1,
    });

  const slotTiming = await SlotTiming.findOne({
    isActive: true,
  });

  const formattedAppointments = appointments.map((item) => ({
    ...item.toObject(),

    appointmentSlot: formatSlotRange(item.appointmentSlot, slotTiming.interval),
  }));

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: formattedAppointments,
  });
});

// ================= GET SINGLE APPOINTMENT =================
exports.getSingleAppointment = catchAsyncError(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.appointmentId)
    .populate("reviewerId", "name email phone")
    .populate("contractorId", "name email phone")
    .populate("contractorApplicationId")
    .populate("scheduledBy", "name email")
    .populate("cancelledBy", "name email");

  if (!appointment) {
    return next(new ErrorHandler("Appointment not found", 404));
  }

  const slotTiming = await SlotTiming.findOne({
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: {
      ...appointment.toObject(),

      appointmentSlot: formatSlotRange(
        appointment.appointmentSlot,
        slotTiming.interval,
      ),
    },
  });
});

// ================= CANCEL APPOINTMENT =================
exports.cancelAppointment = catchAsyncError(async (req, res, next) => {
  const { cancelledReason } = req.body;

  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    return next(new ErrorHandler("Appointment not found", 404));
  }

  appointment.status = "CANCELLED";
  appointment.cancelledReason = cancelledReason || "";
  appointment.cancelledBy = req.user?._id || null;

  await appointment.save();

  res.status(200).json({
    success: true,
    message: "Appointment cancelled successfully",
    data: appointment,
  });
});

// ================= RESCHEDULE APPOINTMENT =================
exports.rescheduleAppointment = catchAsyncError(async (req, res, next) => {
  const { appointmentDate, appointmentSlot, remarks } = req.body;

  const oldAppointment = await Appointment.findById(req.params.appointmentId);

  if (!oldAppointment) {
    return next(new ErrorHandler("Appointment not found", 404));
  }

  // blocked slot check
  const reviewerSlot = await ReviewerSlot.findOne({
    reviewerId: oldAppointment.reviewerId,
    date: appointmentDate,
  });

  if (reviewerSlot && reviewerSlot.blockedSlots.includes(appointmentSlot)) {
    return next(new ErrorHandler("Selected slot is blocked", 400));
  }

  // already booked check
  const alreadyBooked = await Appointment.findOne({
    reviewerId: oldAppointment.reviewerId,
    appointmentDate,
    appointmentSlot,
    status: {
      $ne: "CANCELLED",
    },
  });

  if (alreadyBooked) {
    return next(new ErrorHandler("Slot already booked", 400));
  }

  // update old appointment
  oldAppointment.status = "RESCHEDULED";

  await oldAppointment.save();

  // create new appointment
  const newAppointment = await Appointment.create({
    contractorApplicationId: oldAppointment.contractorApplicationId,

    reviewerId: oldAppointment.reviewerId,

    contractorId: oldAppointment.contractorId,

    appointmentDate,
    appointmentSlot,

    document: oldAppointment.document,

    remarks: remarks || oldAppointment.remarks,

    scheduledBy: req.user?._id || null,

    rescheduledFrom: oldAppointment._id,
  });

  const slotTiming = await SlotTiming.findOne({
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: "Appointment rescheduled successfully",
    data: {
      ...newAppointment.toObject(),

      appointmentSlot: formatSlotRange(
        newAppointment.appointmentSlot,
        slotTiming.interval,
      ),
    },
  });
});

// ================= GET AVAILABLE SLOTS =================

exports.getAvailableSlots = catchAsyncError(async (req, res, next) => {
  const { reviewerId, date } = req.query;

  // validate required query params
  if (!reviewerId || !date) {
    return next(new ErrorHandler("ReviewerId and date are required", 400));
  }

  // ================= GET GLOBAL SLOT TIMING =================

  const slotTiming = await SlotTiming.findOne({
    isActive: true,
  });

  if (!slotTiming) {
    return next(new ErrorHandler("Slot timing not found", 404));
  }

  // ================= GET REVIEWER BLOCKED SLOTS =================

  const reviewerSlot = await ReviewerSlot.findOne({
    reviewerId,
    date,
  });

  // ================= GET ALREADY BOOKED APPOINTMENTS =================

  const bookedAppointments = await Appointment.find({
    reviewerId,
    appointmentDate: date,

    status: {
      $ne: "CANCELLED",
    },
  });

  // convert appointment data into slot array

  const bookedSlots = bookedAppointments.map((item) => item.appointmentSlot);

  // ================= START WITH ALL GLOBAL SLOTS =================

  let availableSlots = slotTiming.slots;

  // ================= REMOVE BLOCKED SLOTS =================
  // Remove reviewer unavailable slots

  if (reviewerSlot) {
    availableSlots = availableSlots.filter(
      (slot) => !reviewerSlot.blockedSlots.includes(slot),
    );
  }

  // ================= REMOVE BOOKED SLOTS =================
  // Remove already scheduled slots

  availableSlots = availableSlots.filter((slot) => !bookedSlots.includes(slot));

  // ================= FINAL RESPONSE =================
  // Return only available slots

  res.status(200).json({
    success: true,
    // data: availableSlots,
    data: availableSlots.map(
      (slot) => formatSlotRange(slot, slotTiming.interval).label,
    ),
  });
});


// ======================================================
// CREATE INSPECTION APPOINTMENT
// ======================================================
exports.createInspectionAppointment = catchAsyncError(
  async (req, res, next) => {
    const {
      contractorApplicationId,
      contractorId,
      inspectionDetailId,
      appointmentDate,
      appointmentSlot,
      remarks,
    } = req.body;

    // ================= VALIDATION =================
    if (
      !contractorApplicationId ||
      !contractorId ||
      !inspectionDetailId ||
      !appointmentDate ||
      !appointmentSlot
    ) {
      return next(new ErrorHandler("All required fields are mandatory", 400));
    }

    // ================= SLOT TIMING =================
    const slotTiming = await SlotTiming.findOne({
      isActive: true,
    });

    if (!slotTiming) {
      return next(new ErrorHandler("Slot timing not found", 404));
    }

    // ================= VALID SLOT =================
    if (!slotTiming.slots.includes(appointmentSlot)) {
      return next(new ErrorHandler("Invalid appointment slot", 400));
    }

    // ================= ALREADY BOOKED CHECK =================
    const alreadyBooked = await Appointment.findOne({
      inspectionDetailId,

      appointmentDate,

      appointmentSlot,

      appointmentType: "INSPECTION",

      status: {
        $ne: "CANCELLED",
      },
    });

    if (alreadyBooked) {
      return next(new ErrorHandler("Slot already booked", 400));
    }

    // ================= CREATE =================
    const appointment = await Appointment.create({
      contractorApplicationId,

      contractorId,

      inspectionDetailId,

      appointmentDate,

      appointmentSlot,

      remarks,

      appointmentType: "INSPECTION",

      scheduledBy: req.user?._id || null,
    });

    res.status(201).json({
      success: true,

      message: "Inspection appointment scheduled successfully",

      data: {
        ...appointment.toObject(),

        appointmentSlot: formatSlotRange(
          appointment.appointmentSlot,
          slotTiming.interval,
        ),
      },
    });
  },
);

// ======================================================
// RESCHEDULE INSPECTION APPOINTMENT
// ======================================================
exports.rescheduleInspectionAppointment = catchAsyncError(
  async (req, res, next) => {
    const { appointmentDate, appointmentSlot, remarks } = req.body;

    const oldAppointment = await Appointment.findById(req.params.appointmentId);

    if (!oldAppointment) {
      return next(new ErrorHandler("Appointment not found", 404));
    }

    // ================= SLOT TIMING =================
    const slotTiming = await SlotTiming.findOne({
      isActive: true,
    });

    

    if (!slotTiming) {
      return next(new ErrorHandler("Slot timing not found", 404));
    }

    // ================= VALID SLOT =================
    if (!slotTiming.slots.includes(appointmentSlot)) {
      return next(new ErrorHandler("Invalid appointment slot", 400));
    }

    // ================= CHECK BOOKED SLOT =================
    const alreadyBooked = await Appointment.findOne({
      inspectionDetailId: oldAppointment.inspectionDetailId,

      appointmentDate,

      appointmentSlot,

      appointmentType: "INSPECTION",

      status: {
        $ne: "CANCELLED",
      },
    });

    if (alreadyBooked) {
      return next(new ErrorHandler("Slot already booked", 400));
    }

    // ================= UPDATE OLD =================
    oldAppointment.status = "RESCHEDULED";

    await oldAppointment.save();

    // ================= CREATE NEW =================
    const newAppointment = await Appointment.create({
      contractorApplicationId: oldAppointment.contractorApplicationId,

      contractorId: oldAppointment.contractorId,

      inspectionDetailId: oldAppointment.inspectionDetailId,

      appointmentDate,

      appointmentSlot,

      remarks: remarks || oldAppointment.remarks,

      appointmentType: "INSPECTION",

      scheduledBy: req.user?._id || null,

      rescheduledFrom: oldAppointment._id,
    });

    res.status(201).json({
      success: true,

      message: "Inspection appointment rescheduled successfully",

      data: {
        ...newAppointment.toObject(),

        appointmentSlot: formatSlotRange(
          newAppointment.appointmentSlot,
          slotTiming.interval,
        ),
      },
    });
  },
);

// ======================================================
// CANCEL INSPECTION APPOINTMENT
// ======================================================
exports.cancelInspectionAppointment = catchAsyncError(
  async (req, res, next) => {
    const { cancelledReason } = req.body;

    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return next(new ErrorHandler("Appointment not found", 404));
    }

    appointment.status = "CANCELLED";

    appointment.cancelledReason = cancelledReason || "";

    appointment.cancelledBy = req.user?._id || null;

    await appointment.save();

    res.status(200).json({
      success: true,

      message: "Inspection appointment cancelled successfully",

      data: appointment,
    });
  },
);
