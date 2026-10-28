"use strict";
const usersModel = require("../models").users;
var request = require('request');
const nodemailer = require("nodemailer");

module.exports = {
  sendOtp(req, res) {

  const email = req.body.requestObject.email;
  const otp = req.body.requestObject.otp;
  
  console.log("+++++++++++++++++++++++++++++++++",email);
  const transporter = nodemailer.createTransport({
    // lakhimi
    // host: "vps.adrp.in",
    // port: 587,
    // secure: false,
    // auth: {
    // user: 'support@eoffice.lakhimisr.in',
    // pass: '&x*YS7HFY

    //test
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
    user: 'arnabjyoti.skaplink@gmail.com',
    pass: 'puxcdoabsfhnmnno'
  }
});



var mailOptions = {
  from: '"One Time Password Verification" <arnabjyoti.skaplink@gmail.com>', // sender address
    to: email, // list of receivers
    subject: "One Time Password Verification", // Subject line
    text: "OTP Verification", // plain text body
    html: `<div style="font-family: Arial, sans-serif; background-color: #f4f7ff; padding: 40px 0;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 40px; text-align: center; box-shadow: 0px 4px 15px rgba(0,0,0,0.08);">
      
      <h2 style="color: #4b57d4; margin-bottom: 10px;">GMC Integrated command and control center (ICCC)</h2>
      <h3 style="color: #4b57d4; font-size: 22px; margin-top: 0;">One Time Password</h3>

      <p style="font-size: 14px; color: #555;">
        Here is your verification code:
      </p>

      <div style="font-size: 32px; font-weight: bold; background: #e8e9ff; color: #4b57d4; padding: 15px 0; width: 200px; margin: 15px auto; border-radius: 8px;">
        ${otp}
      </div>

      <p style="font-size: 14px; color: #555; margin-top: 10px;">
        Please make sure you never share this code with anyone.
      </p>

      <p style="font-size: 13px; color: #777; margin-top: 25px;">
        <b>Note:</b> The code will expire in 5 minutes.
      </p>
    </div>

    <p style="text-align: center; font-size: 12px; color: #9a9a9a; margin-top: 20px;">
      © ${new Date().getFullYear()} GMC Integrated command and control center. All rights reserved.
    </p>
  </div>`, // html body
}

transporter.sendMail(mailOptions, function(err, info) {
  if (err) {
      console.log('Mail not sent')
      return res.status(200).send({ message: "fail" });
  } else {
      console.log('Mail sent')
      return res.status(200).send({ message : "success" });
  }
});

}
}