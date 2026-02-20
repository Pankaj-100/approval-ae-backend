const PlotDetails = require("../plot/plot.model");
const FloorDetails = require("../floor/floor.model");

// get plot by plot number
exports.getPlotByPlotNumber = async (req, res) => {
  const plotNumber = req.params.plotNumber;

  try {
    const plot = await PlotDetails.findOne({
      plotNumber: plotNumber,
      isDeleted: false,
      isActive: true,
    }).select("_id buildingName");

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: "Plot not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        plotId: plot._id,
        buildingName: plot.buildingName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get floors by plots id
exports.getFloorsByPlotId = async (req, res) => {
  const plotId = req.params.plotId;
  try {
    const floors = await FloorDetails.find({
      plotId: plotId,
      isDeleted: false,
      isActive: true,
    }).select("_id floorName");

    const formattedFloors = floors.map((floor) => ({
      floorId: floor._id,
      floorName: floor.floorName,
    }));

    res.status(200).json({
      success: true,
      data: formattedFloors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
