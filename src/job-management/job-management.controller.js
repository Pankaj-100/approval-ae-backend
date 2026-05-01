const User = require("../modules/user/user.model");
const Role = require("../modules/role/role.model");
const ContractorApplication = require("../contractor-application/contractor-application.model");
const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const DrawingSubmission = require("../drawing-submission/drawing-submission.model");

const ASSIGNABLE_ROLES = ["ARCHITECT", "REVIEW_ENGINEER", "INSPECTION_AGENT"];

//users list
exports.getAssignableUsers = catchAsyncError(async (req, res, next) => {
  let { page = 1, limit = 10, search = "", roles } = req.query;

  page = Number(page);
  limit = Number(limit);

  // ================= ROLE FILTER =================
  const roleNames = roles
    ? roles.split(",").filter((r) => ASSIGNABLE_ROLES.includes(r))
    : ASSIGNABLE_ROLES;

  const roleDocs = await Role.find({
    name: { $in: roleNames },
  });

  const roleIds = roleDocs.map((r) => r._id);

  // ================= SEARCH =================
  let searchQuery = {};

  if (search) {
    searchQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile_number: { $regex: search, $options: "i" } },
    ];
  }

  // ================= FINAL QUERY =================
  const query = {
    isDeleted: false,
    isVerified: true,
    role: { $in: roleIds },
    ...searchQuery,
  };

  // ================= FETCH =================
  const users = await User.find(query)
    .populate("role", "name")
    .select("_id name email mobile_number role")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

// assigned employee
exports.assignEmployee = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;
  const { assignedTo } = req.body;

  if (!assignedTo) {
    return next(new ErrorHandler("assignedTo is required", 400));
  }

  // ================= CHECK USER =================
  const user = await User.findById(assignedTo).populate("role");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (!ASSIGNABLE_ROLES.includes(user.role.name)) {
    return next(new ErrorHandler("User role not allowed for assignment", 400));
  }

  // ================= UPDATE =================
  const application = await ContractorApplication.findByIdAndUpdate(
    applicationId,
    { assignedTo },
    { new: true },
  ).populate("assignedTo", "name email mobile_number profile_image_url");

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Employee assigned successfully",
    data: application,
  });
});

//unassign employee
exports.unassignEmployee = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;

  const application = await ContractorApplication.findByIdAndUpdate(
    applicationId,
    { assignedTo: null },
    { new: true },
  );

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Employee unassigned successfully",
    data: application,
  });
});

