const mongoose = require("mongoose");
const PlotDetails = require("./plot.model");
const { s3Uploadv2 } = require("../../utils/s3");
const User = require("../modules/user/user.model");
const Role = require("../modules/role/role.model");
const UnitDetails = require("../floor-unit/floor-unit.model");
const FloorDetails = require("../floor/floor.model");
const BuildingDetails = require("../Building/building.model");
const ApprovedDocument = require("../approved-documents/approved-documents.model");
const ErrorHandler = require("../../utils/errorHandler");
const catchAsync = require("../../utils/catchAsyncError");
const ContractorApplication = require("../contractor-application/contractor-application.model");
const Unit = require("../floor-unit/floor-unit.model");
const DrawingSubmission = require("../drawing-submission/drawing-submission.model");
const InspectionDetail = require("../inspection-detail/inspectionDetail.model");
const WorkPermit = require("../work-permit/workPermit.model");

const awsUrl = process.env.AWS_BASE_URL;

exports.createPlot = async (req, res) => {
  try {
    const { landlordId } = req.body;

    if (!landlordId) {
      return res.status(400).json({
        success: false,
        message: "landlordId is required",
      });
    }

    const user = await User.findById(landlordId).lean();

    if (!user || user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Invalid landlord",
      });
    }

    const role = await Role.findOne({ name: "LANDLORD" });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role not found",
      });
    }

    if (user.role.toString() !== role._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "User is not a landlord",
      });
    }

    req.body.landlordName = user.name;
    req.body.landlordEmail = user.email;
    req.body.landlordMobile = user.mobile_number;

    const plot = await PlotDetails.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Plot created successfully",
      data: plot,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// upload
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const folder = req.body.folder || "resources";

    const uploadResult = await s3Uploadv2(req.file, folder);

    const docUrl = `${awsUrl}/${uploadResult.Key}`;

    return res.status(200).json({
      success: true,
      data: {
        docUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      },
      message: "File uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all plots
exports.getAllPlots = async (req, res) => {
  try {
    const plots = await PlotDetails.find({ isDeleted: false });
    res.status(200).json({
      success: true,
      data: plots,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get plot by id
exports.getPlotById = async (req, res) => {
  try {
    const plot = await PlotDetails.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: "Plot not found",
      });
    }

    res.status(200).json({
      success: true,
      data: plot,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update plot
exports.updatePlot = async (req, res) => {
  try {
    const plot = await PlotDetails.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true },
    );

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: "Plot not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plot updated successfully",
      data: plot,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// delete plot
exports.deletePlot = async (req, res) => {
  try {
    const plot = await PlotDetails.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true },
    );

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: "Plot not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Plot deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createProject = catchAsync(async (req, res, next) => {
  const { landlordId, landlord, plot, building } = req.body;

  //VALIDATION
  if (!plot) {
    return next(new ErrorHandler("Plot data is required", 400));
  }

  if (!building) {
    return next(new ErrorHandler("Building data is required", 400));
  }

  //LANDLORD
  const role = await Role.findOne({ name: "LANDLORD" });
  if (!role) return next(new ErrorHandler("Landlord role not found", 404));

  let finalLandlord;

  if (landlordId) {
    const user = await User.findById(landlordId);
    if (!user || user.isDeleted) {
      return next(new ErrorHandler("Invalid landlordId", 400));
    }
    finalLandlord = user;
  } else {
    if (!landlord?.name || !landlord?.email || !landlord?.mobile_number) {
      return next(new ErrorHandler("Landlord details required", 400));
    }

    const exist = await User.findOne({
      $or: [
        { email: landlord.email },
        { mobile_number: landlord.mobile_number },
      ],
      role: role._id,
      isDeleted: false,
    });

    if (exist) {
      return next(new ErrorHandler("Landlord already exists", 400));
    }

    finalLandlord = await User.create({
      name: landlord.name,
      email: landlord.email,
      mobile_number: landlord.mobile_number,
      role: role._id,
      password: "1234",
      isVerified: true,
    });
  }

  // FIND EXISTING PLOT
  let createdPlot = await PlotDetails.findOne({
    plotNumber: plot.plotNumber,
    isDeleted: false,
  });

  if (
    createdPlot &&
    createdPlot.landlordId.toString() !== finalLandlord._id.toString()
  ) {
    return next(
      new ErrorHandler(
        `Plot number ${plot.plotNumber} belongs to another landlord`,
        400,
      ),
    );
  }

  // CREATE PLOT IF NOT EXISTS
  if (!createdPlot) {
    createdPlot = await PlotDetails.create({
      landlordId: finalLandlord._id,
      plotNumber: plot.plotNumber,
    });
  }

  const existingBuilding = await BuildingDetails.findOne({
    plotId: createdPlot._id,
    buildingName: building.buildingName,
    isDeleted: false,
  });

  if (existingBuilding) {
    return next(
      new ErrorHandler(
        `Building ${building.buildingName} already exists in this plot`,
        400,
      ),
    );
  }

  //CREATE BUILDING
  const newBuilding = await BuildingDetails.create({
    plotId: createdPlot._id,
    buildingName: building.buildingName,
    buildingSqft: building.buildingSqft,
    buildingUsage: building.buildingUsage,

    documents: {
      siteAffectionPlan: {
        url: building?.documents?.siteAffectionPlan?.url || null,
        fileName: building?.documents?.siteAffectionPlan?.fileName || null,
        fileSize: building?.documents?.siteAffectionPlan?.fileSize || null,
      },

      dmCompletionCertificate: {
        url: building?.documents?.dmCompletionCertificate?.url || null,
        fileName:
          building?.documents?.dmCompletionCertificate?.fileName || null,
        fileSize:
          building?.documents?.dmCompletionCertificate?.fileSize || null,
      },

      civilDefenseCertificate: {
        url: building?.documents?.civilDefenseCertificate?.url || null,
        fileName:
          building?.documents?.civilDefenseCertificate?.fileName || null,
        fileSize:
          building?.documents?.civilDefenseCertificate?.fileSize || null,
      },

      amcContract: {
        url: building?.documents?.amcContract?.url || null,
        fileName: building?.documents?.amcContract?.fileName || null,
        fileSize: building?.documents?.amcContract?.fileSize || null,
      },

      dewaApprovedLoadSchedule: {
        url: building?.documents?.dewaApprovedLoadSchedule?.url || null,
        fileName:
          building?.documents?.dewaApprovedLoadSchedule?.fileName || null,
        fileSize:
          building?.documents?.dewaApprovedLoadSchedule?.fileSize || null,
      },
    },
  });

  let allFloors = [];

  //FLOORS LOOP
  if (building.floors && building.floors.length > 0) {
    for (let floor of building.floors) {
      const newFloor = await FloorDetails.create({
        buildingId: newBuilding._id,
        floorName: floor.floorName,
        totalFloorAreaSqm: floor.totalFloorAreaSqm,
        circulationAreaSqm: floor.circulationAreaSqm,

        architecturalDrawing: {
          url: floor?.architecturalDrawing?.url || null,
          fileName: floor?.architecturalDrawing?.fileName || null,
          fileSize: floor?.architecturalDrawing?.fileSize || null,
        },

        structuralDrawing: {
          url: floor?.structuralDrawing?.url || null,
          fileName: floor?.structuralDrawing?.fileName || null,
          fileSize: floor?.structuralDrawing?.fileSize || null,
        },

        mepDrawing: {
          url: floor?.mepDrawing?.url || null,
          fileName: floor?.mepDrawing?.fileName || null,
          fileSize: floor?.mepDrawing?.fileSize || null,
        },
      });

      let createdUnits = [];

      //UNITS
      if (floor.units && floor.units.length > 0) {
        for (let unit of floor.units) {
          const newUnit = await UnitDetails.create({
            buildingId: newBuilding._id,
            floorId: newFloor._id,
            unitId: unit.unitId,
            tenantName: unit.tenantName || null,
            usageType: unit.usageType,
            fitOutWork: unit.fitOutWork,
            totalSqm: unit.totalSqm,
            availableSqm: unit.totalSqm,
            usedSqm: 0,
            status: "AVAILABLE",
            electricMeter: unit.electricMeter || null,
          });

          createdUnits.push(newUnit);
        }
      }

      //PPROVED DOCUMENT ARRAY
      const approvedDocs = [];

      const approvedDoc = await ApprovedDocument.create({
        floorId: newFloor._id,

        architecturalDrawing: {
          url: floor?.approvedDocuments?.architecturalDrawing?.url || null,
          fileName:
            floor?.approvedDocuments?.architecturalDrawing?.fileName || null,
          fileSize:
            floor?.approvedDocuments?.architecturalDrawing?.fileSize || null,
        },

        structuralDrawing: {
          url: floor?.approvedDocuments?.structuralDrawing?.url || null,
          fileName:
            floor?.approvedDocuments?.structuralDrawing?.fileName || null,
          fileSize:
            floor?.approvedDocuments?.structuralDrawing?.fileSize || null,
        },

        mepDrawing: {
          url: floor?.approvedDocuments?.mepDrawing?.url || null,
          fileName: floor?.approvedDocuments?.mepDrawing?.fileName || null,
          fileSize: floor?.approvedDocuments?.mepDrawing?.fileSize || null,
        },
      });

      approvedDocs.push(approvedDoc);

      allFloors.push({
        ...newFloor.toObject(),
        units: createdUnits,
        approvedDocuments: approvedDocs,
      });
    }
  }

  //RESPONSE
  const populateLandlord = await User.findById(finalLandlord._id)
    .populate("role", "name")
    .select("-password")
    .lean();

  populateLandlord.role = populateLandlord.role.name;

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: {
      landlord: populateLandlord,
      plot: createdPlot,
      building: {
        ...newBuilding.toObject(),
        floors: allFloors,
      },
    },
  });
});

exports.getAllProjects = async (req, res) => {
  try {
    let { page = 1, per_page = 10, search = "" } = req.query;

    page = parseInt(page);
    per_page = parseInt(per_page);

    //Get all buildings
    const filter = { isDeleted: false };

    if (search) {
      filter.buildingName = { $regex: search, $options: "i" };
    }

    const buildings = await BuildingDetails.find(filter)
      .skip((page - 1) * per_page)
      .limit(per_page)
      .sort({ createdAt: -1 });

    const totalRecords = await BuildingDetails.countDocuments(filter);

    //Map projects
    const projects = await Promise.all(
      buildings.map(async (building) => {
        //Plot
        const plot = await PlotDetails.findById(building.plotId);

        //Landlord
        const landlord = await User.findById(plot.landlordId)
          .select("name email mobile_number")
          .lean();

        //Counts
        const totalFloors = await FloorDetails.countDocuments({
          buildingId: building._id,
          isDeleted: false,
        });

        const totalUnits = await UnitDetails.countDocuments({
          buildingId: building._id,
          isDeleted: false,
        });

        return {
          project_id: building._id,

          landlord: landlord
            ? {
                landlord_id: landlord._id,
                name: landlord.name,
                email: landlord.email,
                mobile_number: landlord.mobile_number,
              }
            : null,

          plot: plot
            ? {
                plot_id: plot._id,
                plot_number: plot.plotNumber,
              }
            : null,

          building: {
            building_id: building._id,
            building_name: building.buildingName,
            building_sqft: building.buildingSqft,
            building_usage: building.buildingUsage,
          },

          total_floors: totalFloors,
          total_units: totalUnits,
          created_at: building.createdAt,
        };
      }),
    );

    //Response
    return res.status(200).json({
      success: true,
      message: "All projects fetched successfully",
      data: {
        projects,
        pagination: {
          current_page: page,
          per_page,
          total_records: totalRecords,
          total_pages: Math.ceil(totalRecords / per_page),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ================= ADD FLOOR ONLY =================

exports.addFloorToProject = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  const {
    floorName,
    totalFloorAreaSqm,
    circulationAreaSqm,
    architecturalDrawing,
    structuralDrawing,
    mepDrawing,
  } = req.body;

  // CHECK BUILDING
  const building = await BuildingDetails.findById(buildingId);

  if (!building || building.isDeleted) {
    return next(new ErrorHandler("Building not found", 404));
  }

  // CHECK FLOOR ALREADY EXISTS
  const existFloor = await FloorDetails.findOne({
    buildingId,
    floorName,
    isDeleted: false,
  });

  if (existFloor) {
    return next(new ErrorHandler("Floor already exists", 400));
  }

  // CREATE FLOOR
  const newFloor = await FloorDetails.create({
    buildingId,

    floorName,
    totalFloorAreaSqm,
    circulationAreaSqm,

    architecturalDrawing: {
      url: architecturalDrawing?.url || null,
      fileName: architecturalDrawing?.fileName || null,
      fileSize: architecturalDrawing?.fileSize || null,
    },

    structuralDrawing: {
      url: structuralDrawing?.url || null,
      fileName: structuralDrawing?.fileName || null,
      fileSize: structuralDrawing?.fileSize || null,
    },

    mepDrawing: {
      url: mepDrawing?.url || null,
      fileName: mepDrawing?.fileName || null,
      fileSize: mepDrawing?.fileSize || null,
    },
  });

  res.status(201).json({
    success: true,
    message: "Floor added successfully",
    data: newFloor,
  });
});

// ================= DELETE FLOOR =================

exports.deleteFloor = catchAsync(async (req, res, next) => {
  const { floorId } = req.params;

  const floor = await FloorDetails.findById(floorId);

  if (!floor || floor.isDeleted) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  // SOFT DELETE FLOOR
  floor.isDeleted = true;
  floor.isActive = false;

  await floor.save();

  // DELETE UNITS
  await UnitDetails.updateMany(
    { floorId },
    {
      isDeleted: true,
      isActive: false,
    },
  );

  // DELETE APPROVED DOCS
  await ApprovedDocument.updateMany(
    { floorId },
    {
      isDeleted: true,
      isActive: false,
    },
  );

  res.status(200).json({
    success: true,
    message: "Floor deleted successfully",
  });
});

// ================= GET ALL FLOORS OF PROJECT =================

exports.getProjectFloors = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  const building = await BuildingDetails.findById(buildingId);

  if (!building || building.isDeleted) {
    return next(new ErrorHandler("Building not found", 404));
  }

  const floors = await FloorDetails.find({
    buildingId,
    isDeleted: false,
  }).lean();

  const finalFloors = [];

  for (let floor of floors) {
    const units = await UnitDetails.find({
      floorId: floor._id,
      isDeleted: false,
    });

    const approvedDocuments = await ApprovedDocument.findOne({
      floorId: floor._id,
      isDeleted: false,
    });

    finalFloors.push({
      ...floor,
      units,
      approvedDocuments,
    });
  }

  res.status(200).json({
    success: true,
    count: finalFloors.length,
    data: finalFloors,
  });
});

// ================= GET UNITS BY FLOOR =================

exports.getUnitsByFloor = catchAsync(async (req, res, next) => {
  const { floorId } = req.params;

  const floor = await FloorDetails.findById(floorId);

  if (!floor || floor.isDeleted) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  const units = await UnitDetails.find({
    floorId,
    isDeleted: false,
  });

  res.status(200).json({
    success: true,
    count: units.length,
    data: units,
  });
});

// ================= ADD UNIT =================

exports.addUnit = catchAsync(async (req, res, next) => {
  const { buildingId, floorId } = req.params;

  const { unitId, tenantName, usageType, fitOutWork, totalSqm, electricMeter } =
    req.body;

  // CHECK FLOOR
  const floor = await FloorDetails.findById(floorId);

  if (!floor || floor.isDeleted) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  // CHECK UNIT EXISTS
  const existUnit = await UnitDetails.findOne({
    floorId,
    unitId,
    isDeleted: false,
  });

  if (existUnit) {
    return next(new ErrorHandler("Unit already exists", 400));
  }

  // CREATE UNIT
  const newUnit = await UnitDetails.create({
    buildingId,
    floorId,

    unitId,
    tenantName: tenantName || null,
    usageType,
    fitOutWork,
    totalSqm,
    electricMeter: electricMeter || null,
  });

  res.status(201).json({
    success: true,
    message: "Unit added successfully",
    data: newUnit,
  });
});

// ================= DELETE UNIT =================

exports.deleteUnit = catchAsync(async (req, res, next) => {
  const { unitId } = req.params;

  const unit = await UnitDetails.findById(unitId);

  if (!unit || unit.isDeleted) {
    return next(new ErrorHandler("Unit not found", 404));
  }

  unit.isDeleted = true;
  unit.isActive = false;

  await unit.save();

  res.status(200).json({
    success: true,
    message: "Unit deleted successfully",
  });
});

// ================= GET UNIT DETAILS WITH APPLICATION =================

// exports.getUnitDetailsWithApplication = catchAsync(async (req, res, next) => {
//   const { unitId } = req.params;

//   // CHECK UNIT EXISTS
//   const unit = await Unit.findOne({
//     _id: unitId,
//     isDeleted: false,
//   }).lean();

//   // UNIT NOT FOUND
//   if (!unit) {
//     return next(new ErrorHandler("Unit not found", 404));
//   }

//   // FIND APPLICATION RELATED TO THIS UNIT
//   const application = await ContractorApplication.findOne({
//     isDeleted: false,

//     // CHECK NORMAL UNIT OR REDESIGN UNIT
//     $or: [
//       { unitId: unitId },
//       { "versions.redesign.inputUnits.unitId": unitId },
//     ],
//   })
//     // POPULATE BASIC DETAILS
//     .populate("plotId", "plotNumber")
//     .populate("buildingId", "buildingName")
//     .populate("floorId", "floorName")
//     .lean();

//   // RESPONSE
//   res.status(200).json({
//     success: true,
//     data: {
//       unit,
//       application: application || null,
//     },
//   });
// });

exports.getUnitDetailsWithApplication = catchAsync(async (req, res, next) => {
  const { unitId } = req.params;

  const unit = await Unit.findOne({
    _id: unitId,
    isDeleted: false,
  }).lean();

  if (!unit) {
    return next(new ErrorHandler("Unit not found", 404));
  }

  // ================= GET ALL RELATED UNITS =================
  const visited = new Set();
  const queue = [unit._id.toString()];

  while (queue.length) {
    const currentId = queue.shift();

    if (visited.has(currentId)) continue;

    visited.add(currentId);

    const currentUnit = await Unit.findById(currentId)
      .select("parentUnits")
      .lean();

    if (!currentUnit) continue;

    // Parents
    for (const parentId of currentUnit.parentUnits || []) {
      const id = parentId.toString();

      if (!visited.has(id)) {
        queue.push(id);
      }
    }

    // Children
    const childUnits = await Unit.find({
      parentUnits: currentId,
      isDeleted: false,
    })
      .select("_id")
      .lean();

    for (const child of childUnits) {
      const id = child._id.toString();

      if (!visited.has(id)) {
        queue.push(id);
      }
    }
  }

  const relatedUnitIds = [...visited];

  // ================= GET ALL APPLICATIONS =================
  const applications = await ContractorApplication.find({
    isDeleted: false,
    $or: [
      {
        unitId: {
          $in: relatedUnitIds,
        },
      },
      {
        "versions.redesign.inputUnits.unitId": {
          $in: relatedUnitIds,
        },
      },
      {
        "versions.redesign.resultUnits.unitId": {
          $in: relatedUnitIds,
        },
      },
    ],
  })
    .populate("plotId", "plotNumber")
    .populate("buildingId", "buildingName")
    .populate("floorId", "floorName")
    .populate("contractorId", "name email")
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      unit,
      totalApplications: applications.length,
      relatedUnitIds,
      applications,
    },
  });
});

// ================= GET PROJECT DETAILS =================

exports.getProjectDetails = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  // CHECK BUILDING
  const building = await BuildingDetails.findOne({
    _id: buildingId,
    isDeleted: false,
  }).lean();

  // BUILDING NOT FOUND
  if (!building) {
    return next(new ErrorHandler("Building not found", 404));
  }

  // GET PLOT DETAILS
  const plot = await PlotDetails.findById(building.plotId).lean();

  // GET ALL FLOORS
  const floors = await FloorDetails.find({
    buildingId,
    isDeleted: false,
  }).lean();

  let finalFloors = [];

  // LOOP ALL FLOORS
  for (let floor of floors) {
    // GET UNITS OF FLOOR
    const units = await Unit.find({
      floorId: floor._id,
      isDeleted: false,
    }).lean();

    finalFloors.push({
      ...floor,
      units,
    });
  }

  // RESPONSE
  res.status(200).json({
    success: true,
    data: {
      plot,
      building,
      floors: finalFloors,
    },
  });
});

