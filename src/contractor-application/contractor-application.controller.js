const mongoose = require("mongoose");
const PlotDetails = require("../plot/plot.model");
const FloorDetails = require("../floor/floor.model");
const BuildingDetails = require("../Building/building.model");
const Unit = require("../floor-unit/floor-unit.model");
const ContractorApplication = require("./contractor-application.model");
const ErrorHandler = require("../../utils/errorHandler");
const catchAsync = require("../../utils/catchAsyncError");
const { getNextSequence } = require("../counter/counter.controller");

// GET BUILDINGS BY PLOT NUMBER

exports.getBuildingsByPlotNumber = catchAsync(async (req, res, next) => {
  const { plotNumber } = req.params;

  if (!plotNumber) {
    return next(new ErrorHandler("Plot number is required", 400));
  }

  //Find plot
  const plot = await PlotDetails.findOne({
    plotNumber,
    isDeleted: false,
    isActive: true,
  });

  if (!plot) {
    return next(new ErrorHandler("Plot not found", 404));
  }

  //Find buildings using plotId
  const buildings = await BuildingDetails.find({
    plotId: plot._id,
    isDeleted: false,
    isActive: true,
  }).select("_id buildingName buildingUsage buildingSqft");

  res.status(200).json({
    success: true,
    data: {
      plotId: plot._id,
      plotNumber: plot.plotNumber,
      buildings,
    },
  });
});

// GET FLOORS BY BUILDING ID

exports.getFloorsByBuildingId = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  if (!buildingId) {
    return next(new ErrorHandler("Building ID is required", 400));
  }

  // Check building exists
  const building = await BuildingDetails.findOne({
    _id: buildingId,
    isDeleted: false,
    isActive: true,
  });

  if (!building) {
    return next(new ErrorHandler("Building not found", 404));
  }

  // Get floors
  const floors = await FloorDetails.find({
    buildingId,
    isDeleted: false,
    isActive: true,
  }).select("_id floorName");

  if (!floors.length) {
    return next(new ErrorHandler("No floors found", 404));
  }

  res.status(200).json({
    success: true,
    data: floors,
  });
});

// =========================
// GET UNITS BY FLOOR ID
// =========================
exports.getUnitsByFloorId = catchAsync(async (req, res, next) => {
  const { floorId } = req.params;

  // validation
  if (!floorId) {
    return next(new ErrorHandler("Floor ID is required", 400));
  }

  //check floor exists
  const floor = await FloorDetails.findOne({
    _id: floorId,
    isDeleted: false,
    isActive: true,
  });

  if (!floor) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  // fetch units
  const units = await Unit.find({
    floorId,
    isDeleted: false,
    status: "AVAILABLE",
  }).select("_id unitId usageType tenantName totalSqm status");

  // check empty
  if (!units || units.length === 0) {
    return next(new ErrorHandler("No units found for this floor", 404));
  }

  // response
  res.status(200).json({
    success: true,
    data: units,
  });
});

//get all applications
exports.getAllApplications = catchAsync(async (req, res, next) => {
  const applications = await ContractorApplication.find({
    isDeleted: false,
    contractorId: req.user._id,
  })
    .populate("buildingId", "buildingName")
    .populate("unitId", "unitId usageType totalSqm availableSqm usedSqm status")
    .populate(
      "versions.redesign.inputUnits.unitId",
      "unitId usageType totalSqm availableSqm usedSqm status",
    )
    .populate({
      path: "plotId",
      select: "landlordId plotNumber",
      populate: {
        path: "landlordId",
        select: "name mobile_number",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  const formattedApplications = applications.map((application) => ({
    ...application,

    landlord: {
      name: application.plotId?.landlordId?.name || null,
      mobileNumber: application.plotId?.landlordId?.mobile_number || null,
    },
  }));

  res.status(200).json({
    success: true,
    data: applications,
  });
});

//get application by id
exports.getApplicationById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const application = await ContractorApplication.findOne({
    _id: id,
    isDeleted: false,
  }).populate({
    path: "plotId",
    select: "landlordId plotNumber",
    populate: {
      path: "landlordId",
      select: "name mobile_number",
    },
  });

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      ...application.toObject(),

      landlord: {
        name: application.plotId?.landlordId?.name || null,
        mobileNumber: application.plotId?.landlordId?.mobile_number || null,
      },
    },
  });
});

