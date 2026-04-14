const PlotDetails = require("../plot/plot.model");
const FloorDetails = require("../floor/floor.model");
const Unit = require("../floor-unit/floor-unit.model");
const BuildingDetails = require("../Building/building.model");
const User = require("../modules/user/user.model");

exports.getLandlordProjects = async (req, res) => {
  try {
    const { landlord_id } = req.params;
    let { page = 1, per_page = 10, search = "" } = req.query;

    page = parseInt(page);
    per_page = parseInt(per_page);

    //Check landlord
    const landlord = await User.findById(landlord_id);
    if (!landlord || landlord.isDeleted) {
      return res.status(404).json({
        status: false,
        message: "Landlord not found",
      });
    }

    //Get plots
    const plotFilter = {
      landlordId: landlord_id,
      isDeleted: false,
    };

    if (search) {
      plotFilter.$or = [{ plotNumber: { $regex: search, $options: "i" } }];
    }

    const plots = await PlotDetails.find(plotFilter);

    //Get ALL buildings of those plots
    const buildings = await BuildingDetails.find({
      plotId: { $in: plots.map((p) => p._id) },
      isDeleted: false,
    })
      .skip((page - 1) * per_page)
      .limit(per_page)
      .sort({ createdAt: -1 });

    const totalRecords = await BuildingDetails.countDocuments({
      plotId: { $in: plots.map((p) => p._id) },
      isDeleted: false,
    });

    //Map projects
    const projects = await Promise.all(
      buildings.map(async (building) => {
        const plot = plots.find(
          (p) => p._id.toString() === building.plotId.toString(),
        );

        const totalFloors = await FloorDetails.countDocuments({
          buildingId: building._id,
          isDeleted: false,
        });

        const totalUnits = await Unit.countDocuments({
          buildingId: building._id,
          isDeleted: false,
        });

        return {
          project_id: building._id,
          plot_id: plot._id,
          plot_number: plot.plotNumber,

          building: {
            building_id: building._id,
            building_name: building.buildingName,
            building_sqft: building.buildingSqft,
            building_usage: building.buildingUsage,
          },

          total_floors: totalFloors,
          total_units: totalUnits,
          created_at: building.createdAt,
        };
      }),
    );

    return res.json({
      status: true,
      message: "Landlord projects fetched successfully",
      data: {
        landlord_id,
        projects,
        pagination: {
          current_page: page,
          per_page,
          total_records: totalRecords,
          total_pages: Math.ceil(totalRecords / per_page),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server Error",
    });
  }
};
