const S3 = require("aws-sdk/clients/s3");
const multer = require("multer");
const path = require("path");

exports.s3Uploadv2 = async (file) => {
  const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_BUCKET_REGION,
  });

  const param = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `uploads/${Date.now().toString()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ContentDisposition: "inline",
  };

  return await s3.upload(param).promise();
};

exports.s3UploadMulti = async (files) => {
  const s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_BUCKET_REGION,
  });

  const params = files.map((file) => {
    return {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${Date.now().toString()}-${
        file.originalname ? file.originalname : "not"
      }`,
      Body: file.buffer,
    };
  });

  return await Promise.all(params.map((param) => s3.upload(param).promise()));
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mimetype = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();

  // allow zip by extension
  if (ext === ".zip") {
    return cb(null, true);
  }

  // allow image
  if (mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  // allow pdf
  if (mimetype === "application/pdf") {
    return cb(null, true);
  }

  // allow zip files
  const allowedZipTypes = [
    "application/zip",
    "application/x-zip-compressed",
    "multipart/x-zip",
  ];

  if (allowedZipTypes.includes(mimetype)) {
    return cb(null, true);
  }

  // allow DWG / AutoCAD files
  const allowedCadTypes = [
    // DWG
    "application/acad",
    "application/x-acad",
    "application/autocad_dwg",
    "application/dwg",
    "application/x-dwg",
    "image/vnd.dwg",

    // AutoCAD generic
    "application/x-autocad",
    "application/autocad",

    // DXF (AutoCAD drawing exchange format)
    "application/dxf",
    "application/x-dxf",

    // Generic binary
    "application/octet-stream",
  ];

  if (allowedCadTypes.includes(mimetype)) {
    return cb(null, true);
  }

  // reject other files
  cb(
    new Error("Only images, PDF,ZIP, DWG and AutoCAD files are allowed"),
    false,
  );
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 11006600,
    files: 5,
  },
});
