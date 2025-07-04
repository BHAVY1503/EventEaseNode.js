const cloudinary = require("./CloudinaryUtils");

const uploadFileToCloudinary = async (filePath, folder = "eventease_stadiums") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image"
    });
    return result.secure_url;
  } catch (err) {
    throw new Error("Cloudinary Upload Failed: " + err.message);
  }
};

module.exports = { uploadFileToCloudinary };
