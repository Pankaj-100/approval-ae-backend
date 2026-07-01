const User = require("../modules/user/user.model");
const Role = require("../modules/role/role.model");
const ContractorApplication = require("../contractor-application/contractor-application.model");
const catchAsyncError = require("../../utils/catchAsyncError");
const ErrorHandler = require("../../utils/errorHandler");
const DrawingSubmission = require("../drawing-submission/drawing-submission.model");
const WorkPermit = require("../work-permit/workPermit.model");
const Unit = require("../floor-unit/floor-unit.model");
const InspectionDetail = require("../inspection-detail/inspectionDetail.model");

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
// exports.reviewApplication = catchAsyncError(async (req, res, next) => {
//   const { applicationId } = req.params;
//   const { action, remarks } = req.body;

//   // ================= VALIDATION =================
//   if (!["APPROVE", "REJECT"].includes(action)) {
//     return next(new ErrorHandler("Invalid action", 400));
//   }

//   // reject me reason required
//   if (action === "REJECT" && !remarks) {
//     return next(new ErrorHandler("Remarks is required for rejection", 400));
//   }

//   // ================= FETCH =================
//   const application = await ContractorApplication.findOne({
//     _id: applicationId,
//     isDeleted: false,
//   });

//   if (!application) {
//     return next(new ErrorHandler("Application not found", 404));
//   }

//   // ================= LATEST VERSION =================
//   const latest = application.versions[application.versions.length - 1];

//   if (!latest) {
//     return next(new ErrorHandler("No version found", 400));
//   }

//   // ================= CHECK ALREADY REVIEWED =================
//   if (latest.status === "APPROVED" || latest.status === "REJECTED") {
//     return next(new ErrorHandler("Application already reviewed", 400));
//   }

//   // ================= UPDATE VERSION =================
//   latest.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
//   latest.remarks = action === "REJECT" ? remarks : null;
//   latest.reviewedAt = new Date();
//   latest.reviewedBy = req.user?._id || null;

//   // ================= UPDATE JOB STATUS =================
//   if (action === "APPROVE") {
//     application.jobStatus = "DESIGN_REVIEW";
//     application.approvalStatus = "APPROVED";
//   }

//   if (action === "REJECT") {
//     application.approvalStatus = "REJECTED";
//   }

//   await application.save();

//   // ================= RESPONSE =================
//   res.status(200).json({
//     success: true,
//     message:
//       action === "APPROVE"
//         ? "Application approved successfully"
//         : "Application rejected successfully",
//     data: {
//       applicationId: application._id,
//       status: latest.status,
//       jobStatus: application.jobStatus,
//       approvalStatus: application.approvalStatus,
//       remarks: latest.remarks,
//     },
//   });
// });