// resubmit application
exports.resubmitApplication = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { applicationId } = req.params;

    // Only fields provided by user will override previous version
    const {
      usageType,
      totalUnitAreaSqm,
      areaVariationSqm,
      hasMezzanine,
      totalUnitAreaAfterMezzanineSqm,

      tenantName,
      tenantMobile,
      tenantEmail,

      ejariDocument,
      appointmentLetter,
      fitOutDrawings,

      redesign,
    } = req.body;

    // ================= FETCH APPLICATION =================
    const application =
      await ContractorApplication.findById(applicationId).session(session);

    if (!application) {
      throw new ErrorHandler("Application not found", 404);
    }

    // ================= GET LAST VERSION =================
    const lastVersion = application.versions[application.versions.length - 1];

    // ================= VALIDATION =================
    // Only rejected applications can be resubmitted
    if (lastVersion.status !== "REJECTED") {
      throw new ErrorHandler(
        "Only rejected application can be resubmitted",
        400,
      );
    }

    // ================= VERSION INCREMENT =================
    const newVersionNumber = application.currentVersion + 1;

    // ================= DOCUMENT MERGE HELPER =================
    // If new file provided → add new version
    // Else → keep previous documents
    const mergeDocs = (oldDocs = [], newFile) => {
      if (!newFile) return oldDocs;

      return [
        ...oldDocs,
        {
          versionNumber: newVersionNumber,
          fileUrl: newFile,
        },
      ];
    };

    // ================= VERSION MERGE LOGIC =================
    // New version is created by merging:
    // New input (req.body)
    // Old version (fallback)
    const newVersion = {
      versionNumber: newVersionNumber,

      usageType: usageType ?? lastVersion.usageType,
      totalUnitAreaSqm: totalUnitAreaSqm ?? lastVersion.totalUnitAreaSqm,
      areaVariationSqm: areaVariationSqm ?? lastVersion.areaVariationSqm,

      hasMezzanine: hasMezzanine ?? lastVersion.hasMezzanine,

      totalUnitAreaAfterMezzanineSqm:
        totalUnitAreaAfterMezzanineSqm ??
        lastVersion.totalUnitAreaAfterMezzanineSqm,

      tenantName: tenantName ?? lastVersion.tenantName,
      tenantMobile: tenantMobile ?? lastVersion.tenantMobile,
      tenantEmail: tenantEmail ?? lastVersion.tenantEmail,

      // ================= REDESIGN HANDLING =================
      // Only applicable for redesign applications
      // If new redesign provided → update
      // Else → retain previous redesign
      redesign:
        application.unitType === "Redesign Unit"
          ? (redesign ?? lastVersion.redesign)
          : undefined,

      // ================= DOCUMENT VERSIONING =================
      documents: {
        ejariDocument: mergeDocs(
          lastVersion.documents?.ejariDocument,
          ejariDocument,
        ),
        appointmentLetter: mergeDocs(
          lastVersion.documents?.appointmentLetter,
          appointmentLetter,
        ),
        fitOutDrawings: mergeDocs(
          lastVersion.documents?.fitOutDrawings,
          fitOutDrawings,
        ),
      },

      // ================= STATUS RESET =================
      status: "UNDER_REVIEW",
    };

    // ================= SAVE NEW VERSION =================
    application.versions.push(newVersion);
    application.currentVersion = newVersionNumber;

    await application.save({ session });

    // ================= COMMIT TRANSACTION =================
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Application resubmitted successfully",
      data: application,
    });
  } catch (error) {
    // ================= ROLLBACK =================
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

// get floor by application
exports.getFloorByApplicationId = catchAsync(async (req, res, next) => {
  const { applicationId } = req.params;

  const application =
    await ContractorApplication.findById(applicationId).populate("floorId");

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  if (!application.floorId) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Floor found successfully",
    data: application.floorId,
  });
});

