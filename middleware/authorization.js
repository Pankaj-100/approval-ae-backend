const ErrorHandler = require("../utils/errorHandler");

/**
 * Authorization middleware factory
 * Checks if user has required gate + priority level
 * Super Admin bypasses all permission checks
 * 
 * @param {string} gateName - Name of the gate (e.g., "documents", "approvals")
 * @param {number} requiredPriority - Minimum priority required (1=view, 2=edit, 3=delete)
 * @returns {function} Express middleware function
 */
const authorize = (gateName, requiredPriority = 1) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new ErrorHandler("Unauthorized", 401));
      }

      // Super Admin has unrestricted access to everything
      if (req.user.role.name === "SUPER_ADMIN") {
        return next();
      }

      // Check if user has the required permission
      const hasPermission = req.permissions.some(
        (perm) =>
          perm.gate === gateName.toLowerCase() &&
          perm.priority >= requiredPriority
      );

      if (!hasPermission) {
        return next(
          new ErrorHandler(
            `Access denied. Requires ${gateName}:${requiredPriority}`,
            403
          )
        );
      }

      next();
    } catch (error) {
      return next(new ErrorHandler("Authorization check failed", 500));
    }
  };
};

module.exports = authorize;
