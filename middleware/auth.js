const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/errorHandler");
const User = require("../src/modules/user/user.model");
const RolePermission = require("../src/mappings/rolePermission.model");
const UserPermission = require("../src/mappings/userPermission.model");

/**
 * Authentication middleware
 * Verifies JWT token and fetches user with permissions
 */
exports.auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId)
      .populate("role")
      .select("+password");

    if (!user || user.isDeleted) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    // Fetch role permissions
    const rolePermissions = await RolePermission.find({
      role: user.role._id,
      isDeleted: false,
    })
      .populate({
        path: "permission",
        populate: { path: "gate" },
      })
      .lean();

    // Fetch user-specific permissions
    const userPermissions = await UserPermission.find({
      user: user._id,
      isDeleted: false,
    })
      .populate({
        path: "permission",
        populate: { path: "gate" },
      })
      .lean();

    // Merge both permission arrays
    const allPermissions = [...rolePermissions, ...userPermissions];

    // Merge duplicate permissions, keeping the one with higher priority
    const permissionMap = {};
    allPermissions.forEach((item) => {
      const key = `${item.permission.gate._id}-${item.permission._id}`;
      if (!permissionMap[key] || item.permission.priority > permissionMap[key].permission.priority) {
        permissionMap[key] = item;
      }
    });

    // Format permissions for frontend consumption
    const formattedPermissions = Object.values(permissionMap).map((item) => ({
      gate: item.permission.gate.name,
      action: item.permission.name,
      priority: item.permission.priority,
      permissionId: item.permission._id,
    }));

    req.user = user;
    req.permissions = formattedPermissions;

    next();
  } catch (error) {
    return next(new ErrorHandler("Unauthorized", 401));
  }
};

exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (req.user.role.name !== "SUPER_ADMIN") {
      return next(new ErrorHandler("Admin access required", 403));
    }

    next();
  } catch (error) {
    return next(new ErrorHandler("Unauthorized", 401));
  }
};