// exports.rejectApplication = catchAsync(async (req, res, next) => {
//   try {
//     const { applicationId } = req.params;
//     const { remarks } = req.body;

//     const application = await ContractorApplication.findById(applicationId);

//     if (!application) {
//       return next(new ErrorHandler("Application not found", 404));
//     }

//     // current version
//     const currentVersion =
//       application.versions[application.versions.length - 1];

//     // already rejected
//     if (currentVersion.status === "REJECTED") {
//       return next(new ErrorHandler("Already rejected", 400));
//     }

//     // already approved
//     if (currentVersion.status === "APPROVED") {
//       return next(new ErrorHandler("Already approved", 400));
//     }

//     // update current version
//     currentVersion.status = "REJECTED";
//     currentVersion.remarks = remarks || "Rejected";
//     currentVersion.reviewedAt = new Date();

//     await application.save();

//     res.status(200).json({
//       success: true,
//       message: "Application rejected successfully",
//       data: application,
//     });
//   } catch (error) {
//     next(error);
//   }
// });

exports.submitApplicationSingle = catchAsync(async (req, res, next) => {
  let applicationDoc;

  await mongoose.connection.transaction(async (session) => {
    const {
      plotId,
      floorId,
      unitId,
      buildingId,
      usageType,
      totalUnitAreaSqm,
      areaVariationSqm,
      hasMezzanine,
      fitOutAffectedArea,
      totalUnitAreaAfterMezzanineSqm,
      mezzanineAreaToAdd,
      fitOutAffectedAreaAfterMezzanine,
      tenantName,
      tenantMobile,
      tenantEmail,
      ejariDocument,
      appointmentLetter,
      fitOutDrawings,
    } = req.body;

    // ================= VALIDATION =================
    if (!plotId || !floorId || !unitId || !buildingId) {
      throw new ErrorHandler("Plot, Building, Floor and Unit required", 400);
    }

    if (!usageType || !totalUnitAreaSqm) {
      throw new ErrorHandler("Unit details missing", 400);
    }

    if (hasMezzanine && !totalUnitAreaAfterMezzanineSqm) {
      throw new ErrorHandler("Mezzanine area required", 400);
    }

    // ================= FETCH =================
    const [plot, floor, unit, building] = await Promise.all([
      PlotDetails.findById(plotId).session(session),
      FloorDetails.findById(floorId).session(session),
      Unit.findById(unitId).session(session),
      BuildingDetails.findById(buildingId).session(session),
    ]);

    if (!plot || !floor || !unit || !building) {
      throw new ErrorHandler("Invalid selection", 400);
    }

    const contractorId = req.user?._id || null;

    // ================= RELATION CHECK =================
    if (floor.buildingId.toString() !== buildingId) {
      throw new ErrorHandler("Floor does not belong to building", 400);
    }

    if (unit.floorId.toString() !== floorId) {
      throw new ErrorHandler("Unit does not belong to floor", 400);
    }

    if (unit.status !== "AVAILABLE") {
      throw new ErrorHandler("Unit already consumed", 400);
    }

    // ================= DUPLICATE CHECK =================
    const exist = await ContractorApplication.findOne({
      isDeleted: false,
      $or: [{ unitId }, { "versions.redesign.inputUnits.unitId": unitId }],
    }).session(session);

    if (exist) {
      throw new ErrorHandler("Application already exists", 400);
    }

    // ================= UPDATE UNIT =================
    const updatedUnit = await Unit.findOneAndUpdate(
      { _id: unitId, status: "AVAILABLE" },
      { status: "CONSUMED" },
      { session },
    );

    if (!updatedUnit) {
      throw new ErrorHandler("Unit already consumed or not found", 400);
    }

    // ================= FINAL AREA =================
    const finalArea = hasMezzanine
      ? totalUnitAreaAfterMezzanineSqm
      : totalUnitAreaSqm;

    const displayUnit = `${unit.unitId} (${finalArea} sqm)`;

    // ================= DOC HELPER =================
    const buildDocs = (file) =>
      file ? [{ versionNumber: 1, fileUrl: file }] : [];

    // ================= REFERENCE =================
    const seq = await getNextSequence("application", session);
    const referenceNumber = `APP${String(seq).padStart(9, "0")}`;

    // ================= CREATE =================
    const [doc] = await ContractorApplication.create(
      [
        {
          referenceNumber,
          plotId,
          floorId,
          unitId,
          buildingId,
          contractorId,
          plotNumber: plot.plotNumber,
          buildingName: building.buildingName,
          floorNumber: floor.floorName,
          displayUnit,
          unitType: "Single Unit",
          currentVersion: 1,
          versions: [
            {
              versionNumber: 1,
              usageType,
              totalUnitAreaSqm: finalArea,
              areaVariationSqm: areaVariationSqm || 0,
              hasMezzanine: !!hasMezzanine,
              fitOutAffectedArea: fitOutAffectedArea || 0,
              mezzanineAreaToAdd: mezzanineAreaToAdd || 0,
              fitOutAffectedAreaAfterMezzanine:
                fitOutAffectedAreaAfterMezzanine || 0,
              totalUnitAreaAfterMezzanineSqm: hasMezzanine
                ? totalUnitAreaAfterMezzanineSqm
                : null,
              tenantName,
              tenantMobile,
              tenantEmail,
              documents: {
                ejariDocument: buildDocs(ejariDocument),
                appointmentLetter: buildDocs(appointmentLetter),
                fitOutDrawings: buildDocs(fitOutDrawings),
              },
              status: "UNDER_REVIEW",
            },
          ],
        },
      ],
      { session },
    );

    applicationDoc = doc;
  });

  // ================= RESPONSE =================
  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: applicationDoc,
  });
});

