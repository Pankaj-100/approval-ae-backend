const ApprovedDocument = require("./approved-documents.model");

// create approved documents
exports.createApprovedDocument = async (req, res) => {
  const floorId = req.params.floorId;

  req.body.floorId = floorId;
  try {
    const approvedDocument = await ApprovedDocument.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Approved Document created successfully",
      data: approvedDocument,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get all approved documents with floor name
exports.getAllApprovedDocuments = async (req, res) => {
  try {
    const approvedDocuments = await ApprovedDocument.find({
      isDeleted: false,
    })
      .populate({ path: "floorId", select: "floorName" })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: approvedDocuments,
      count: approvedDocuments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get single approved document with floor name
exports.getApprovedDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const approvedDocument = await ApprovedDocument.findOne({
      _id: id,
      isDeleted: false,
    }).populate({ path: "floorId", select: "floorName" });

    if (!approvedDocument) {
      return res.status(404).json({
        success: false,
        message: "Approved Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: approvedDocument,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update approved document
exports.updateApprovedDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const approvedDocument = await ApprovedDocument.findOneAndUpdate(
      { _id:id, isDeleted: false },
      req.body,
      { new: true },
    ).populate({ path: "floorId", select: "floorName" });

    if (!approvedDocument) {
      return res.status(404).json({
        success: false,
        message: "Approved Document not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Approved Document updated successfully",
      data: approvedDocument,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete approved document
exports.deleteApprovedDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const approvedDocument = await ApprovedDocument.findOneAndUpdate(
      { _id:id, isDeleted: false },
      { isDeleted: true },
      { new: true },
    ).populate({ path: "floorId", select: "floorName" });

    if (!approvedDocument) {
      return res.status(404).json({
        success: false,
        message: "Approved Document not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Approved Document deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