// ================= GET BUILDING DOCUMENTS =================

exports.getBuildingDocuments = catchAsync(async (req, res, next) => {
  const { buildingId } = req.params;

  // CHECK BUILDING
  const building = await BuildingDetails.findOne({
    _id: buildingId,
    isDeleted: false,
  })
    .select("buildingName documents")
    .lean();

  // BUILDING NOT FOUND
  if (!building) {
    return next(new ErrorHandler("Building not found", 404));
  }

  // RESPONSE
  res.status(200).json({
    success: true,
    message: "Building documents fetched successfully",
    data: building,
  });
});

// ================= GET FLOOR DOCUMENTS WITH APPROVED DOCUMENTS =================

exports.getFloorDocuments = catchAsync(async (req, res, next) => {
  const { floorId } = req.params;

  // CHECK FLOOR
  const floor = await FloorDetails.findOne({
    _id: floorId,
    isDeleted: false,
  }).lean();

  // FLOOR NOT FOUND
  if (!floor) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  // GET APPROVED DOCUMENTS
  const approvedDocuments = await ApprovedDocument.findOne({
    floorId: floorId,
    isDeleted: false,
  }).lean();

  // RESPONSE
  res.status(200).json({
    success: true,
    message: "Floor documents fetched successfully",
    data: {
      floorId: floor._id,
      floorName: floor.floorName,

      floorDocuments: {
        architecturalDrawing: floor.architecturalDrawing,
        structuralDrawing: floor.structuralDrawing,
        mepDrawing: floor.mepDrawing,
      },

      approvedDocuments: approvedDocuments
        ? {
            architecturalDrawing: approvedDocuments.architecturalDrawing,

            structuralDrawing: approvedDocuments.structuralDrawing,

            mepDrawing: approvedDocuments.mepDrawing,
          }
        : null,
    },
  });
});

