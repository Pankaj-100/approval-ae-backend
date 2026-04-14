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
      data: { docUrl },
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

  //CREATE PLOT
  const createdPlot = await PlotDetails.create({
    landlordId: finalLandlord._id,
    plotNumber: plot.plotNumber,

    documents: {
      siteAffectionPlan: plot?.documents?.siteAffectionPlan || null,
      dmCompletionCertificate: plot?.documents?.dmCompletionCertificate || null,
      civilDefenseCertificate: plot?.documents?.civilDefenseCertificate || null,
      amcContract: plot?.documents?.amcContract || null,
      dewaApprovedLoadSchedule:
        plot?.documents?.dewaApprovedLoadSchedule || null,
    },
  });

  //CREATE BUILDING
  const newBuilding = await BuildingDetails.create({
    plotId: createdPlot._id,
    buildingName: building.buildingName,
    buildingSqft: building.buildingSqft,
    buildingUsage: building.buildingUsage,
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
        architecturalDrawing: floor.architecturalDrawing || null,
        structuralDrawing: floor.structuralDrawing || null,
        mepDrawing: floor.mepDrawing || null,
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
          url: floor?.approvedDocuments?.architecturalDrawing || null,
        },
        structuralDrawing: {
          url: floor?.approvedDocuments?.structuralDrawing || null,
        },
        mepDrawing: {
          url: floor?.approvedDocuments?.mepDrawing || null,
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
