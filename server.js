const express = require('express');
const server = express();
const dotenv = require("dotenv").config();
const session = require("express-session")
const jwt = require("jsonwebtoken")

const AuthClass = require('./Auth/Auth')
const Auth = new AuthClass


server.use(express.json())
server.use(session({
    secret: process.env.SESSION_SECRET_KEY, // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 5 * 60 * 1000 // 5 minutes in milliseconds
    }
}));


const PORT = process.env.PORT

const verifyEmailVerificationToken = (request, response, next) => {
    try{
        const token = request.headers.token
        if(token !== null && typeof(token) !== undefined){
            const verify = jwt.verify(token, process.env.JWT_SECRET_KEY)
            request.emailVerificationToken = token
        }

        next();
    }catch(error){
        response.send({
            message: "invalid jsonwebtoken",
            code: "error"
        })
    }



}
server.get("/", (request, response) => {
    response.send({
        message: "everything works fine",
        code: "success"
    })
})
// ------------------------send email verification code------------------------//
server.post("/send-email-verification-code", async(request, response) => {
    const email = request.body.email
    const sendEmailVerificationCode = await Auth.sendEmailVerificationCode(email)
    if (sendEmailVerificationCode.code == "success"){
        request.session.emailVerificationCode = sendEmailVerificationCode.verificationCode
        request.email = email

        response.send({
            code: "success",
            message: "Email verification code sent successfully",
            genratedToken: sendEmailVerificationCode.genratedToken,
            email: email,
            code: sendEmailVerificationCode.verificationCode
        })
    }else{
        response.send(sendEmailVerificationCode)
    }
})
// ------------------------verify email verification code------------------------//
server.post("/verify-email-verification-code", verifyEmailVerificationToken,  async(request, response) => {
    const verificationCode = request.body.verificationCode
    console.log("verificationCode: ", verificationCode, "emailVerificationToken: ", request.emailVerificationToken)
    try{
        if(request.session.emailVerificationCode == verificationCode){
            const payload = {email: request.email}
            const createAccountToken = await Auth.createToken(payload, "20m")
            response.send({
                code: "success",
                message: "Email successfully verified, Proceed to register",
                createAccountToken: createAccountToken 
            }) 
        }
    }catch(error){
        response.send({
            code: "error",
            message: "invalid verification code"
        })
    }
})

// ------------------------create account------------------------//
server.post("/register", verifyEmailVerificationToken, async(request, response) => {
    const {firstname, email, password} = request.body
    const registerFeedback = await Auth.createAccount({firstname, email, password})
    try{
        response.send(registerFeedback)
    }catch(error){
        response.send({code: "error", message: "An error occured while creating account", reason: error.message})
    }
})

// -----------------------------Login------------------------------//
server.post("/login", async(request, response) => {
    const {firstname, email, password} = request.body
    try{
        const registerFeedback = await Auth.login({email, password})
        response.send (registerFeedback)
    }catch(error){
        response.send({code: "error", message: "An error occured while creating logging in", reason: error.message})
    }
})







server.listen(PORT, ()=> console.log(`server is listening on http://localhost:${PORT}`))