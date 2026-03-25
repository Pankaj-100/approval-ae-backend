/**
 * RBAC Helper Utility
 * Shared functions for permission management across role controllers
 */

const RolePermission = require("../src/mappings/rolePermission.model");
const UserPermission = require("../src/mappings/userPermission.model");

/**
 * Fetch user's complete permission set (merged from role + user-specific)
 * Returns formatted permissions array for API response
 * 
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} roleId - Role ID
 * @returns {Promise<Array>} Formatted permissions array
 */
const fetchUserPermissions = async (userId, roleId) => {
  try {
    // Fetch role permissions
    const rolePermissions = await RolePermission.find({
      role: roleId,
      isDeleted: false,
    })
      .populate({
        path: "permission",
        populate: { path: "gate" },
      })
      .lean();

    // Fetch user-specific permissions
    const userPermissions = await UserPermission.find({
      user: userId,
      isDeleted: false,
    })
      .populate({
        path: "permission",
        populate: { path: "gate" },
      })
      .lean();

    // Merge both arrays
    const allPermissions = [...rolePermissions, ...userPermissions];

    // Deduplicate and keep highest priority
    const permissionMap = {};
    allPermissions.forEach((item) => {
      const key = `${item.permission.gate._id}-${item.permission._id}`;
      if (!permissionMap[key] || item.permission.priority > permissionMap[key].permission.priority) {
        permissionMap[key] = item;
      }
    });

    // Format for API response
    return Object.values(permissionMap).map((item) => ({
      gate: item.permission.gate.name,
      action: item.permission.name,
      priority: item.permission.priority,
    }));
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return [];
  }
};

module.exports = {
  fetchUserPermissions,
};