// ================= GET APPLICATION DOCUMENTS =================

exports.getApplicationDocuments = catchAsync(async (req, res, next) => {
  const { applicationId } = req.params;

  // CHECK APPLICATION
  const application = await ContractorApplication.findOne({
    _id: applicationId,
    isDeleted: false,
  }).lean();

  // APPLICATION NOT FOUND
  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // GET CURRENT VERSION
  // const currentVersion = application.versions.find(
  //   (v) => v.versionNumber === application.currentVersion,
  // );

  // VERSION NOT FOUND
  // if (!currentVersion) {
  //   return next(new ErrorHandler("Version not found", 404));
  // }

  // RESPONSE
  res.status(200).json({
    success: true,
    message: "Application documents fetched successfully",
    // data: {
    //   applicationId: application._id,
    //   referenceNumber: application.referenceNumber,
    //   currentVersion: application.currentVersion,

    //   documents: {
    //     ejariDocument: currentVersion.documents?.ejariDocument || [],

    //     appointmentLetter: currentVersion.documents?.appointmentLetter || [],

    //     fitOutDrawings: currentVersion.documents?.fitOutDrawings || [],
    //   },
    // },
    data: application,
  });
});

// ================= GET ALL INVOLVED USERS OF UNIT =================

exports.getUnitUsers = catchAsync(async (req, res, next) => {
  const { unitId } = req.params;

  // CHECK UNIT
  const unit = await Unit.findOne({
    _id: unitId,
    isDeleted: false,
  });

  // UNIT NOT FOUND
  if (!unit) {
    return next(new ErrorHandler("Unit not found", 404));
  }

  // FIND APPLICATION
  const application = await ContractorApplication.findOne({
    isDeleted: false,

    $or: [
      { unitId: unitId },
      { "versions.redesign.inputUnits.unitId": unitId },
    ],
  })
    .populate("contractorId", "name email")
    .populate({
      path: "plotId",
      populate: {
        path: "landlordId",
        select: "name email",
      },
    });

  // APPLICATION NOT FOUND
  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  // GET DRAWING SUBMISSION
  const drawing = await DrawingSubmission.findOne({
    contractorApplicationId: application._id,
    isDeleted: false,
  })
    .populate("architectural.autoCad.reviewer", "name email")
    .populate("architectural.dwf.reviewer", "name email")

    .populate("mep.autoCad.reviewer", "name email")
    .populate("mep.dwf.reviewer", "name email")

    .populate("structural.autoCad.reviewer", "name email")
    .populate("structural.dwf.reviewer", "name email");

  // GET WORK PERMIT
  const workPermit = await WorkPermit.findOne({
    contractorApplicationId: application._id,
    isDeleted: false,
  })

    .populate("documents.dcd.approvedBy", "name email")

    .populate("documents.dewaApproval.approvedBy", "name email")

    .populate("documents.dmDdaDrawings.approvedBy", "name email")

    .populate("documents.subcontractorUndertaking.approvedBy", "name email")

    .populate("documents.carInsurance.approvedBy", "name email")

    .populate("documents.workmenCompensationInsurance.approvedBy", "name email")

    .populate("documents.emiratesId.approvedBy", "name email")

    .populate("documents.commonAreaProtection.approvedBy", "name email")

    .populate("documents.securityCheque.approvedBy", "name email");

  // GET INSPECTION
  const inspection = await InspectionDetail.findOne({
    contractorApplicationId: application._id,
    isDeleted: false,
  })

    .populate("documents.sitePhoto.approvedBy", "name email")

    .populate("documents.dcdCompletionCertificate.approvedBy", "name email")

    .populate("documents.certificate.approvedBy", "name email")

    .populate("documents.dmCompletionCertificate.approvedBy", "name email")

    .populate("documents.architecturalAsBuilt.approvedBy", "name email")

    .populate("documents.mepAsBuilt.approvedBy", "name email")

    .populate("documents.structuralAsBuilt.approvedBy", "name email")

    .populate("documents.testCertificates.approvedBy", "name email")

    .populate("documents.commonAreaDamageClearance.approvedBy", "name email")

    .populate("documents.revisedAuthorityDrawings.approvedBy", "name email");

  const users = [];

  // ADD CONTRACTOR
  if (application.contractorId) {
    users.push({
      role: "CONTRACTOR",
      user: application.contractorId,
    });
  }

  // ADD LANDLORD
  if (application.plotId?.landlordId) {
    users.push({
      role: "LANDLORD",
      user: application.plotId.landlordId,
    });
  }

  // ================= DRAWING REVIEWERS =================

  const drawingTypes = ["architectural", "mep", "structural"];

  for (let type of drawingTypes) {
    for (let file of drawing?.[type]?.autoCad || []) {
      if (file.reviewer) {
        users.push({
          role: "DRAWING_REVIEWER",
          department: type.toUpperCase(),
          user: file.reviewer,
        });
      }
    }

    for (let file of drawing?.[type]?.dwf || []) {
      if (file.reviewer) {
        users.push({
          role: "DRAWING_REVIEWER",
          department: type.toUpperCase(),
          user: file.reviewer,
        });
      }
    }
  }

  // ================= WORK PERMIT APPROVERS =================

  const workPermitDocs = Object.values(workPermit?.documents || {});

  for (let files of workPermitDocs) {
    for (let file of files || []) {
      if (file.approvedBy) {
        users.push({
          role: "WORK_PERMIT_APPROVER",
          user: file.approvedBy,
        });
      }
    }
  }

  // ================= INSPECTION APPROVERS =================

  const inspectionDocs = Object.values(inspection?.documents || {});

  for (let files of inspectionDocs) {
    for (let file of files || []) {
      if (file.approvedBy) {
        users.push({
          role: "INSPECTION_APPROVER",
          user: file.approvedBy,
        });
      }
    }
  }

  const uniqueUsers = users.filter(
    (value, index, self) =>
      value.user &&
      index ===
        self.findIndex(
          (t) =>
            t.user &&
            t.user._id.toString() === value.user._id.toString() &&
            t.role === value.role &&
            t.department === value.department,
        ),
  );

  // RESPONSE
  res.status(200).json({
    success: true,

    data: {
      unitId: unit._id,
      unitNumber: unit.unitId,

      totalUsersInvolved: uniqueUsers.length,

      users: uniqueUsers,
    },
  });
});