exports.reviewApplication = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;

  const { action, remarks } = req.body;

  // check action is valid
  if (!["APPROVE", "REJECT"].includes(action)) {
    return next(new ErrorHandler("Invalid action", 400));
  }

  // remarks required for reject
  if (action === "REJECT" && !remarks) {
    return next(new ErrorHandler("Remarks is required for rejection", 400));
  }

  // find application
  const application = await ContractorApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  });

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // get latest version
  const latest = application.versions[application.versions.length - 1];

  if (!latest) {
    return next(new ErrorHandler("No version found", 400));
  }

  // check already reviewed
  if (latest.status === "APPROVED" || latest.status === "REJECTED") {
    return next(new ErrorHandler("Application already reviewed", 400));
  }

  // update version status
  latest.status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  // save remarks for reject
  latest.remarks = action === "REJECT" ? remarks : null;

  // save review details
  latest.reviewedAt = new Date();

  latest.reviewedBy = req.user?._id || null;

  // approve case
  if (action === "APPROVE") {
    // move to next stage
    application.jobStatus = "DESIGN_REVIEW";

    // update main status
    application.approvalStatus = "APPROVED";
  }

  // reject case
  if (action === "REJECT") {
    // update main status
    application.approvalStatus = "REJECTED";

    // Single Unit rollback
    if (application.unitType === "Single Unit" && application.unitId) {
      await Unit.findByIdAndUpdate(application.unitId, {
        status: "AVAILABLE",
      });
    }

    // rollback redesign units
    if (application.unitType === "Redesign Unit") {
      const redesign = latest.redesign;

      // make old units available again
      if (redesign?.inputUnits?.length) {
        const inputUnitIds = redesign.inputUnits.map((u) => u.unitId);

        await Unit.updateMany(
          {
            _id: {
              $in: inputUnitIds,
            },
          },
          {
            status: "AVAILABLE",
          },
        );
      }

      // delete newly created units
      if (redesign?.resultUnits?.length) {
        const createdUnitNames = redesign.resultUnits.map((u) => u.name);

        await Unit.updateMany(
          {
            unitId: {
              $in: createdUnitNames,
            },
          },
          {
            isDeleted: true,
          },
        );
      }
    }
  }

  // save application
  await application.save();

  // response
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

      approvalStatus: application.approvalStatus,

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
      rejectionReasonDoc: f.rejectionReasonDoc,
      approvalRemarks: f.approvalRemarks,
      approvalDoc: f.approvalDoc,
      reviewer: f.reviewer,
      approvedBy: f.approvedBy,
      approvedAt: f.approvedAt,
      uploadedAt: f.uploadedAt,
    }));

  // ================= RESPONSE FORMAT =================
  const formatted = {
    submissionId: submission._id,

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

// review drawing file
exports.reviewDrawingFile = catchAsyncError(async (req, res, next) => {
  const {
    submissionId,
    section,
    type,
    action,
    approvalRemarks,
    approvalDoc,
    rejectionReason,
    rejectionReasonDoc,
  } = req.body;

  // ================= VALIDATION =================
  if (!["architectural", "mep", "structural"].includes(section)) {
    return next(new ErrorHandler("Invalid section", 400));
  }

  if (!["autoCad", "dwf"].includes(type)) {
    return next(new ErrorHandler("Invalid file type", 400));
  }

  if (!["APPROVE", "REJECT"].includes(action)) {
    return next(new ErrorHandler("Invalid action", 400));
  }

  // validation
  if (action === "APPROVE") {
    if (!approvalRemarks) {
      return next(new ErrorHandler("Approval remarks required", 400));
    }
  }

  if (action === "REJECT") {
    if (!rejectionReason) {
      return next(new ErrorHandler("Rejection reason required", 400));
    }

    if (!rejectionReasonDoc) {
      return next(new ErrorHandler("Rejection document required", 400));
    }
  }

  // ================= FETCH =================
  const submission = await DrawingSubmission.findById(submissionId);

  if (!submission || submission.isDeleted) {
    return next(new ErrorHandler("Drawing submission not found", 404));
  }

  // ================= GET FILES =================
  const files = submission[section][type];

  if (!files || files.length === 0) {
    return next(new ErrorHandler("No files found", 404));
  }

  // ================= LATEST VERSION =================
  const file =
    files.find((f) => f.isLatest === true) || files[files.length - 1];

  if (!file) {
    return next(new ErrorHandler("Latest file not found", 404));
  }

  // ================= ALREADY REVIEWED =================
  if (file.status !== "PENDING") {
    return next(new ErrorHandler("File already reviewed", 400));
  }

  // ================= UPDATE =================
  file.status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  file.approvalRemarks = action === "APPROVE" ? approvalRemarks : null;

  file.approvalDoc = action === "APPROVE" ? approvalDoc || null : null;

  file.rejectionReason = action === "REJECT" ? rejectionReason : null;

  // NEW FIELD SAVE
  file.rejectionReasonDoc = action === "REJECT" ? rejectionReasonDoc : null;

  file.approvedBy = req.user?._id || null;
  file.reviewer = req.user?._id || null;
  // file.approvedAt = new Date();
  file.approvedAt = action === "APPROVE" ? new Date() : null;

  await submission.save();

  // const sections = ["architectural", "mep", "structural"];
  // const types = ["autoCad", "dwf"];

  // let allApproved = true;

  // for (let sec of sections) {
  //   for (let t of types) {
  //     const files = submission[sec]?.[t] || [];

  //     if (files.length === 0) {
  //       allApproved = false;
  //       break;
  //     }

  //     const latest = files.find((f) => f.isLatest) || files[files.length - 1];

  //     if (!latest || latest.status !== "APPROVED") {
  //       allApproved = false;
  //       break;
  //     }
  //   }
  // }
  const sections = ["architectural", "mep", "structural"];
  const types = ["autoCad", "dwf"];

  const optionalFiles = [
    {
      section: "structural",
      type: "autoCad",
    },
    {
      section: "structural",
      type: "dwf",
    },
  ];

  let allApproved = true;

  for (let sec of sections) {
    for (let t of types) {
      const isOptional = optionalFiles.some(
        (item) => item.section === sec && item.type === t,
      );

      const files = submission[sec]?.[t] || [];

      if (files.length === 0) {
        if (isOptional) {
          continue;
        }

        allApproved = false;
        break;
      }

      const latest = files.find((f) => f.isLatest) || files[files.length - 1];

      if (!latest || latest.status !== "APPROVED") {
        allApproved = false;
        break;
      }
    }

    if (!allApproved) break;
  }

  // UPDATE JOB STATUS
  if (allApproved) {
    await ContractorApplication.findByIdAndUpdate(
      submission.contractorApplicationId,
      {
        jobStatus: "NOC_PENDING",
      },
    );
  }

  // ================= RESPONSE =================
  res.status(200).json({
    success: true,
    message:
      action === "APPROVE"
        ? "File approved successfully"
        : "File rejected successfully",
    data: {
      section,
      type,
      versionNumber: file.versionNumber,
      status: file.status,
      approvalRemarks: file.approvalRemarks,
      approvalDoc: file.approvalDoc,
      rejectionReason: file.rejectionReason,
      rejectionReasonDoc: file.rejectionReasonDoc,
    },
  });
});

exports.uploadNOC = catchAsyncError(async (req, res, next) => {
  const { applicationId, nocDocumentUrl } = req.body;

  // ================= VALIDATION =================
  if (!applicationId || !nocDocumentUrl) {
    return next(new ErrorHandler("ApplicationId & NOC document required", 400));
  }

  // ================= FETCH =================
  const application = await ContractorApplication.findById(applicationId);

  if (!application || application.isDeleted) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // ================= CHECK STATUS =================
  // if (application.jobStatus !== "NOC_PENDING") {
  //   return next(
  //     new ErrorHandler("NOC can only be uploaded in NOC_PENDING stage", 400),
  //   );
  // }

  // ================= SAVE NOC =================

  application.nocDoc = {
    fileUrl: nocDocumentUrl,
    uploadedAt: new Date(),
    uploadedBy: req.user?._id || null,
  };

  // ================= UPDATE STATUS =================
  application.jobStatus = "WORK_PERMIT";

  await application.save();

  // ================= RESPONSE =================
  res.status(200).json({
    success: true,
    message: "NOC uploaded successfully, moved to WORK PERMIT stage",
    data: {
      applicationId: application._id,
      jobStatus: application.jobStatus,
      nocDocument: application.nocDoc,
    },
  });
});

// get work permit
exports.getWorkPermitByApplicationId = catchAsyncError(
  async (req, res, next) => {
    const { applicationId } = req.params;

    const submission = await WorkPermit.findOne({
      contractorApplicationId: applicationId,
      isDeleted: false,
    }).lean();

    if (!submission) {
      return next(new ErrorHandler("Work permit not found", 404));
    }

    const formatFiles = (files = []) =>
      files.map((f) => ({
        versionNumber: f.versionNumber,
        fileUrl: f.fileUrl,
        status: f.status,
        isLatest: f.isLatest,
        rejectionReason: f.rejectionReason,
        uploadedAt: f.uploadedAt,
      }));

    const formatted = {
      submissionId: submission._id,
      applicationId: submission.contractorApplicationId,

      documents: {
        dcd: formatFiles(submission.documents?.dcd),
        dewaApproval: formatFiles(submission.documents?.dewaApproval),
        dmDdaDrawings: formatFiles(submission.documents?.dmDdaDrawings),
        subcontractorUndertaking: formatFiles(
          submission.documents?.subcontractorUndertaking,
        ),
        carInsurance: formatFiles(submission.documents?.carInsurance),
        workmenCompensationInsurance: formatFiles(
          submission.documents?.workmenCompensationInsurance,
        ),
        emiratesId: formatFiles(submission.documents?.emiratesId),
        commonAreaProtection: formatFiles(
          submission.documents?.commonAreaProtection,
        ),
        securityCheque: formatFiles(submission.documents?.securityCheque),
      },
    };

    res.status(200).json({
      success: true,
      data: formatted,
    });
  },
);

//review work permit
exports.reviewWorkPermitFile = catchAsyncError(async (req, res, next) => {
  const {
    submissionId,
    docType,
    action,
    rejectionReason,
    approvalRemarks,
    rejectionReasonDoc,
  } = req.body;

  const validDocs = [
    "dcd",
    "dewaApproval",
    "dmDdaDrawings",
    "subcontractorUndertaking",
    "carInsurance",
    "workmenCompensationInsurance",
    "emiratesId",
    "commonAreaProtection",
    "securityCheque",
  ];

  if (!validDocs.includes(docType))
    return next(new ErrorHandler("Invalid document type", 400));

  if (!["APPROVE", "REJECT"].includes(action))
    return next(new ErrorHandler("Invalid action", 400));

  if (action === "APPROVE") {
    if (!approvalRemarks) {
      return next(new ErrorHandler("Approval remarks required", 400));
    }
  }

  if (action === "REJECT" && (!rejectionReason || !rejectionReasonDoc))
    return next(new ErrorHandler("Rejection reason & doc required", 400));

  const submission = await WorkPermit.findById(submissionId);
  if (!submission || submission.isDeleted)
    return next(new ErrorHandler("Work permit not found", 404));

  const files = submission.documents[docType];
  if (!files?.length) return next(new ErrorHandler("No files found", 404));

  const file = files.find((f) => f.isLatest) || files[files.length - 1];

  if (!file || file.status !== "PENDING")
    return next(new ErrorHandler("File already reviewed", 400));

  // UPDATE
  file.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
  file.approvalRemarks = action === "APPROVE" ? approvalRemarks : null;
  file.rejectionReason = action === "REJECT" ? rejectionReason : null;
  file.rejectionReasonDoc = action === "REJECT" ? rejectionReasonDoc : null;
  file.approvedBy = req.user?._id || null;
  file.approvedAt = new Date();

  await submission.save();

  // CHECK ALL APPROVED → MOVE TO INSPECTION
  // const allDocs = Object.values(submission.documents);

  // let allApproved = true;

  // for (let arr of allDocs) {
  //   if (!arr.length) {
  //     allApproved = false;
  //     break;
  //   }

  //   const latest = arr.find((f) => f.isLatest) || arr[arr.length - 1];

  //   if (!latest || latest.status !== "APPROVED") {
  //     allApproved = false;
  //     break;
  //   }
  // }
  const optionalDocs = ["dcd", "dewaApproval", "securityCheque"];

  let allApproved = true;

  for (const [docType, files] of Object.entries(submission.documents)) {
    const isOptional = optionalDocs.includes(docType);

    if (!files.length) {
      if (isOptional) {
        continue;
      }

      allApproved = false;
      break;
    }

    const latest = files.find((f) => f.isLatest) || files[files.length - 1];

    if (!latest || latest.status !== "APPROVED") {
      allApproved = false;
      break;
    }
  }

  // check work permit doc uploaded
  const hasWorkPermitDoc =
    submission.workPermitDoc && submission.workPermitDoc.fileUrl;

  if (allApproved && hasWorkPermitDoc) {
    await ContractorApplication.findByIdAndUpdate(
      submission.contractorApplicationId,
      { jobStatus: "INSPECTION" },
    );
  }

  res.status(200).json({
    success: true,
    message: `File ${file.status.toLowerCase()} successfully`,
    data: {
      docType,
      versionNumber: file.versionNumber,
      status: file.status,
      approvalRemarks: file.approvalRemarks,
      rejectionReason: file.rejectionReason,
      rejectionReasonDoc: file.rejectionReasonDoc,
    },
  });
});

//upload work permit
exports.uploadWorkPermitDoc = catchAsyncError(async (req, res, next) => {
  const { applicationId, workPermitUrl } = req.body;

  if (!applicationId || !workPermitUrl) {
    return next(new ErrorHandler("ApplicationId & document required", 400));
  }

  const application = await ContractorApplication.findById(applicationId);

  if (!application || application.isDeleted) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // check
  // if (application.jobStatus !== "WORK_PERMIT") {
  //   return next(new ErrorHandler("Not in WORK PERMIT stage", 400));
  // }

  const permit = await WorkPermit.findOne({
    contractorApplicationId: applicationId,
  });

  if (!permit) {
    return next(new ErrorHandler("Work permit not found", 404));
  }

  permit.workPermitDoc = {
    fileUrl: workPermitUrl,
    uploadedAt: new Date(),
    uploadedBy: req.user?._id || null,
  };

  await permit.save();

  // =====================================================
  // CHECK ALL DOCUMENTS APPROVED
  // =====================================================
  const allDocs = Object.values(permit.documents);

  let allApproved = true;

  for (let arr of allDocs) {
    // check document exists
    if (!arr.length) {
      allApproved = false;
      break;
    }

    // get latest file
    const latest = arr.find((f) => f.isLatest) || arr[arr.length - 1];

    // check latest approved
    if (!latest || latest.status !== "APPROVED") {
      allApproved = false;
      break;
    }
  }

  // =====================================================
  // MOVE TO INSPECTION
  // only if all docs already approved
  // =====================================================
  if (allApproved) {
    application.jobStatus = "INSPECTION";

    await application.save();
  }

  res.status(200).json({
    success: true,
    message: "Work permit uploaded successfully",
    data: permit.workPermitDoc,
  });
});

//get inspection
exports.getInspectionByApplicationId = catchAsyncError(
  async (req, res, next) => {
    const { applicationId } = req.params;

    const inspection = await InspectionDetail.findOne({
      contractorApplicationId: applicationId,
      isDeleted: false,
    }).lean();

    if (!inspection) {
      return next(new ErrorHandler("Inspection not found", 404));
    }

    const formatFiles = (files = []) =>
      files.map((f) => ({
        versionNumber: f.versionNumber,
        fileUrl: f.fileUrl,
        status: f.status,
        isLatest: f.isLatest,
        rejectionReason: f.rejectionReason || null,
        rejectionReasonDoc: f.rejectionReasonDoc || null,
        appointmentDateTime: f.appointmentDateTime || null,
        uploadedAt: f.uploadedAt,
      }));

    const formatted = {
      submissionId: inspection._id,
      applicationId: inspection.contractorApplicationId,
      inspectionType: inspection.inspectionType,

      documents: {
        sitePhoto: formatFiles(inspection.documents?.sitePhoto),
        dcdCompletionCertificate: formatFiles(
          inspection.documents?.dcdCompletionCertificate,
        ),
        certificate: formatFiles(inspection.documents?.certificate),
        dmCompletionCertificate: formatFiles(
          inspection.documents?.dmCompletionCertificate,
        ),
        architecturalAsBuilt: formatFiles(
          inspection.documents?.architecturalAsBuilt,
        ),
        mepAsBuilt: formatFiles(inspection.documents?.mepAsBuilt),
        structuralAsBuilt: formatFiles(inspection.documents?.structuralAsBuilt),
        testCertificates: formatFiles(inspection.documents?.testCertificates),
        commonAreaDamageClearance: formatFiles(
          inspection.documents?.commonAreaDamageClearance,
        ),
        revisedAuthorityDrawings: formatFiles(
          inspection.documents?.revisedAuthorityDrawings,
        ),
      },
    };

    res.status(200).json({
      success: true,
      data: formatted,
    });
  },
);

// review inspection
exports.reviewInspectionFile = catchAsyncError(async (req, res, next) => {
  const {
    submissionId,
    docType,
    action,
    rejectionReason,
    approvalRemarks,
    rejectionReasonDoc,
  } = req.body;

  const validDocs = [
    "sitePhoto",
    "dcdCompletionCertificate",
    "certificate",
    "dmCompletionCertificate",
    "architecturalAsBuilt",
    "mepAsBuilt",
    "structuralAsBuilt",
    "testCertificates",
    "commonAreaDamageClearance",
    "revisedAuthorityDrawings",
  ];

  // ================= VALIDATION =================
  if (!validDocs.includes(docType))
    return next(new ErrorHandler("Invalid document type", 400));

  if (!["APPROVE", "REJECT"].includes(action))
    return next(new ErrorHandler("Invalid action", 400));

  // validation

  if (action === "APPROVE") {
    if (!approvalRemarks) {
      return next(new ErrorHandler("Approval remarks required", 400));
    }
  }

  if (action === "REJECT") {
    if (!rejectionReason)
      return next(new ErrorHandler("Rejection reason required", 400));

    if (!rejectionReasonDoc)
      return next(new ErrorHandler("Rejection document required", 400));
  }

  // ================= FETCH =================
  const inspection = await InspectionDetail.findById(submissionId);

  if (!inspection || inspection.isDeleted)
    return next(new ErrorHandler("Inspection not found", 404));

  const files = inspection.documents[docType];

  if (!files?.length) return next(new ErrorHandler("No files found", 404));

  // ================= LATEST VERSION =================
  const file = files.find((f) => f.isLatest) || files[files.length - 1];

  if (!file || file.status !== "PENDING")
    return next(new ErrorHandler("File already reviewed", 400));

  // ================= UPDATE =================
  file.status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  file.approvalRemarks = action === "APPROVE" ? approvalRemarks : null;

  file.rejectionReason = action === "REJECT" ? rejectionReason : null;

  file.rejectionReasonDoc = action === "REJECT" ? rejectionReasonDoc : null;

  file.approvedBy = req.user?._id || null;
  file.approvedAt = new Date();

  await inspection.save();

  // ================= CHECK ALL APPROVED =================
  // const allDocs = Object.values(inspection.documents);

  // let allApproved = true;

  // for (let arr of allDocs) {
  //   if (!arr.length) {
  //     allApproved = false;
  //     break;
  //   }

  //   const latest = arr.find((f) => f.isLatest) || arr[arr.length - 1];

  //   if (!latest || latest.status !== "APPROVED") {
  //     allApproved = false;
  //     break;
  //   }
  // }

  // ================= CHECK ALL APPROVED =================
  const optionalDocs = ["revisedAuthorityDrawings"];

  let allApproved = true;

  for (const [docType, files] of Object.entries(inspection.documents)) {
    const isOptional = optionalDocs.includes(docType);

    if (!files.length) {
      if (isOptional) {
        continue;
      }

      allApproved = false;
      break;
    }

    const latest = files.find((f) => f.isLatest) || files[files.length - 1];

    if (!latest || latest.status !== "APPROVED") {
      allApproved = false;
      break;
    }
  }

  // ================= UPDATE JOB STATUS =================
  if (allApproved) {
    await ContractorApplication.findByIdAndUpdate(
      inspection.contractorApplicationId,
      { jobStatus: "FINAL_COMPLETION" },
    );
  }

  // ================= RESPONSE =================
  res.status(200).json({
    success: true,
    message:
      action === "APPROVE"
        ? "File approved successfully"
        : "File rejected successfully",
    data: {
      docType,
      versionNumber: file.versionNumber,
      status: file.status,
      approvalRemarks: file.approvalRemarks,
      rejectionReason: file.rejectionReason,
      rejectionReasonDoc: file.rejectionReasonDoc,
    },
  });
});

// ======================================================
// GET REVIEWER LIST
// ======================================================
exports.getAssignableReviewers = catchAsyncError(async (req, res, next) => {
  let { page = 1, limit = 10, search = "", roles } = req.query;

  page = Number(page);
  limit = Number(limit);

  // ================= ROLE FILTER =================
  const roleNames = roles
    ? roles.split(",").filter((r) => ASSIGNABLE_ROLES.includes(r))
    : ASSIGNABLE_ROLES;

  const roleDocs = await Role.find({
    name: {
      $in: roleNames,
    },
  });

  const roleIds = roleDocs.map((role) => role._id);

  // ================= SEARCH =================
  let searchQuery = {};

  if (search) {
    searchQuery.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },

      {
        email: {
          $regex: search,
          $options: "i",
        },
      },

      {
        mobile_number: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // ================= FINAL QUERY =================
  const query = {
    isDeleted: false,
    isVerified: true,

    role: {
      $in: roleIds,
    },

    ...searchQuery,
  };

  // ================= FETCH USERS =================
  const users = await User.find(query)
    .populate("role", "name")
    .select("_id name email mobile_number role")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({
      createdAt: -1,
    });

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

// ======================================================
// ASSIGN REVIEWER TO DRAWING DOCUMENT
// ======================================================
exports.assignReviewer = catchAsyncError(async (req, res, next) => {
  const {
    drawingSubmissionId,
    drawingType,
    fileType,
    versionNumber,
    reviewerId,
  } = req.body;

  // ================= VALIDATION =================
  if (
    !drawingSubmissionId ||
    !drawingType ||
    !fileType ||
    !versionNumber ||
    !reviewerId
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // ================= VALID TYPES =================
  const validDrawingTypes = ["architectural", "mep", "structural"];

  const validFileTypes = ["autoCad", "dwf"];

  if (!validDrawingTypes.includes(drawingType)) {
    return next(new ErrorHandler("Invalid drawing type", 400));
  }

  if (!validFileTypes.includes(fileType)) {
    return next(new ErrorHandler("Invalid file type", 400));
  }

  // ================= CHECK REVIEWER =================
  const reviewer = await User.findById(reviewerId).populate("role");

  if (!reviewer) {
    return next(new ErrorHandler("Reviewer not found", 404));
  }

  if (!ASSIGNABLE_ROLES.includes(reviewer.role.name)) {
    return next(new ErrorHandler("User role not allowed", 400));
  }

  // ================= FIND DRAWING SUBMISSION =================
  const drawingSubmission =
    await DrawingSubmission.findById(drawingSubmissionId);

  if (!drawingSubmission) {
    return next(new ErrorHandler("Drawing submission not found", 404));
  }

  // ================= GET DOCUMENT ARRAY =================
  const documents = drawingSubmission[drawingType][fileType];

  // ================= FIND VERSION =================
  const documentVersion = documents.find(
    (doc) => doc.versionNumber === Number(versionNumber),
  );

  if (!documentVersion) {
    return next(new ErrorHandler("Document version not found", 404));
  }

  // ================= ASSIGN REVIEWER =================
  documentVersion.reviewer = reviewerId;

  await drawingSubmission.save();

  res.status(200).json({
    success: true,
    message: "Reviewer assigned successfully",
    data: drawingSubmission,
  });
});

// ================= GET NOC DOCUMENT =================
exports.getNOC = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;

  const application = await ContractorApplication.findById(applicationId);

  if (!application || application.isDeleted) {
    return next(new ErrorHandler("Application not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      applicationId: application._id,
      jobStatus: application.jobStatus,
      nocDocument: application.nocDoc || null,
    },
  });
});

// ================= GET WORK PERMIT DOCUMENT =================
exports.getWorkPermitDoc = catchAsyncError(async (req, res, next) => {
  const { applicationId } = req.params;

  const application = await ContractorApplication.findById(applicationId);

  if (!application || application.isDeleted) {
    return next(new ErrorHandler("Application not found", 404));
  }

  const permit = await WorkPermit.findOne({
    contractorApplicationId: applicationId,
  });

  if (!permit) {
    return next(new ErrorHandler("Work permit not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      applicationId: application._id,
      jobStatus: application.jobStatus,
      workPermitDoc: permit.workPermitDoc || null,
    },
  });
});
