

const crypto = require("crypto")
const nodemailer = require("nodemailer")
const dotenv = require("dotenv").config()
const jwt = require("jsonwebtoken")
const bcryptjs = require("bcryptjs")
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)


const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.APP_NAME,
      pass: process.env.APP_PASSWORD,
    }
});
const verificationCode = () => {
    return crypto.randomInt(100000, 1000000).toString();
};;


class Auth {
    constructor(session) {
        this.session = session; // Pass the session object to the class
    }
    // function to check if user exists
    async checkIfUserExist(email){
        const feedback = await client.db(process.env.DB_NAME).collection("users").findOne({email: email})
        if(feedback){return "exists"}else{return "not-exist"}
    }

    async getUserByEmail(email){
        const get_user_feedback = await client.db(process.env.DB_NAME).collection("users").findOne({email: email})
        if(get_user_feedback){

            return {
                message: "User retrieved by their email ",
                code: "success",
                data: get_user_feedback
            }

        }else{

            return {
                message: "User's data could not be retrieved",
                code: 'error',
                data: null

            }
        }
    }

    async createToken(payload, expires){
    
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: expires })
    
        return token;
    
    }

    async sendEmailVerificationCode(email){
        const generatedCode = verificationCode()
        try {
            const info = await transporter.sendMail({
                from: `"beautybykiara" <${process.env.APP_NAME}>`, // sender address
                to: email, // list of receivers
                subject: "Email Verification Code", // Subject line
                html: `<h4>Your Email Verification code is ${generatedCode}</h4>` // html body
            });
            //hash the code generated and send it as response
            const hashedCode = await this.createToken({code: generatedCode}, "5m")
            if(info){
                //verification mail sent. next generate a token and send
                const tokenPayload = {email: email, verificationCode: generatedCode}
                const createToken = await this.createToken(tokenPayload, "5m")
                return({
                    code: "success",
                    message: "Email verification code sent successfully",
                    verificationCode: hashedCode,
                    genratedToken: createToken,
                    testCode: generatedCode
                })
            }
            
        }catch(error) {
            return({
                code: "error",
                message: "an error occured while sending verification code",
                reason: error.message
            })
            
        }
    }

    async createAccount({firstname, email, password}) {
        // Check if any field is empty or has length less than 1
        const shortPassword = password.length < 6
        if (!firstname || !email || !password || firstname.length < 1 || email.length < 1 || password.length < 1) {
            return ({
                code: "error",
                message: shortPassword ? "Length of password must be greater than 6" : "All fields must be filled"
            });
        }
        // Email regex pattern
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        // Validate email format
        if (!emailPattern.test(email)) {
            return ({
                code: "error",
                message: "Invalid email format"
            });
        }
      try{
            const checkIfUserExist = this.checkIfUserExist(email)
            if(checkIfUserExist == "exists"){
                return({
                    code: "error",
                    message: "Email already in use"
                })
            }else{
                const hashedPassword = await bcryptjs.hash(password, 10)
                const userDetails = {
                    firstname: firstname,
                    email: email,
                    password: hashedPassword
                }
                const createAccount = await client.db(process.env.DB_NAME).collection("users").insertOne(userDetails)
                return({
                    message: "Account successfully created",
                    code: "success",
                    data: {
                        firstname: firstname,
                        email: email
                    }
                })
            }
        }catch(error){
            return({
                code: "error",
                message: "Account could not be created",
                reason: error.message
            })
        }

    }

    async login({email, password}){
        const checkIfUserExist = await this.checkIfUserExist(email)
        if(checkIfUserExist == "not-exist"){
            return ({
                message: "Invalid email/password, have you registered?",
                code: "error"
            })
        }
        // get user's details by email
        const getUserDetails = await this.getUserByEmail(email)
        if(getUserDetails.code == "success"){
            const firstname = getUserDetails.code.firstname
            const hashedPassword = getUserDetails.data.password

            const verifyPassword = await bcryptjs.compare(password, hashedPassword)
            if(!verifyPassword){
                return({
                    message: "Invalid email/password, have you registered?"
                })
            }
            const payload = {
                email: email,
                firstname: firstname
            }
            const loginTokin = await this.createToken(payload, null)
            return({
                message: "Login success",
                code: "success",
                data: {
                    firstname: firstname,
                    email: email
                }
            })
        }
    }

}

module.exports = Auth;