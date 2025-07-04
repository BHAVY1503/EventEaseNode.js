const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Only .jpeg and .png files are allowed"), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  // limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = upload;


// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../utils/CloudinaryUtils");

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "eventease_stadiums",
//     allowed_formats: ["jpg", "jpeg", "png"],
//   },
// });

// const upload = multer({ storage });

// module.exports = upload;