exports.submitFinalCompletion = catchAsync(async (req, res, next) => {
  const { applicationId, fileUrl } = req.body;

  if (!applicationId) {
    throw new ErrorHandler("Application ID is required", 400);
  }

  if (!fileUrl) {
    throw new ErrorHandler("Final completion document is required", 400);
  }

  await mongoose.connection.transaction(async (session) => {
    const application =
      await ContractorApplication.findById(applicationId).session(session);

    if (!application) {
      throw new ErrorHandler("Application not found", 404);
    }

    // Prevent duplicate submission
    if (application.finalCompletionDocument?.fileUrl) {
      throw new ErrorHandler("Final completion already submitted", 400);
    }

    // Save final completion document
    application.finalCompletionDocument = {
      fileUrl,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };

    application.jobStatus = "COMPLETED";

    // Get latest version
    const latestVersion = application.versions[application.versions.length - 1];

    // ================= REDESIGN UNIT =================
    if (application.unitType === "Redesign Unit") {
      const resultUnits = latestVersion?.redesign?.resultUnits || [];

      for (const resultUnit of resultUnits) {
        await Unit.findByIdAndUpdate(
          resultUnit.unitId,
          {
            status: "AVAILABLE",
            availableSqm: resultUnit.area,
            usedSqm: 0,
          },
          { session },
        );
      }
    }

    // ================= SINGLE UNIT =================
    if (application.unitType === "Single Unit") {
      await Unit.findByIdAndUpdate(
        application.unitId,
        {
          status: "AVAILABLE",
          availableSqm: latestVersion.totalUnitAreaSqm || 0,
          usedSqm: 0,
        },
        { session },
      );
    }

    await application.save({ session });
  });

  res.status(200).json({
    success: true,
    message: "Final completion submitted successfully",
  });
});

