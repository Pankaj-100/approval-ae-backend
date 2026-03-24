const { StatusCodes } = require("http-status-codes");
const catchAsyncError = require("../../../utils/catchAsyncError");
const ErrorHandler = require("../../../utils/errorHandler");
const Role = require("./role.model");
const RolePermission = require("../../mappings/rolePermission.model");
const UserPermission = require("../../mappings/userPermission.model");
const Permission = require("../permission/permission.model");
const User = require("../user/user.model");

/* ===============================
   CREATE ROLE
=============================== */
exports.createRole = catchAsyncError(async (req, res, next) => {
  const { name, description } = req.body;

  const existing = await Role.findOne({
    name: name.toUpperCase(),
    isDeleted: false,
  });

  if (existing) {
    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: "Role already exists",
    });
  }

  const role = await Role.create({
    name: name.toUpperCase(),
    description,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    data: role,
  });
});

/* ===============================
   GET ROLES
=============================== */
exports.getRoles = catchAsyncError(async (req, res) => {
  const roles = await Role.find({ isDeleted: false });

  res.status(StatusCodes.OK).json({
    success: true,
    data: roles,
  });
});



/* ===============================
   GET GATES (Simple list for admin panel)
   Returns just gate names and IDs - no permission details
=============================== */
exports.getGates = catchAsyncError(async (req, res, next) => {
  const Gate = require("../gate/gate.model");

  const gates = await Gate.find({ isDeleted: false })
    .select("_id name description")
    .lean();

  res.json({
    success: true,
    gates,
  });
});

/* ===============================
   TOGGLE ROLE GATE (by gateId only)
   Toggles ALL permissions (view, edit, change_status) for a gate
   One toggle button per gate in the admin panel
=============================== */
exports.toggleRoleGate = catchAsyncError(async (req, res, next) => {
  const { roleId, gateId } = req.body;

  if (!roleId || !gateId) {
    return next(new ErrorHandler("Role ID and Gate ID are required", 400));
  }

  // Verify role exists
  const role = await Role.findOne({
    _id: roleId,
    isDeleted: false,
  });

  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  const Gate = require("../gate/gate.model");

  // Verify gate exists
  const gate = await Gate.findOne({
    _id: gateId,
    isDeleted: false,
  });

  if (!gate) {
    return next(new ErrorHandler("Gate not found", 404));
  }

  // Get all permissions for this gate (priority 1, 2, 3 - excludes delete/priority 4)
  const gatePermissions = await Permission.find({
    gate: gateId,
    priority: { $in: [1, 2, 3] }, // view, edit, change_status (NOT delete)
    isDeleted: false,
  }).lean();

  if (gatePermissions.length === 0) {
    return next(new ErrorHandler("No permissions found for this gate", 404));
  }

  const permissionIds = gatePermissions.map((p) => p._id.toString());

  // Check if ANY of these permissions are currently enabled for this role
  const existingMappings = await RolePermission.find({
    role: roleId,
    permission: { $in: permissionIds },
    isDeleted: false,
  });

  const isGateEnabled = existingMappings.length > 0;
  let action = "enabled";

  if (isGateEnabled) {
    // Disable: soft delete all existing mappings
    await RolePermission.updateMany(
      {
        role: roleId,
        permission: { $in: permissionIds },
        isDeleted: false,
      },
      { isDeleted: true }
    );
    action = "disabled";
  } else {
    // Enable: create mappings for all permissions
    const mappingsToCreate = permissionIds.map((permId) => ({
      role: roleId,
      permission: permId,
    }));
    await RolePermission.insertMany(mappingsToCreate);
  }

  res.json({
    success: true,
    message: `Gate ${action} for role successfully`,
    data: {
      roleId,
      roleName: role.name,
      gateId,
      gateName: gate.name,
      status: action,
      permissions: gatePermissions.map((p) => ({
        id: p._id,
        action: p.name,
        priority: p.priority,
      })),
    },
  });
});

