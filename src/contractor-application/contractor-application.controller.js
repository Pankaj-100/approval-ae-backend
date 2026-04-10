const PlotDetails = require("../plot/plot.model");
const FloorDetails = require("../floor/floor.model");
const BuildingDetails = require("../Building/building.model");
const Unit = require("../floor-unit/floor-unit.model");
const ContractorApplication = require("./contractor-application.model");
const ErrorHandler = require("../../utils/errorHandler");
const catchAsync = require("../../utils/catchAsyncError");

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
  }).select("_id unitId usageType tenantName totalSqm");

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

// SUBMIT APPLICATION

exports.submitApplication = catchAsync(async (req, res, next) => {
  const {
    plotId,
    floorId,
    unitId,
    buildingId,

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
  } = req.body;

  // ===== VALIDATION =====
  if (!plotId || !floorId || !unitId || !buildingId) {
    return next(
      new ErrorHandler("Plot, Building, Floor and Unit required", 400),
    );
  }

  if (!usageType || !totalUnitAreaSqm) {
    return next(new ErrorHandler("Unit details missing", 400));
  }

  if (hasMezzanine && !totalUnitAreaAfterMezzanineSqm) {
    return next(new ErrorHandler("Mezzanine area required", 400));
  }

  //FETCH
  const [plot, floor, unit, building] = await Promise.all([
    PlotDetails.findById(plotId),
    FloorDetails.findById(floorId),
    Unit.findById(unitId),
    BuildingDetails.findById(buildingId),
  ]);

  if (!plot || !floor || !unit || !building) {
    return next(new ErrorHandler("Invalid selection", 400));
  }

  // floor belongs to building
  if (floor.buildingId.toString() !== buildingId) {
    return next(new ErrorHandler("Floor not found", 404));
  }

  // unit belongs to floor
  if (unit.floorId.toString() !== floorId) {
    return next(new ErrorHandler("Unit not found", 404));
  }

  //DUPLICATE CHECK
  const exist = await ContractorApplication.findOne({
    unitId,
    isDeleted: false,
  });

  if (exist) {
    return next(new ErrorHandler("Application already exists", 400));
  }

  //SAFE REFERENCE
  let application;
  let attempts = 0;

  while (!application && attempts < 5) {
    try {
      const randomNumber = Math.floor(100000000 + Math.random() * 900000000);

      const referenceNumber = `APP${randomNumber}`;

      application = await ContractorApplication.create({
        plotId,
        floorId,
        unitId,
        buildingId,
        referenceNumber,

        // SNAPSHOT
        plotNumber: plot.plotNumber,
        buildingName: building.buildingName,
        floorNumber: floor.floorName,
        unitNumber: unit.unitId,

        currentVersion: 1,

        versions: [
          {
            versionNumber: 1,

            usageType,
            totalUnitAreaSqm,
            areaVariationSqm: areaVariationSqm || 0,

            hasMezzanine: hasMezzanine || false,
            totalUnitAreaAfterMezzanineSqm: hasMezzanine
              ? totalUnitAreaAfterMezzanineSqm
              : null,

            tenantName,
            tenantMobile,
            tenantEmail,

            //DOCUMENT VERSIONING
            documents: {
              ejariDocument: ejariDocument
                ? [
                    {
                      versionNumber: 1,
                      fileUrl: ejariDocument,
                    },
                  ]
                : [],

              appointmentLetter: appointmentLetter
                ? [
                    {
                      versionNumber: 1,
                      fileUrl: appointmentLetter,
                    },
                  ]
                : [],

              fitOutDrawings: fitOutDrawings
                ? [
                    {
                      versionNumber: 1,
                      fileUrl: fitOutDrawings,
                    },
                  ]
                : [],
            },

            status: "UNDER_REVIEW",
          },
        ],
      });
    } catch (error) {
      if (error.code === 11000) {
        attempts++;
        continue;
      }
      return next(error);
    }
  }

  if (!application) {
    return next(new ErrorHandler("Failed to generate reference number", 500));
  }

  //RESPONSE
  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    data: application,
  });
});

//get all applications
exports.getAllApplications = catchAsync(async (req, res, next) => {
  const applications = await ContractorApplication.find({
    isDeleted: false,
  })
    .populate("buildingId", "buildingName")
    .sort({ createdAt: -1 })
    .lean();

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
  });

  if (!application) {
    return next(new ErrorHandler("Application not found", 404));
  }

  res.status(200).json({
    success: true,
    data: application,
  });
});