exports.getFinalCompletion = catchAsync(async (req, res, next) => {
  const { applicationId } = req.params;

  const application = await ContractorApplication.findById(applicationId)
    .populate("contractorId", "name email")
    .populate("assignedTo", "name email")
    .populate("finalCompletionDocument.uploadedBy", "name email");

  if (!application) {
    throw new ErrorHandler("Application not found", 404);
  }

  res.status(200).json({
    success: true,
    data: application,
  });
});

exports.resetApplicationUnits = catchAsync(async (req, res, next) => {
  const { applicationId } = req.body;

  if (!applicationId) {
    throw new ErrorHandler("Application ID is required", 400);
  }

  await mongoose.connection.transaction(async (session) => {
    const application =
      await ContractorApplication.findById(applicationId).session(session);

    if (!application) {
      throw new ErrorHandler("Application not found", 404);
    }

    const latestVersion = application.versions[application.versions.length - 1];

    // ================= SINGLE UNIT =================
    if (application.unitType === "Single Unit") {
      await Unit.findByIdAndUpdate(
        application.unitId,
        {
          status: "AVAILABLE",
          availableSqm: latestVersion.totalUnitAreaSqm,
          usedSqm: 0,
        },
        { session },
      );
    }

    // ================= REDESIGN UNIT =================
    if (application.unitType === "Redesign Unit") {
      const resultUnits = latestVersion?.redesign?.resultUnits || [];

      for (const resultUnit of resultUnits) {
        await Unit.findByIdAndUpdate(
          resultUnit.unitId,
          {
            status: "AVAILABLE",
            availableSqm: resultUnit.area,
            usedSqm: 0,
          },
          { session },
        );
      }
    }
  });

  res.status(200).json({
    success: true,
    message: "Application units reset successfully",
  });
});

