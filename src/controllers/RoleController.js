const roleModel = require("../models/RoleModels")

const getAllRoles = async (req, res)=>{


    const roles = await roleModel.find()

    res.json({
        message:"role fatch sucessfully",
        data:roles
    })
}

const addRoles = async(req,res)=>{

    const savedRole = await roleModel.create(req.body)

    res.json({
        message:"role created",
        data:savedRole
    })
}

const deleteRoles = async(req,res)=>{
    
    const deletedRole = await roleModel.findByIdAndDelete(req.params.id)

    res.json({
        message:"role Deleted successfully",
        data:deleteRoles
    })
}

const getRoleById = async(req,res)=>{

    const findRoleById = await roleModel.findById(req.params.id)

    res.json({
        message:"Role find successfully",
        data:findRoleById
    })
}



module.exports = {
    getAllRoles,
    addRoles,
    deleteRoles,
    getRoleById
    
}