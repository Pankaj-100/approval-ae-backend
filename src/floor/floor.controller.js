const FloorDetails = require("./floor.model");

// create plot
exports.createFloor = async (req, res) => {
  try {
    const floor = await FloorDetails.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Floor created successfully",
      data: floor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// get all floors by plot id
exports.getFloorsByPlotId = async (req, res) => {
  const plotId = req.params.plotId;
  try {
    const floors = await FloorDetails.find({ plotId, isDeleted: false }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      data: floors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get floor by id
exports.getFloorById = async (req, res) => {
  const id = req.params.id;

  try {
    const floor = await FloorDetails.findOne({ _id: id, isDeleted: false });

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: "Floor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: floor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update floor
exports.updateFloor = async (req, res) => {
  const id = req.params.id;

  try {
    const floor = await FloorDetails.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: "Floor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Floor updated successfully",
      data: floor,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// delete floor
exports.deleteFloor = async (req, res) => {
  const id = req.params.id;

  try {
    const floor = await FloorDetails.findByIdAndUpdate(id, {
      isDeleted: true,
      new: true,
    });

    if (!floor) {
      return res.status(404).json({
        success: false,
        message: "Floor not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Floor deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