// all application details
exports.getApplicationDetails = catchAsyncError(async (req, res, next) => {
  let { page = 1, limit = 10, search = "", jobStatus } = req.query;

  page = Number(page);
  limit = Number(limit);

  let query = { isDeleted: false };

  // Search
  if (search) {
    query.$or = [
      { referenceNumber: { $regex: search, $options: "i" } },
      { plotNumber: { $regex: search, $options: "i" } },
      { buildingName: { $regex: search, $options: "i" } },
    ];
  }

  // Job Status filter
  if (jobStatus) {
    query.jobStatus = jobStatus;
  }

  const applications = await ContractorApplication.find(query)
    .populate("assignedTo", "name")
    .populate("contractorId", "name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // Format for UI
  const formatted = applications.map((app) => {
    const latest = app.versions[app.versions.length - 1];

    return {
      id: app._id,
      appId: app.referenceNumber,
      date: app.createdAt,

      statusOfJob: app.jobStatus,

      assignedEmployee: app.assignedTo?.name || null,

      plotNo: app.plotNumber,
      projectName: app.buildingName,

      floorNo: app.floorNumber,
      unitNo: app.displayUnit,

      contractorName: app.contractorId?.name || null,
    };
  });

  const total = await ContractorApplication.countDocuments(query);

  res.status(200).json({
    success: true,
    data: formatted,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

// get single application details
exports.getApplicationById = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;

  const application = await ContractorApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  })
    .populate("assignedTo", "name email mobile_number")
    .populate("contractorId", "name email mobile_number")
    .populate("buildingId", "buildingName")
    .populate(
      "versions.redesign.inputUnits.unitId",
      "unitId usageType totalSqm availableSqm usedSqm status",
    )
    .lean();

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // ALL versions format
  const versionsData = application.versions.map((v) => ({
    versionNumber: v.versionNumber,

    tenantDetails: {
      name: v.tenantName,
      mobile: v.tenantMobile,
      email: v.tenantEmail,
    },

    areaDetails: {
      totalArea: v.totalUnitAreaSqm,
      mezzanine: v.hasMezzanine,
      mezzanineArea: v.totalUnitAreaAfterMezzanineSqm,
    },

    unitDetails:
      application.unitType === "Single Unit"
        ? application.unitId
        : v?.redesign?.inputUnits || [],

    redesignDetails:
      application.unitType === "Redesign Unit" ? v?.redesign : null,

    documents: v.documents || {},

    status: v.status,
    remarks: v.remarks,
    reviewedAt: v.reviewedAt,
    createdAt: v.createdAt,
  }));

  // main response
  const formatted = {
    appId: application.referenceNumber,
    date: application.createdAt,

    jobStatus: application.jobStatus,

    assignedEmployee: application.assignedTo || null,
    contractor: application.contractorId || null,

    projectDetails: {
      plotNo: application.plotNumber,
      projectName: application.buildingName,
      floorNo: application.floorNumber,
      unitNo: application.displayUnit,
      unitType: application.unitType,
    },

    //ALL versions
    versions: versionsData,

    totalVersions: application.versions.length,
    currentVersion: application.currentVersion,
  };

  res.status(200).json({
    success: true,
    data: formatted,
  });
});

//review application
exports.reviewApplication = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;
  const { action, remarks } = req.body;

  // ================= VALIDATION =================
  if (!["APPROVE", "REJECT"].includes(action)) {
    return next(new ErrorHandler("Invalid action", 400));
  }

  // reject me reason required
  if (action === "REJECT" && !remarks) {
    return next(new ErrorHandler("Remarks is required for rejection", 400));
  }

  // ================= FETCH =================
  const application = await ContractorApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  });

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // ================= LATEST VERSION =================
  const latest = application.versions[application.versions.length - 1];

  if (!latest) {
    return next(new ErrorHandler("No version found", 400));
  }

  // ================= CHECK ALREADY REVIEWED =================
  if (latest.status === "APPROVED" || latest.status === "REJECTED") {
    return next(new ErrorHandler("Application already reviewed", 400));
  }

  // ================= UPDATE VERSION =================
  latest.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
  latest.remarks = action === "REJECT" ? remarks : null;
  latest.reviewedAt = new Date();
  latest.reviewedBy = req.user?._id || null;

  // ================= UPDATE JOB STATUS =================
  if (action === "APPROVE") {
    application.jobStatus = "DESIGN_REVIEW";
  }

  await application.save();

  // ================= RESPONSE =================
  res.status(200).json({
    success: true,
    message:
      action === "APPROVE"
        ? "Application approved successfully"
        : "Application rejected successfully",
    data: {
      applicationId: application._id,
      status: latest.status,
      jobStatus: application.jobStatus,
      remarks: latest.remarks,
    },
  });
});

// get drawing by contractorApplicationId
exports.getDrawingByApplicationId = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;

  // ================= FETCH =================
  const submission = await DrawingSubmission.findOne({
    contractorApplicationId: applicationId,
    isDeleted: false,
  }).lean();

  if (!submission) {
    return next(new ErrorHandler("Drawing submission not found", 404));
  }

  // ================= FORMAT FUNCTION =================
  const formatFiles = (files = []) =>
    files.map((f) => ({
      versionNumber: f.versionNumber,
      fileUrl: f.fileUrl,
      status: f.status,
      isLatest: f.isLatest,
      rejectionReason: f.rejectionReason,
      uploadedAt: f.uploadedAt,
    }));

  // ================= RESPONSE FORMAT =================
  const formatted = {
    applicationId: submission.contractorApplicationId,

    architectural: {
      autoCad: formatFiles(submission.architectural?.autoCad),
      dwf: formatFiles(submission.architectural?.dwf),
    },

    mep: {
      autoCad: formatFiles(submission.mep?.autoCad),
      dwf: formatFiles(submission.mep?.dwf),
    },

    structural: {
      autoCad: formatFiles(submission.structural?.autoCad),
      dwf: formatFiles(submission.structural?.dwf),
    },
  };

  res.status(200).json({
    success: true,
    data: formatted,
  });
});
