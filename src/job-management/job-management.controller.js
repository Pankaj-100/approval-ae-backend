const User = require("../modules/user/user.model");
const Role = require("../modules/role/role.model");
const ContractorApplication = require("../contractor-application/contractor-application.model");
const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");

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
