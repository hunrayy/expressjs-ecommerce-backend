const express = require('express');
const server = express();
const dotenv = require("dotenv").config();
const session = require("express-session")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const AuthClass = require('./Auth/Auth')
const Auth = new AuthClass

// server.use(cors())
server.use(cors({
    origin: process.env.FRONTEND_URL, // Replace with your frontend's URL
    credentials: true
  }));
server.use(express.json())
// server.use(session({
//     secret: process.env.SESSION_SECRET_KEY, // Replace with a strong secret key
//     resave: false,
//     saveUninitialized: true,
//     cookie: { 
//         secure: false, // Set to true if using HTTPS
//         maxAge: 5 * 60 * 1000, // 5 minutes in milliseconds
//         // path: '/' // Ensures the cookie is available across the entire site
//         httpOnly: true // Ensure the cookie is not accessible via client-side
//     }
// }));


const PORT = process.env.PORT

const verifyEmailVerificationToken = (request, response, next) => {
    try{
        const bearer_token = request.headers.authorization
        const token = bearer_token.split(" ")[1]
        // console.log("from middleware: ", token)
        const verify = jwt.verify(token, process.env.JWT_SECRET_KEY)
        request.emailVerificationToken = token
        console.log(request.session)

        next();
    }catch(error){
            response.send({
                message: "invalid jsonwebtoken or jwt expired",
                code: "invalid-jwt",
                reason: error.message
        })
    }
}

server.post("/is-token-active", verifyEmailVerificationToken, (request, response) => {
    response.send({code: "success", message: "token still active"})
})
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
        request.email = email
        response.send({
            code: "success",
            message: "Email verification code sent successfully",
            genratedToken: sendEmailVerificationCode.genratedToken,
            verificationCode: sendEmailVerificationCode.verificationCode,
            email: email,
            testCode: sendEmailVerificationCode.testCode
        })
    }else{
        response.send(sendEmailVerificationCode)
    }
})
// ------------------------verify email verification code------------------------//
server.post("/verify-email-verification-code", verifyEmailVerificationToken,  async(request, response) => {
    const verificationCode = request.body.verificationCode
    const verificationCodeFromCookie = request.headers.verificationcode
    // console.log("verificationCode: ", verificationCode, "emailVerificationToken: ", request.emailVerificationToken)
    const verifyCookie = jwt.verify(verificationCodeFromCookie, process.env.JWT_SECRET_KEY)
    console.log("dddhhh", verifyCookie)
    try{
        if(verifyCookie.code === verificationCode){
            const payload = {email: request.email}
            const createAccountToken = await Auth.createToken(payload, "20m")
            // console.log("from account token: ", createAccountToken)
            response.send({
                code: "success",
                message: "Email successfully verified, Proceed to register",
                createAccountToken: createAccountToken 
            }) 
        }else{
            response.send({
                code: "error",
                message: "invalid verification code"
            })
        }
    }catch(error){
        response.send({
            code: "error",
            message: "An error occured while verifying token",
            reason: error.meassage
        })
    }
})

// ------------------------create account------------------------//
server.post("/register", async(request, response) => {
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