// exports.submitApplicationRedesign = catchAsync(async (req, res, next) => {
//   let applicationDoc;
//   let createdUnits = [];

//   await mongoose.connection.transaction(async (session) => {
//     let {
//       unitType,
//       plotId,
//       floorId,
//       buildingId,
//       inputUnits,
//       redesignType,
//       resultUnits: inputResultUnits = [],
//       modifyArea = 0,
//       usageType,
//       tenantName,
//       tenantMobile,
//       tenantEmail,
//       ejariDocument,
//       appointmentLetter,
//       fitOutDrawings,
//       hasMezzanine,
//       fitOutAffectedArea,
//       mezzanineAreaToAdd,
//       fitOutAffectedAreaAfterMezzanine,
//       totalUnitAreaAfterMezzanineSqm,
//     } = req.body;

//     let resultUnits = [];

//     // ================= VALIDATION =================
//     if (unitType !== "Redesign Unit") {
//       throw new ErrorHandler("Invalid unitType", 400);
//     }

//     if (!inputUnits?.length) {
//       throw new ErrorHandler("inputUnits required", 400);
//     }

//     const [plot, floor, building] = await Promise.all([
//       PlotDetails.findById(plotId).session(session),
//       FloorDetails.findById(floorId).session(session),
//       BuildingDetails.findById(buildingId).session(session),
//     ]);

//     if (!plot || !floor || !building) {
//       throw new ErrorHandler("Invalid selection", 400);
//     }

//     const contractorId = req.user?._id || null;

//     // ================= FETCH UNITS =================
//     const unitIds = inputUnits.map((u) => u.unitId);

//     const units = await Unit.find({
//       _id: { $in: unitIds },
//       isDeleted: false,
//       status: "AVAILABLE",
//     }).session(session);

//     if (units.length !== inputUnits.length) {
//       throw new ErrorHandler("Some units not found", 404);
//     }

//     // ================= AREA =================
//     let baseArea = 0;

//     for (let input of inputUnits) {
//       const unit = units.find(
//         (u) => u._id.toString() === input.unitId.toString(),
//       );

//       if (!unit) throw new ErrorHandler("Unit not found", 404);

//       if (input.area > unit.availableSqm) {
//         throw new ErrorHandler(`Not enough area in ${unit.unitId}`, 400);
//       }

//       baseArea += input.area;
//     }

//     let finalArea = baseArea + modifyArea;

//     if (hasMezzanine) {
//       if (!totalUnitAreaAfterMezzanineSqm) {
//         throw new ErrorHandler("Mezzanine area required", 400);
//       }
//       finalArea = totalUnitAreaAfterMezzanineSqm;
//     }

