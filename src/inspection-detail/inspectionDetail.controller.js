const InspectionDetail = require("./inspectionDetail.model");
const FloorDetails = require("../floor/floor.model");
const UnitDetails = require("../floor-unit/floor-unit.model");

// create inspection detail
exports.createInspectionDetail = async (req, res) => {
  try {
    const { floorId, floorUnitId } = req.body;

    // check floor exits and not deleted
    const floor = await FloorDetails.findOne({
      _id: floorId,
      isDeleted: false,
    });

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: "Floor not found",
      });
    }

    // check floor unit exits and not deleted
    const floorUnit = await UnitDetails.findOne({
      _id: floorUnitId,
      isDeleted: false,
    });

    if (!floorUnit) {
      return res.status(404).json({
        success: false,
        message: "Floor Unit not found",
      });
    }

    // create inspection detail
    const inspectionDetail = await InspectionDetail.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Inspection Detail created successfully",
      data: inspectionDetail,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get all inspection details
exports.getAllInspectionDetails = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 10);
    const skip = (page - 1) * limit;

    const totalRecords = await InspectionDetail.countDocuments({
      isDeleted: false,
    });

    const inspectionDetails = await InspectionDetail.find({
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalRecords / limit);

    return res.status(200).json({
      success: true,
      totalRecords,
      totalPages,
      currentPage: page,
      data: inspectionDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update inspection file status
exports.updateInspectionFileStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, status, approvedBy, rejectionReason } = req.body;

    const inspectionDetail = await InspectionDetail.findById(id);

    if (!inspectionDetail || inspectionDetail.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Inspection Detail not found",
      });
    }

    if (inspectionDetail.documents[documentType]) {
      return res.status(404).json({
        success: false,
        message: "Inavlid document type",
      });
    }

    // update status and approved by and rejection reason
    inspectionDetail.documents[documentType].status = status;
    inspectionDetail.documents[documentType].approvedBy = approvedBy;
    inspectionDetail.documents[documentType].rejectionReason = rejectionReason;
    inspectionDetail.documents[documentType].approvedAt =
      status === "APPROVED" ? Date.now() : null;

    await inspectionDetail.save();
    return res.status(200).json({ success: true, data: inspectionDetail });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update single file
exports.updateSingleInspectionFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, file } = req.body;

    const inspectionDetail = await InspectionDetail.findById(id);

    if (!inspectionDetail || inspectionDetail.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Inspection Detail not found",
      });
    }

    if (inspectionDetail.documents[documentType]) {
      return res.status(404).json({
        success: false,
        message: "Inavlid document type",
      });
    }

    //update file
    inspectionDetail.documents[documentType].file = file;

    // resest status
    inspectionDetail.documents[documentType].status = "PENDING";
    inspectionDetail.documents[documentType].approvedBy = null;
    inspectionDetail.documents[documentType].rejectionReason = null;
    inspectionDetail.documents[documentType].approvedAt = null;

    await inspectionDetail.save();
    return res.status(200).json({
      success: true,
      data: inspectionDetail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete inspection detail
exports.deleteInspectionDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const inspectionDetail = await InspectionDetail.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );

    if (!inspectionDetail) {
      return res.status(404).json({
        success: false,
        message: "Inspection Detail not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inspection Detail deleted successfully",
      data: inspectionDetail,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
