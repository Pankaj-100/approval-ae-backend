const User = require("../modules/user/user.model");
const Role = require("../modules/role/role.model");
const ContractorApplication = require("../contractor-application/contractor-application.model");

// =========================
// CREATE USER (SUPERADMIN)
// =========================
exports.createUser = async (req, res) => {
  try {
    const { user_type, name, email, mobile } = req.body;

    //Validation
    if (!user_type || !name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    //Role find
    const formattedType = user_type.toUpperCase().replace(/\s+/g, "_");
    const role = await Role.findOne({ name: formattedType });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    //Check duplicate
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile_number: mobile }],
      role: role._id,
      isDeleted: false,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    //Create user
    const newUser = await User.create({
      name,
      email,
      mobile_number: mobile,
      role: role._id,
      password: "1234", // dummy password
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user_id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: user_type,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET USERS LIST
// =========================
exports.getUsers = async (req, res) => {
  try {
    let { page = 1, per_page = 10, search, role } = req.query;

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

    //Role filter
    if (role) {
      const roleData = await Role.findOne({ name: role.toUpperCase() });
      if (roleData) {
        filter.role = roleData._id;
      }
    }

    const total_records = await User.countDocuments(filter);

    const users = await User.find(filter)
      .populate("role", "name")
      .skip((page - 1) * per_page)
      .limit(per_page)
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((u) => ({
      user_id: u._id,
      user_code: "HT" + u._id.toString().slice(-5),
      name: u.name,
      email: u.email,
      mobile: u.mobile_number,
      role: u.role?.name,
      isVerified: u.isVerified,
    }));

    const total_pages = Math.ceil(total_records / per_page);

    return res.json({
      success: true,
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
      message: error.message,
    });
  }
};

// =========================
// DELETE USER
// =========================
exports.deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await User.findById(user_id);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    //Soft delete
    user.isDeleted = true;
    await user.save();

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET USER DETAILS
// =========================
exports.getUserDetails = async (req, res) => {
  try {
    const { user_id } = req.params;

    // FIND USER
    const user = await User.findOne({
      _id: user_id,
      isDeleted: false,
    }).populate("role", "name");

    // USER NOT FOUND
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // RESPONSE
    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// UPDATE USER
// =========================
exports.updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;

    const { name, email, mobile, user_type } = req.body;

    // FIND USER
    const user = await User.findOne({
      _id: user_id,
      isDeleted: false,
    });

    // USER NOT FOUND
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // CHECK ROLE
    let roleId = user.role;

    if (user_type) {
      const formattedType = user_type.toUpperCase().replace(/\s+/g, "_");

      const role = await Role.findOne({
        name: formattedType,
      });

      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Invalid user type",
        });
      }

      roleId = role._id;
    }

    // UPDATE USER
    user.name = name || user.name;

    user.email = email || user.email;

    user.mobile_number = mobile || user.mobile_number;

    user.role = roleId;

    await user.save();

    // GET UPDATED USER WITH ROLE
    const updatedUser = await User.findById(user._id)
      .populate("role", "name")
      .select("-password");

    // RESPONSE
    return res.json({
      success: true,
      message: "User updated successfully",

      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET USER TYPES
// =========================
exports.getUserTypes = async (req, res) => {
  try {
    // GET ROLES
    const roles = await Role.find({}).select("_id name").sort({ name: 1 });

    // RESPONSE
    return res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET USER PROJECTS
// =========================
exports.getUserProjects = async (req, res) => {
  try {
    // QUERY PARAMS
    let { page = 1, per_page = 10, job_status } = req.query;

    const { user_id } = req.params;

    // PAGINATION
    page = parseInt(page);
    per_page = parseInt(per_page);

    // CHECK USER
    const user = await User.findOne({
      _id: user_id,
      isDeleted: false,
    });

    // USER NOT FOUND
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // FILTER
    const filter = {
      isDeleted: false,

      $or: [
        // CONTRACTOR
        { contractorId: user_id },

        // ASSIGNED USER
        { assignedTo: user_id },

        // REVIEWER
        { "versions.reviewedBy": user_id },

        // NOC UPLOADER
        { "nocDoc.uploadedBy": user_id },
      ],
    };

    // JOB STATUS FILTER
    if (job_status) {
      filter.jobStatus = job_status.toUpperCase();
    }

    // TOTAL RECORDS
    const total_records = await ContractorApplication.countDocuments(filter);

    // GET PROJECTS
    const projects = await ContractorApplication.find(filter)

      // POPULATE USERS
      .populate("contractorId", "name email")

      .populate("assignedTo", "name email")

      .populate("versions.reviewedBy", "name email")

      .populate("nocDoc.uploadedBy", "name email")

      // POPULATE PROJECT DETAILS
      .populate("plotId", "plotNumber")

      .populate("buildingId", "buildingName")

      .populate("floorId", "floorName")

      .populate("unitId", "unitId")

      // PAGINATION
      .skip((page - 1) * per_page)

      .limit(per_page)

      // SORT
      .sort({ createdAt: -1 });

    // TOTAL PAGES
    const total_pages = Math.ceil(total_records / per_page);

    // RESPONSE
    return res.status(200).json({
      success: true,

      data: {
        projects,

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
      message: error.message,
    });
  }
};
