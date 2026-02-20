const DrawingSubmission = require("./drawing-submission.model");

// create drawing submission
exports.createDrawingSubmission = async (req, res) => {
  try {
    // generate reference number
    const randomNumber = Math.floor(100000000 + Math.random() * 900000000);

    const referenceNumber = `APP${randomNumber}`;

    const drawingSubmission = await DrawingSubmission.create({
      ...req.body,
      referenceNumber,
    });

    return res.status(201).json({
      success: true,
      message: "Drawing Submission created successfully",
      data: drawingSubmission,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get all submissions
exports.getAllDrawingSubmission = async (req, res) => {
  try {
    const submissions = await DrawingSubmission.find({
      isDeleted: false,
    })
      .populate("floorId", "floorName")
      .populate("floorUnitId", "tenatName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: submissions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get single submission
exports.getDrawingSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await DrawingSubmission.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("floorId", "floorName")
      .populate("floorUnitId", "tenantName");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update file status
exports.updateFileStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const documnetType = req.body.documentType;
    const fileType = req.body.fileType;
    const status = req.body.status;
    const approvedBy = req.body.approvedBy;
    const rejectionReason = req.body.rejectionReason;

    const drawingSubmission = await DrawingSubmission.findById(id);

    if (!drawingSubmission) {
      return res.status(404).json({
        success: false,
        message: "Drawing Submission not found",
      });
    }

    // update status
    drawingSubmission[documnetType][fileType].status = status;
    drawingSubmission[documnetType][fileType].approvedBy = approvedBy;
    drawingSubmission[documnetType][fileType].rejectionReason = rejectionReason;
    drawingSubmission[documnetType][fileType].approvedAt = new Date();

    await drawingSubmission.save();

    return res.status(200).json({
      success: true,
      message: "File status updated successfully",
      data: drawingSubmission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update single submission
exports.updateSingleDrawingSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, fileType, file } = req.body;

    const drawingSubmission = await DrawingSubmission.findById(id);

    if (!drawingSubmission) {
      return res.status(404).json({
        success: false,
        message: "Drawing Submission not found",
      });
    }

    //update file
    drawingSubmission[documentType][fileType].file = file;

    // resest to default state
    drawingSubmission[documentType][fileType].status = "PENDING";
    drawingSubmission[documentType][fileType].approvedBy = null;
    drawingSubmission[documentType][fileType].rejectionReason = null;
    drawingSubmission[documentType][fileType].approvedAt = null;

    await drawingSubmission.save();

    return res.status(200).json({
      success: true,
      message: "File updated successfully",
      data: drawingSubmission,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update drawing submission
exports.updateDrawingSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const drawingSubmission = await DrawingSubmission.findOneAndUpdate(
      { _id: id, isDeleted: false },
      req.body,
      { new: true },
    );

    if (!drawingSubmission) {
      return res.status(404).json({
        success: false,
        message: "Drawing Submission not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Drawing Submission updated successfully",
      data: drawingSubmission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete drawing submission
exports.deleteDrawingSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const drawingSubmission = await DrawingSubmission.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );

    if (!drawingSubmission) {
      return res.status(404).json({
        success: false,
        message: "Drawing Submission not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Drawing Submission deleted successfully",
      data: drawingSubmission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