exports.changeApplicationContractor = catchAsync(async (req, res, next) => {
  const { applicationId, contractorId } = req.body;

  if (!applicationId || !contractorId) {
    throw new ErrorHandler(
      "Application ID and Contractor ID are required",
      400,
    );
  }

  const application = await ContractorApplication.findById(applicationId);

  if (!application) {
    throw new ErrorHandler("Application not found", 404);
  }

  const contractor = await User.findById(contractorId).populate("role");

  if (!contractor) {
    throw new ErrorHandler("Contractor not found", 404);
  }

  // optional role validation
  if (contractor.role?.name !== "CONTRACTOR") {
    throw new ErrorHandler("Selected user is not a contractor", 400);
  }

  // same contractor check
  if (
    application.contractorId &&
    application.contractorId.toString() === contractorId
  ) {
    throw new ErrorHandler("This contractor is already assigned", 400);
  }

  // save history only if contractor already exists
  if (application.contractorId) {
    application.contractorHistory.push({
      oldContractorId: application.contractorId,
      newContractorId: contractorId,
      changedBy: req.user?._id,
    });
  }

  // update contractor
  application.contractorId = contractorId;

  await application.save();

  res.status(200).json({
    success: true,
    message: "Contractor changed successfully",
    data: application,
  });
});

exports.getContractorUsers = catchAsync(async (req, res, next) => {
  let { page = 1, limit = 10, search = "" } = req.query;

  page = Number(page);
  limit = Number(limit);

  const contractorRole = await Role.findOne({
    name: "CONTRACTOR",
  });

  if (!contractorRole) {
    return next(new ErrorHandler("Contractor role not found", 404));
  }

  let searchQuery = {};

  if (search) {
    searchQuery.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile_number: { $regex: search, $options: "i" } },
    ];
  }

  const query = {
    isDeleted: false,
    isVerified: true,
    role: contractorRole._id,
    ...searchQuery,
  };

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
