const PlotDetails = require("../plot/plot.model");
const FloorDetails = require("../floor/floor.model");
const Unit = require("../floor-unit/floor-unit.model");
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
      filter.$or = [
        { buildingName: { $regex: search, $options: "i" } },
        { plotNumber: { $regex: search, $options: "i" } },
      ];
    }

    //Total count
    const totalRecords = await PlotDetails.countDocuments(filter);

    //Get plots
    const plots = await PlotDetails.find(filter)
      .skip((page - 1) * per_page)
      .limit(per_page)
      .sort({ createdAt: -1 });

    //Add floors & units count
    const projects = await Promise.all(
      plots.map(async (plot) => {
        const totalFloors = await FloorDetails.countDocuments({
          plotId: plot._id,
          isDeleted: false,
        });

        const totalUnits = await Unit.countDocuments({
          plotId: plot._id,
          isDeleted: false,
        });

        return {
          project_id: plot._id,
          plot_number: plot.plotNumber,
          building_name: plot.buildingName,
          building_sqft: plot.buildingSqft,
          total_floors: totalFloors,
          total_units: totalUnits,
          created_at: plot.createdAt,
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
