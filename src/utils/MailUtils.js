const mailer = require("nodemailer")
require('dotenv').config();

const sendingMail = async(to,subject,text) =>{

    const transporter = mailer.createTransport({
        service:'gmail',
        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS
        }
    })

    const mailOption = {
        from:process.env.EMAIL_USER,
        to: to,
        subject: subject,
        // text: text
        html:text
    }

    const mailresponse = await transporter.sendMail(mailOption);
    console.log(mailresponse)
    return mailresponse;

    
}
module.exports ={sendingMail}