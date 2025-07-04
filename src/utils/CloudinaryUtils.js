const cloundinary = require("cloudinary").v2
require("dotenv").config(); 

const uploadFileToCloudinary = async (file) =>{

    cloundinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    })


    const cloundinaryResponse = await cloundinary.uploader.upload(file.path);
    return cloundinaryResponse;

}
module.exports ={uploadFileToCloudinary}