//     if (finalArea <= 0) {
//       throw new ErrorHandler("Invalid final area", 400);
//     }

//     // ================= VALIDATE RESULT =================
//     if (
//       ["SPLIT", "MERGE_AND_SPLIT", "SPLIT_AND_MERGE"].includes(redesignType)
//     ) {
//       const total = inputResultUnits.reduce((sum, r) => sum + r.area, 0);

//       if (total !== finalArea) {
//         throw new ErrorHandler("Result area mismatch", 400);
//       }
//     }

//     // ================= NAME GENERATOR =================
//     const generateName = (type, units, area) => {
//       const names = units.map((u) => u.unitId).join(", ");
//       return `${type} - ${names} (${area} sqm)`;
//     };

//     // ================= CASE 1: MERGE =================
//     if (redesignType === "MERGE") {
//       await Unit.updateMany(
//         { _id: { $in: unitIds } },
//         { status: "CONSUMED" },
//         { session },
//       );

//       const finalName = `${generateName("MERGE", units, finalArea)}-${Date.now()}`;

//       const mergedUnit = await Unit.create(
//         [
//           {
//             floorId,
//             buildingId,
//             unitId: finalName,
//             usageType,
//             fitOutWork: "YES",
//             totalSqm: finalArea,
//             availableSqm: finalArea,
//             usedSqm: 0,
//             parentUnits: unitIds,
//           },
//         ],
//         { session },
//       );

//       createdUnits.push(mergedUnit[0]);
//       resultUnits = [{ name: finalName, area: finalArea }];
//     }

//     // ================= CASE 2: SPLIT =================
//     if (redesignType === "SPLIT") {
//       const unit = units[0];

//       await Unit.findByIdAndUpdate(
//         unit._id,
//         { status: "CONSUMED" },
//         { session },
//       );

//       for (let r of inputResultUnits) {
//         const finalName = `${r.name} (${r.area} sqm)-${Date.now()}`;

//         const newUnit = await Unit.create(
//           [
//             {
//               floorId,
//               buildingId,
//               unitId: finalName,
//               usageType,
//               fitOutWork: unit.fitOutWork,
//               totalSqm: r.area,
//               availableSqm: r.area,
//               usedSqm: 0,
//               parentUnits: [unit._id],
//             },
//           ],
//           { session },
//         );

//         createdUnits.push(newUnit[0]);
//         resultUnits.push({ name: finalName, area: r.area });
//       }
//     }

//     // ================= CASE 3 & 4 =================
//     if (["MERGE_AND_SPLIT", "SPLIT_AND_MERGE"].includes(redesignType)) {
//       await Unit.updateMany(
//         { _id: { $in: unitIds } },
//         { status: "CONSUMED" },
//         { session },
//       );

//       for (let r of inputResultUnits) {
//         const finalName = `${r.name} (${r.area} sqm)-${Date.now()}`;

//         const newUnit = await Unit.create(
//           [
//             {
//               floorId,
//               buildingId,
//               unitId: finalName,
//               usageType,
//               fitOutWork: "YES",
//               totalSqm: r.area,
//               availableSqm: r.area,
//               usedSqm: 0,
//               parentUnits: unitIds,
//             },
//           ],
//           { session },
//         );

//         createdUnits.push(newUnit[0]);
//         resultUnits.push({ name: finalName, area: r.area });
//       }
//     }

//     // ================= DOCUMENT =================
//     const buildDocs = (file) =>
//       file ? [{ versionNumber: 1, fileUrl: file }] : [];

//     const seq = await getNextSequence("application", session);
//     const referenceNumber = `APP${String(seq).padStart(9, "0")}`;

//     // const displayUnit = generateName(redesignType, units, finalArea);

//     let displayUnit = "";

//     if (
//       ["SPLIT", "MERGE_AND_SPLIT", "SPLIT_AND_MERGE"].includes(redesignType)
//     ) {
//       displayUnit = resultUnits.map((r) => r.name).join(", ");
//     } else if (redesignType === "MERGE") {
//       displayUnit = `${redesignType} - ${units
//         .map((u) => u.unitId)
//         .join(", ")} (${finalArea} sqm)`;
//     }

