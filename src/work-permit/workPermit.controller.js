const workPermit = require("./workPermit.model");

// create work permit
exports.createWorkPermit = async (req, res) => {
  try {
    const workPermit = await workPermit.create(req.body);

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
    const workPermit = await workPermit
      .find({ isDeleted: false })
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
    const workPermit = await workPermit
      .findOne({
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

    const workPermit = await workPermit.findById(id);

    if (!workPermit) {
      return res.status(404).json({
        success: false,
        message: "Work Permit not found",
      });
    }

    // update status
    workPermit[documnetType].status = status;
    workPermit[documnetType].approvedBy = approvedBy;
    workPermit[documnetType].rejectionReason = rejectionReason;
    workPermit[documnetType].approvedAt = new Date();

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

    const workPermit = await workPermit.findById(id);

    if (!workPermit) {
      return res.status(404).json({
        success: false,
        message: "Work Permit not found",
      });
    }

    //update file
    workPermit[documentType].file = file;

    // resest to default state
    workPermit[documentType].status = "PENDING";
    workPermit[documentType].approvedBy = null;
    workPermit[documentType].rejectionReason = null;
    workPermit[documentType].approvedAt = null;

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
    const workPermit = await workPermit.findOneAndUpdate(
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
