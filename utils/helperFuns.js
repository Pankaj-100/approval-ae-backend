const UAParser = require("ua-parser-js");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');
dotenv.config({ path: "./config/config.env" });

exports.getFileUrl = (req, filepath) => {
  const relativePath = filepath.replace(/\\/g, '/');
  return `/${relativePath}`;
};


exports.StringToObjectId = (str) => {
  return new mongoose.Types.ObjectId(str);
};

exports.generateUniqueId = () => {
  const uuid = uuidv4();
  return uuid;
};
