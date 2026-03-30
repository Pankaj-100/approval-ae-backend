const UserManagement = require("./userManagement.model");

exports.createUser = async (req, res) => {
  try {
    const { user_type, name, email, mobile } = req.body;

    //Validation
    if (!user_type || !name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
      });
    }

    //Check duplicate email
    const existingUser = await UserManagement.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    //Create user
    await UserManagement.create({
      user_type: user_type.toUpperCase(),
      name,
      email,
      mobile,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// get users list
exports.getUsers = async (req, res) => {
  try {
    let {
      page = 1,
      per_page = 10,
      search,
      user_type,
      verified_status,
    } = req.query;

    page = parseInt(page);
    per_page = parseInt(per_page);

    let filter = { isDeleted: false };

    //Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    //Filter user_type
    if (user_type) {
      filter.user_type = new RegExp(`^${user_type}$`, "i"); // case-insensitive
    }

    //Filter verified_status
    if (verified_status) {
      filter.verified_status = verified_status.toUpperCase();
    }

    //Total count
    const total_records = await UserManagement.countDocuments(filter);

    //Fetch users
    const users = await UserManagement.find(filter)
      .skip((page - 1) * per_page)
      .limit(per_page)
      .sort({ createdAt: -1 });

    //Format response
    const formattedUsers = users.map((u) => ({
      user_id: u._id,
      user_code: "HT" + u._id.toString().slice(-5), // dummy code
      name: u.name,
      user_type: u.user_type,
      email: u.email,
      mobile: u.mobile,
      verified_status: u.verified_status,
      is_verified: u.verified_status === "YES",
    }));

    const total_pages = Math.ceil(total_records / per_page);

    return res.json({
      status: true,
      data: {
        users: formattedUsers,
        pagination: {
          current_page: page,
          per_page,
          total_records,
          total_pages,
          next_page: page < total_pages ? page + 1 : null,
          previous_page: page > 1 ? page - 1 : null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// delete user
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await UserManagement.findById(user_id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    //delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    return res.json({
      status: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
