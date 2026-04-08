const PlotDetails = require("./plot.model");
const { s3Uploadv2 } = require("../../utils/s3");
const User = require("../modules/user/user.model");
const Role = require("../modules/role/role.model");
const UnitDetails = require("../floor-unit/floor-unit.model");
const FloorDetails = require("../floor/floor.model");
const ErrorHandler = require("../../utils/errorHandler");
const catchAsync = require("../../utils/catchAsyncError");

const awsUrl = process.env.AWS_BASE_URL;

exports.createProject = catchAsync(async (req, res, next) => {
  const { landlordId, landlord, plot, floors } = req.body;

  // =========================
  // BASIC VALIDATION
  // =========================

  if (!plot) {
    return next(new ErrorHandler("Plot data is required", 400));
  }

  if (!floors || !Array.isArray(floors) || floors.length === 0) {
    return next(new ErrorHandler("At least one floor is required", 400));
  }

  // =========================
  // ROLE GET
  // =========================

  const role = await Role.findOne({ name: "LANDLORD" });
  if (!role) return next(new ErrorHandler("Landlord role not found", 404));

  let finalLandlord;

  // =========================
  // EXISTING LANDLORD
  // =========================

  if (landlordId) {
    const user = await User.findById(landlordId);

    if (!user || user.isDeleted) {
      return next(new ErrorHandler("Invalid landlordId", 400));
    }

    finalLandlord = user;
  }

  else {
    if (!landlord?.name || !landlord?.email || !landlord?.mobile_number) {
      return next(
        new ErrorHandler("Landlord name, email, mobile required", 400),
      );
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

  // =========================
  // CREATE PLOT
  // =========================

  const createdPlot = await PlotDetails.create({
    ...plot,
    landlordId: finalLandlord._id,
    // landlordName: finalLandlord.name,
    // landlordEmail: finalLandlord.email,
    // landlordMobile: finalLandlord.mobile_number,
  });


  //---create building---
  
  // const createdBuilding = await BuildingDetails.create({
  //   plotId:plot?._id,
  //   ...buildingDtails
  // });



//--reference in floor


  const allFloors = [];

  // =========================
  // CREATE FLOORS + UNITS
  // =========================

  for (let floor of floors) {
    if (
      !floor.floorName ||
      floor.totalFloorAreaSqm == null ||
      floor.circulationAreaSqm == null
    ) {
      return next(new ErrorHandler("Invalid floor data", 400));
    }

    const newFloor = await FloorDetails.create({
      plotId: createdPlot._id,
      floorName: floor.floorName,
      totalFloorAreaSqm: floor.totalFloorAreaSqm,
      circulationAreaSqm: floor.circulationAreaSqm,
      architecturalDrawing: floor.architecturalDrawing || null,
      structuralDrawing: floor.structuralDrawing || null,
      mepDrawing: floor.mepDrawing || null,
    });

    let createdUnits = [];

    if (floor.units && floor.units.length > 0) {
      for (let unit of floor.units) {
        if (!unit.unitId || !unit.usageType || !unit.fitOutWork) {
          return next(new ErrorHandler("Invalid unit data", 400));
        }

        const newUnit = await UnitDetails.create({
          plotId: createdPlot._id,
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

    allFloors.push({
      ...newFloor.toObject(),
      units: createdUnits,
    });
  }

  // =========================
  // FINAL RESPONSE
  // =========================

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: {
      landlord: {
        _id: finalLandlord._id,
        name: finalLandlord.name,
        email: finalLandlord.email,
        mobile_number: finalLandlord.mobile_number,
        role: finalLandlord.role,
        isVerified: finalLandlord.isVerified,
      },
      plot: createdPlot,
      floors: allFloors,
    },
  });
});

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
