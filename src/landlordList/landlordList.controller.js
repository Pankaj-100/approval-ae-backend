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

    //Check landlord exists
    const landlord = await User.findById(landlord_id);
    if (!landlord || landlord.isDeleted) {
      return res.status(404).json({
        status: false,
        message: "Landlord not found",
      });
    }

    //Filter
    const filter = {
      landlordId: landlord_id,
      isDeleted: false,
    };

    //Search
    if (search) {
      filter.$or = [{ plotNumber: { $regex: search, $options: "i" } }];
    }

    //Total records
    const totalRecords = await PlotDetails.countDocuments(filter);

    //Get plots
    const plots = await PlotDetails.find(filter)
      .skip((page - 1) * per_page)
      .limit(per_page)
      .sort({ createdAt: -1 });

    //Map projects
    const projects = await Promise.all(
      plots.map(async (plot) => {
        // 👉 Get buildings of this plot
        const buildings = await BuildingDetails.find({
          plotId: plot._id,
          isDeleted: false,
        });

        //Get total floors
        const totalFloors = await FloorDetails.countDocuments({
          plotId: plot._id,
          isDeleted: false,
        });

        //Get total units
        const totalUnits = await Unit.countDocuments({
          plotId: plot._id,
          isDeleted: false,
        });

        return {
          project_id: plot._id,
          plot_number: plot.plotNumber,

          //Buildings array
          buildings: buildings.map((b) => ({
            building_id: b._id,
            building_name: b.buildingName,
            building_sqft: b.buildingSqft,
            building_usage: b.buildingUsage,
          })),

          total_floors: totalFloors,
          total_units: totalUnits,
          created_at: plot.createdAt,
        };
      }),
    );

    //Response
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
