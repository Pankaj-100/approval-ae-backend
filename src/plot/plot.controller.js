const PlotDetails = require("./plot.model");
const { s3Uploadv2 } = require("../../utils/s3");

const awsUrl = process.env.AWS_BASE_URL;

// create plot
exports.createPlot = async (req, res) => {
  try {
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