//     const [doc] = await ContractorApplication.create(
//       [
//         {
//           referenceNumber,
//           plotId,
//           floorId,
//           buildingId,
//           contractorId,
//           plotNumber: plot.plotNumber,
//           buildingName: building.buildingName,
//           floorNumber: floor.floorName,
//           unitType: "Redesign Unit",
//           displayUnit,
//           versions: [
//             {
//               versionNumber: 1,
//               usageType,
//               totalUnitAreaSqm: finalArea,
//               hasMezzanine: !!hasMezzanine,
//               fitOutAffectedArea: fitOutAffectedArea || 0,
//               mezzanineAreaToAdd: mezzanineAreaToAdd || 0,
//               fitOutAffectedAreaAfterMezzanine:
//                 fitOutAffectedAreaAfterMezzanine || 0,
//               totalUnitAreaAfterMezzanineSqm: hasMezzanine
//                 ? totalUnitAreaAfterMezzanineSqm
//                 : null,
//               tenantName,
//               tenantMobile,
//               tenantEmail,
//               redesign: {
//                 redesignType,
//                 inputUnits,
//                 resultUnits,
//               },
//               documents: {
//                 ejariDocument: buildDocs(ejariDocument),
//                 appointmentLetter: buildDocs(appointmentLetter),
//                 fitOutDrawings: buildDocs(fitOutDrawings),
//               },
//               status: "UNDER_REVIEW",
//             },
//           ],
//         },
//       ],
//       { session },
//     );

//     applicationDoc = doc;
//   });

//   // ================= RESPONSE =================
//   res.status(201).json({
//     success: true,
//     message: "Redesign applied successfully",
//     data: applicationDoc,
//     newUnits: createdUnits,
//   });
// });

