const UnitDetails = require("./floor-unit.model");

//create unit
exports.createUnit = async (req, res) => {
  try {
    const unit = await UnitDetails.create(req.body);

    res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get all unit by floorId
exports.getUnitsByFloorId = async (req, res) => {
  try {
    const { floorId } = req.params;

    const units = await UnitDetails.find({
      floorId,
      isDeleted: false,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all units by plotId
exports.getUnitsByPlotId = async (req, res) => {
  try {
    const { plotId } = req.params;

    const units = await UnitDetails.find({
      plotId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get unit with floor data
exports.getUnitWithFloor = async (req, res) => {
  try {
    const { unitId } = req.params;
    const unit = await UnitDetails.findOne({
      _id: unitId,
      isDeleted: false,
    }).populate("floorId");

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update unit
exports.updateUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await UnitDetails.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get unit by id
exports.getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await UnitDetails.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get all units
exports.getAllUnits = async (req, res) => {
  try {
    const units = await UnitDetails.find({ isDeleted: false }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete unit
exports.deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await UnitDetails.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
