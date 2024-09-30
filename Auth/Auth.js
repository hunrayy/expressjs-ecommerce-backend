

const crypto = require("crypto")
const nodemailer = require("nodemailer")
const dotenv = require("dotenv").config()
const jwt = require("jsonwebtoken")
const bcryptjs = require("bcryptjs")
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const ObjectId = mongodb.ObjectId;
const Pusher = require("pusher")
const pusher = new Pusher({appId: process.env.PUSHER_APP_ID, key: process.env.PUSHER_KEY, secret: process.env.PUSHER_SECRET, cluster: process.env.PUSHER_CLUSTER, useTLS: true})
const cacheManager = require("../CacheManager/CacheManager")



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
    
    async getUserById(user_id){
        const get_user_feedback = await client.db(process.env.DB_NAME).collection("users").findOne({_id: new ObjectId(user_id)})
        if(get_user_feedback){
            const firstname = get_user_feedback.firstname
            const email = get_user_feedback.email
            const get_user_order = await client.db(process.env.DB_NAME).collection("orders").findOne({user_id: user_id})
            console.log(get_user_order)

            return {
                message: "User retrieved by their id ",
                code: "success",
                data: get_user_order
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
                from: `"${process.env.NAME_OF_SITE}" <${process.env.APP_NAME}`, // sender address
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
                    // testCode: generatedCode
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


    async verifyEmailVerificationCode (email, verificationCode, verificationCodeFromCookie){
        try{
            const verifyCookie = jwt.verify(verificationCodeFromCookie, process.env.JWT_SECRET_KEY)
            if(verifyCookie.code === verificationCode){
                const payload = {email: email}
                const createAccountToken = await this.createToken(payload, "20m")
                // console.log("from account token: ", createAccountToken)
                return({
                    code: "success",
                    message: "Email successfully verified, Proceed to register",
                    createAccountToken: createAccountToken 
                }) 
            }else{
                return({
                    code: "error",
                    message: "invalid verification code"
                })
            }
        }catch(error){
            return({
                code: "error",
                message: "An error occured while verifying token",
                reason: error.message,
                test: "sdjkgsh"
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
        // const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        // Validate email format
        // if (!emailPattern.test(email)) {
        //     return ({
        //         code: "error",
        //         message: "Invalid email format"
        //     });
        // }
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
                //send a "newUser" notification to the admin
                const today = new Date();
                const dd = today.getDate()
                const mm = today.toLocaleString('en-US', { month: 'short' });
                const yyyy = today.getFullYear();
                const date = dd + ' ' + mm + ' ' + yyyy;
                const hours = today.getHours().toString().padStart(2, '0');
                const minutes = today.getMinutes().toString().padStart(2, '0');
                const time = `${hours}:${minutes}`;
                const info = `A new user, ${firstname}, just created an account`
                pusher.trigger('user-accounts', 'new-user', {
                    message: info,
                });
                const saveNotificationToDB = await client.db(process.env.DB_NAME).collection('adminNotifications').insertOne({notification: {message: info, title: "newUser", hasBeenRead: false, time: time, date: date}})
                
                const unReadNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find({"notification.hasBeenRead": false}).toArray();
                
                // Save the updated notifications array to cache
                cacheManager.set("adminUnreadNotifications", unReadNotifications);
                // console.log("from first cache manager", cacheManager.get("adminUnreadNotifications"))

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
        try{
            const checkIfUserExist = await this.checkIfUserExist(email)
            if(checkIfUserExist == "not-exist"){
                return ({
                    message: "Invalid email/password, have you registered?",
                    code: "error"
                })
            }
            // get user's details by email
            const getUserDetails = await this.getUserByEmail(email)
            console.log(getUserDetails)
            if(getUserDetails.code == "success"){
                const firstname = getUserDetails.data.firstname
                const hashedPassword = getUserDetails.data.password

                const verifyPassword = await bcryptjs.compare(password, hashedPassword)
                if(!verifyPassword){
                    return({
                        message: "Invalid email/password, have you registered?",
                        code: "error"
                    })
                }
                const payload = {
                    email: email,
                    firstname: firstname
                }
                const loginTokin = await this.createToken(payload, "20d")
                return({
                    message: "Login success",
                    code: "success",
                    data: {
                        firstname: firstname,
                        email: email,
                        token: loginTokin
                    }
                })
            }
        }catch(error){
            return({code: "error", message: "An error  while logging you in", reason: error.message})
        }
    }
    resolveUserId(mongoObjectId){
        
        const user_id = new ObjectId(mongoObjectId).toString();

        if(user_id){
            return user_id;
        }else{
            return null;
        }
    }

    async testPusher(){
        const today = new Date();
        const dd = today.getDate()
        const mm = today.toLocaleString('en-US', { month: 'short' });
        const yyyy = today.getFullYear();
        const date = dd + ' ' + mm + ' ' + yyyy;
        const hours = today.getHours().toString().padStart(2, '0');
        const minutes = today.getMinutes().toString().padStart(2, '0');
        const time = `${hours}:${minutes}`;
        try{
            const info = "A new user, Vincent, just created an account"
            pusher.trigger('user-accounts', 'new-user', {
                message: info,
            });
            const saveNotificationToDB = await client.db(process.env.DB_NAME).collection('adminNotifications').insertOne({notification: {message: info, title: "newUser", hasBeenRead: false, time: time, date: date}})
            
            const unReadNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find({"notification.hasBeenRead": false}).toArray();
            
            // Save the updated notifications array to cache
            cacheManager.set("adminUnreadNotifications", unReadNotifications);
            console.log("from first cache manager", cacheManager.get("adminUnreadNotifications"))
            return {message: "pusher notification successfully sent"}
        }catch(error){
            return {
                message: "An error occurred",
                code: "error",
                reason: error.message
            }
        }
    }

}

module.exports = Auth;