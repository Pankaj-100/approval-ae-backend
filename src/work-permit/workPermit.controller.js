const WorkPermit = require("./workPermit.model");

// create work permit
exports.createWorkPermit = async (req, res) => {
  try {
    const workPermit = await WorkPermit.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Work Permit created successfully",
      data: workPermit,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get all work permit
exports.getAllWorkPermit = async (req, res) => {
  try {
    const workPermit = await WorkPermit.find({ isDeleted: false })
      .populate("floorId", "floorName")
      .populate("floorUnitId", "tenantName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: workPermit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get work permit by id
exports.getWorkPermitById = async (req, res) => {
  try {
    const workPermit = await WorkPermit.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("floorId", "floorName")
      .populate("floorUnitId", "tenantName");

    if (!workPermit) {
      return res.status(404).json({
        success: false,
        message: "Work Permit not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: workPermit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update documnet status
exports.updateWorkPermitFileStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const documnetType = req.body.documentType;
    const status = req.body.status;
    const approvedBy = req.body.approvedBy;
    const rejectionReason = req.body.rejectionReason;

    const workPermit = await WorkPermit.findById(id);

    if (!workPermit || workPermit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Work Permit not found",
      });
    }

    if (!workPermit.documents[documnetType]) {
      return res.status(404).json({
        success: false,
        message: "Inavlid document type",
      });
    }

    // update status
    workPermit.documents[documnetType].status = status;
    workPermit.documents[documnetType].approvedBy = approvedBy;
    workPermit.documents[documnetType].rejectionReason = rejectionReason;
    workPermit.documents[documnetType].approvedAt =
      status === "APPROVED" ? new Date() : null;

    await workPermit.save();

    return res.status(200).json({
      success: true,
      message: "File updated successfully",
      data: workPermit,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// update single file
exports.updateSingleWorkPermitFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, file } = req.body;

    const workPermit = await WorkPermit.findById(id);

    if (!workPermit || workPermit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Work Permit not found",
      });
    }

    // validate document type
    if (!workPermit.documents[documentType]) {
      return res.status(404).json({
        success: false,
        message: "Inavlid document type",
      });
    }

    //update file
    workPermit[documentType].file = file;

    // resest to default state
    workPermit.documents[documentType].status = "PENDING";
    workPermit.documents[documentType].approvedBy = null;
    workPermit.documents[documentType].rejectionReason = null;
    workPermit.documents[documentType].approvedAt = null;

    await workPermit.save();

    return res.status(200).json({
      success: true,
      message: "File updated successfully",
      data: workPermit,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// delete work permit
exports.deleteWorkPermit = async (req, res) => {
  const id = req.params.id;

  try {
    const workPermit = await WorkPermit.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );

    if (!workPermit) {
      return res.status(404).json({
        success: false,
        message: "Work Permit not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Work Permit deleted successfully",
      data: workPermit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
