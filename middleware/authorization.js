// middleware/authorization.js
import Permission from "../models/permission.model.js";
import RolePermission from "../models/rolePermission.model.js";
import UserPermission from "../models/userPermission.model.js";

export const authorization = (permissionName) => {
  return async (req, res, next) => {
    try {
      const permission = await Permission.findOne({ name: permissionName });
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }

      const roleAllowed = await RolePermission.findOne({
        roleId: req.user.roleId,
        permissionId: permission._id
      });

      const userAllowed = await UserPermission.findOne({
        userId: req.user._id,
        permissionId: permission._id
      });

      if (!roleAllowed && !userAllowed) {
        return res.status(403).json({ message: "Access Denied" });
      }

      next();
    } catch {
      res.status(500).json({ message: "Authorization error" });
    }
  };
};