const express = require("express")
const { default: mongoose } = require("mongoose")
const app = express()
const cros = require("cors")
app.use(cros())
app.use(express.json())

//import roleRoute
const roleRoutes = require("./src/routes/RoleRoutes")
app.use(roleRoutes)

//user
const userRoutes = require("./src/routes/UserRoutes")
app.use(userRoutes)

//organizer
const organizerRoutes = require("./src/routes/OrganizerRoutes")
app.use(organizerRoutes)

mongoose.connect("mongodb://127.0.0.1:27017/EventEase").then(()=>{
    console.log("database connected....")
})

const PORT = 3100
app.listen(PORT,()=>{
    console.log("server started on port number", PORT)
})