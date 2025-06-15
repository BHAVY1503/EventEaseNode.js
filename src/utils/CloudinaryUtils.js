const cloundinary = require("cloudinary").v2

const uploadFileToCloudinary = async (file) =>{

    cloundinary.config({
        cloud_name:"dswpsaieu",
        api_key:"448932214759341",
        api_secret:"Yovio86KBkUGl0Jh5M3bZbo0aDM"
    })


    const cloundinaryResponse = await cloundinary.uploader.upload(file.path);
    return cloundinaryResponse;

}
module.exports ={uploadFileToCloudinary}