const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/errorHandler");
const User = require("../src/modules/user/user.model");


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

    req.user = user;

    next();
  } catch (error) {
    return next(new ErrorHandler("Unauthorized", 401));
  }
};

exports.isAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId).select("+password");

    if (!user)
      return next(new ErrorHandler("Invalid token. User not found.", 401));

    if (user.role !== "admin")
      return next(new ErrorHandler("Restricted.", 401));

    req.user = user;

    next();
  } catch (error) {
    return next(new ErrorHandler("Unauthorized.", 401));
  }
};