/* ===============================
   TOGGLE USER GATE (by gateId only)
   Toggles ALL permissions (view, edit, change_status) for a gate for a user
   One toggle button per gate per user in the admin panel
=============================== */
exports.toggleUserGate = catchAsyncError(async (req, res, next) => {
  const { userId, gateId } = req.body;

  if (!userId || !gateId) {
    return next(new ErrorHandler("User ID and Gate ID are required", 400));
  }

  // Verify user exists
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const Gate = require("../gate/gate.model");

  // Verify gate exists
  const gate = await Gate.findOne({
    _id: gateId,
    isDeleted: false,
  });

  if (!gate) {
    return next(new ErrorHandler("Gate not found", 404));
  }

  // Get all permissions for this gate (priority 1, 2, 3 - excludes delete/priority 4)
  const gatePermissions = await Permission.find({
    gate: gateId,
    priority: { $in: [1, 2, 3] }, // view, edit, change_status (NOT delete)
    isDeleted: false,
  }).lean();

  if (gatePermissions.length === 0) {
    return next(new ErrorHandler("No permissions found for this gate", 404));
  }

  const permissionIds = gatePermissions.map((p) => p._id.toString());

  // Check if ANY of these permissions are currently enabled for this user
  const existingMappings = await UserPermission.find({
    user: userId,
    permission: { $in: permissionIds },
    isDeleted: false,
  });

  const isGateEnabled = existingMappings.length > 0;
  let action = "enabled";

  if (isGateEnabled) {
    // Disable: soft delete all existing mappings
    await UserPermission.updateMany(
      {
        user: userId,
        permission: { $in: permissionIds },
        isDeleted: false,
      },
      { isDeleted: true }
    );
    action = "disabled";
  } else {
    // Enable: create mappings for all permissions
    const mappingsToCreate = permissionIds.map((permId) => ({
      user: userId,
      permission: permId,
    }));
    await UserPermission.insertMany(mappingsToCreate);
  }

  res.json({
    success: true,
    message: `Gate ${action} for user successfully`,
    data: {
      userId,
      userName: user.name,
      userEmail: user.email,
      gateId,
      gateName: gate.name,
      status: action,
      permissions: gatePermissions.map((p) => ({
        id: p._id,
        action: p.name,
        priority: p.priority,
      })),
    },
  });
});

/* ===============================
   GET ROLE GATES WITH ENABLED STATUS
   Returns all gates with their current enabled/disabled status for a role
   Used by admin panel to show toggle button states
=============================== */
exports.getRoleGates = catchAsyncError(async (req, res, next) => {
  const { roleId } = req.params;

  if (!roleId) {
    return next(new ErrorHandler("Role ID is required", 400));
  }

  // Verify role exists
  const role = await Role.findOne({
    _id: roleId,
    isDeleted: false,
  });

  if (!role) {
    return next(new ErrorHandler("Role not found", 404));
  }

  const Gate = require("../gate/gate.model");

  // Get all gates
  const gates = await Gate.find({ isDeleted: false })
    .select("_id name description")
    .lean();

  // Get all permissions for each gate (priority 1, 2, 3)
  const gatesWithStatus = await Promise.all(
    gates.map(async (gate) => {
      // Get permissions for this gate
      const gatePermissions = await Permission.find({
        gate: gate._id,
        priority: { $in: [1, 2, 3] },
        isDeleted: false,
      }).lean();

      const permissionIds = gatePermissions.map((p) => p._id.toString());

      // Check if role has ANY of these permissions
      const rolePermissions = await RolePermission.findOne({
        role: roleId,
        permission: { $in: permissionIds },
        isDeleted: false,
      });

      return {
        _id: gate._id,
        name: gate.name,
        description: gate.description,
        enabled: !!rolePermissions, // true if at least one permission exists
      };
    })
  );

  res.json({
    success: true,
    role: role.name,
    gates: gatesWithStatus,
  });
});