exports.submitApplicationRedesign = catchAsync(async (req, res, next) => {
  let applicationDoc;
  let createdUnits = [];

  await mongoose.connection.transaction(async (session) => {
    let {
      unitType,
      plotId,
      floorId,
      buildingId,
      inputUnits,
      redesignType,
      resultUnits: inputResultUnits = [],
      modifyArea = 0,
      usageType,
      tenantName,
      tenantMobile,
      tenantEmail,
      ejariDocument,
      appointmentLetter,
      fitOutDrawings,
      hasMezzanine,
      fitOutAffectedArea,
      mezzanineAreaToAdd,
      fitOutAffectedAreaAfterMezzanine,
      totalUnitAreaAfterMezzanineSqm,
    } = req.body;

    let resultUnits = [];

    // ================= VALIDATION =================
    if (unitType !== "Redesign Unit") {
      throw new ErrorHandler("Invalid unitType", 400);
    }

    if (!inputUnits?.length) {
      throw new ErrorHandler("inputUnits required", 400);
    }

    const [plot, floor, building] = await Promise.all([
      PlotDetails.findById(plotId).session(session),
      FloorDetails.findById(floorId).session(session),
      BuildingDetails.findById(buildingId).session(session),
    ]);

    if (!plot || !floor || !building) {
      throw new ErrorHandler("Invalid selection", 400);
    }

    const contractorId = req.user?._id || null;

    // ================= FETCH UNITS =================
    const unitIds = inputUnits.map((u) => u.unitId);

    const units = await Unit.find({
      _id: { $in: unitIds },
      isDeleted: false,
      status: "AVAILABLE",
    }).session(session);

    if (units.length !== inputUnits.length) {
      throw new ErrorHandler("Some units not found", 404);
    }

    // ================= AREA =================
    let baseArea = 0;

    for (let input of inputUnits) {
      const unit = units.find(
        (u) => u._id.toString() === input.unitId.toString(),
      );

      if (!unit) throw new ErrorHandler("Unit not found", 404);

      if (input.area > unit.availableSqm) {
        throw new ErrorHandler(`Not enough area in ${unit.unitId}`, 400);
      }

      baseArea += input.area;
    }

    let finalArea = baseArea + modifyArea;

    if (hasMezzanine) {
      if (!totalUnitAreaAfterMezzanineSqm) {
        throw new ErrorHandler("Mezzanine area required", 400);
      }
      finalArea = totalUnitAreaAfterMezzanineSqm;
    }

    if (finalArea <= 0) {
      throw new ErrorHandler("Invalid final area", 400);
    }

    // ================= VALIDATE RESULT =================
    if (
      ["SPLIT", "MERGE_AND_SPLIT", "SPLIT_AND_MERGE"].includes(redesignType)
    ) {
      const total = inputResultUnits.reduce((sum, r) => sum + r.area, 0);

      // if (total !== finalArea) {
      //   throw new ErrorHandler("Result area mismatch", 400);
      // }

      // CHANGED: allow remaining area
      if (total > finalArea) {
        throw new ErrorHandler(
          "Result units area cannot exceed available area",
          400,
        );
      }
    }

    // ================= NAME GENERATOR =================
    const generateName = (type, units, area) => {
      const names = units.map((u) => u.unitId).join(", ");
      return `${type} - ${names} (${area} sqm)`;
    };

    // ================= CASE 1: MERGE =================
    if (redesignType === "MERGE") {
      await Unit.updateMany(
        { _id: { $in: unitIds } },
        { status: "CONSUMED" },
        { session },
      );

      const finalName = `${generateName("MERGE", units, finalArea)}-${Date.now()}`;

      const mergedUnit = await Unit.create(
        [
          {
            floorId,
            buildingId,
            unitId: finalName,
            usageType,
            fitOutWork: "YES",
            totalSqm: finalArea,
            availableSqm: finalArea,
            usedSqm: 0,
            parentUnits: unitIds,
          },
        ],
        { session },
      );

      createdUnits.push(mergedUnit[0]);
      resultUnits = [{ name: finalName, area: finalArea }];
    }

    // ================= CASE 2: SPLIT =================
    if (redesignType === "SPLIT") {
      const unit = units[0];

      await Unit.findByIdAndUpdate(
        unit._id,
        { status: "CONSUMED" },
        { session },
      );

      for (let r of inputResultUnits) {
        // const finalName = `${r.name} (${r.area} sqm)-${Date.now()}`;

        const finalName = r.name;

        const newUnit = await Unit.create(
          [
            // {
            //   floorId,
            //   buildingId,
            //   unitId: finalName,
            //   usageType,
            //   fitOutWork: unit.fitOutWork,
            //   totalSqm: r.area,
            //   availableSqm: r.area,
            //   usedSqm: 0,
            //   parentUnits: [unit._id],
            // },
            {
              floorId,
              buildingId,
              unitId: finalName,
              usageType,
              fitOutWork: unit.fitOutWork,
              totalSqm: r.area,
              availableSqm: 0,
              usedSqm: r.area,
              status: "CONSUMED",
              parentUnits: [unit._id],
            },
          ],
          { session },
        );

        createdUnits.push(newUnit[0]);
        resultUnits.push({ name: finalName, area: r.area });
      }
      const usedArea = inputResultUnits.reduce((sum, r) => sum + r.area, 0);

      const remainingArea = finalArea - usedArea;

      if (remainingArea > 0 && inputResultUnits.length > 0) {
        const balanceUnitName = `${unit.unitId}A`;

        const balanceUnit = await Unit.create(
          [
            {
              floorId,
              buildingId,
              unitId: balanceUnitName,
              usageType,
              fitOutWork: unit.fitOutWork,
              totalSqm: remainingArea,
              availableSqm: remainingArea,
              usedSqm: 0,
              parentUnits: [unit._id],
            },
          ],
          { session },
        );

        createdUnits.push(balanceUnit[0]);

        resultUnits.push({
          name: balanceUnitName,
          area: remainingArea,
        });
      }
    }

    // ================= CASE 3 & 4 =================
    if (["MERGE_AND_SPLIT", "SPLIT_AND_MERGE"].includes(redesignType)) {
      await Unit.updateMany(
        { _id: { $in: unitIds } },
        { status: "CONSUMED" },
        { session },
      );

      for (let r of inputResultUnits) {
        // const finalName = `${r.name} (${r.area} sqm)-${Date.now()}`;
        const finalName = r.name;

        const newUnit = await Unit.create(
          [
            // {
            //   floorId,
            //   buildingId,
            //   unitId: finalName,
            //   usageType,
            //   fitOutWork: "YES",
            //   totalSqm: r.area,
            //   availableSqm: r.area,
            //   usedSqm: 0,
            //   parentUnits: unitIds,
            // },
            {
              floorId,
              buildingId,
              unitId: finalName,
              usageType,
              fitOutWork: "YES",
              totalSqm: r.area,
              availableSqm: 0,
              usedSqm: r.area,
              status: "CONSUMED",
              parentUnits: unitIds,
            },
          ],
          { session },
        );

        createdUnits.push(newUnit[0]);
        resultUnits.push({ name: finalName, area: r.area });
      }
      const usedArea = inputResultUnits.reduce((sum, r) => sum + r.area, 0);

      const remainingArea = finalArea - usedArea;

      if (remainingArea > 0 && inputResultUnits.length > 0) {
        const originalName = units[0].unitId.split(" (")[0];
        const balanceUnitName = `${originalName}A`;

        const balanceUnit = await Unit.create(
          [
            {
              floorId,
              buildingId,
              unitId: balanceUnitName,
              usageType,
              fitOutWork: "YES",
              totalSqm: remainingArea,
              availableSqm: remainingArea,
              usedSqm: 0,
              parentUnits: unitIds,
            },
          ],
          { session },
        );

        createdUnits.push(balanceUnit[0]);

        resultUnits.push({
          name: balanceUnitName,
          area: remainingArea,
        });
      }
    }

    // ================= DOCUMENT =================
    const buildDocs = (file) =>
      file ? [{ versionNumber: 1, fileUrl: file }] : [];

    const seq = await getNextSequence("application", session);
    const referenceNumber = `APP${String(seq).padStart(9, "0")}`;

    // const displayUnit = generateName(redesignType, units, finalArea);

    let displayUnit = "";

    if (
      ["SPLIT", "MERGE_AND_SPLIT", "SPLIT_AND_MERGE"].includes(redesignType)
    ) {
      // displayUnit = resultUnits.map((r) => r.name).join(", ");
      displayUnit = `${redesignType} - ${inputResultUnits
        .map((r) => `${r.name} (${r.area} sqm)`)
        .join(", ")}`;
    } else if (redesignType === "MERGE") {
      displayUnit = `${redesignType} - ${units
        .map((u) => u.unitId)
        .join(", ")} (${finalArea} sqm)`;
    }

    const [doc] = await ContractorApplication.create(
      [
        {
          referenceNumber,
          plotId,
          floorId,
          buildingId,
          contractorId,
          plotNumber: plot.plotNumber,
          buildingName: building.buildingName,
          floorNumber: floor.floorName,
          unitType: "Redesign Unit",
          displayUnit,
          versions: [
            {
              versionNumber: 1,
              usageType,
              totalUnitAreaSqm: finalArea,
              hasMezzanine: !!hasMezzanine,
              fitOutAffectedArea: fitOutAffectedArea || 0,
              mezzanineAreaToAdd: mezzanineAreaToAdd || 0,
              fitOutAffectedAreaAfterMezzanine:
                fitOutAffectedAreaAfterMezzanine || 0,
              totalUnitAreaAfterMezzanineSqm: hasMezzanine
                ? totalUnitAreaAfterMezzanineSqm
                : null,
              tenantName,
              tenantMobile,
              tenantEmail,
              redesign: {
                redesignType,
                inputUnits,
                resultUnits: inputResultUnits,
              },
              documents: {
                ejariDocument: buildDocs(ejariDocument),
                appointmentLetter: buildDocs(appointmentLetter),
                fitOutDrawings: buildDocs(fitOutDrawings),
              },
              status: "UNDER_REVIEW",
            },
          ],
        },
      ],
      { session },
    );

    applicationDoc = doc;
  });

  // ================= RESPONSE =================
  res.status(201).json({
    success: true,
    message: "Redesign applied successfully",
    data: applicationDoc,
    newUnits: createdUnits,
  });
});
