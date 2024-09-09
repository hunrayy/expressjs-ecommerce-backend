const express = require('express');
const server = express();
const dotenv = require("dotenv").config();
const session = require("express-session")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const multer = require("multer")
// const path = require("path")
// const fs = require("fs")

const upload = multer();

const AuthClass = require('./Auth/Auth')
const Auth = new AuthClass()

const AdminAuthClass = require('./AdminAuth/AdminAuth');
const AdminAuth = new AdminAuthClass()
const { Verify } = require('crypto');

const ProductClass = require("./Products/Products")
const Product = new ProductClass()

const GetPagesClass = require("./Pages/GetPages")
const GetPages = new GetPagesClass()

const EditPagesClass = require("./Pages/EditPages")
const EditPages = new EditPagesClass()
// server.use(cors())
server.use(cors({
    origin: process.env.FRONTEND_URL, // Replace with your frontend's URL
    credentials: true
  }));
server.use(express.json())



const PORT = process.env.PORT

// ---------------------------middlewares-start-------------------------//

// Ensure the 'uploads' directory exists, create it if it doesn't
// const uploadDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }

// Configure Multer for file upload
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, uploadDir); // Store files in the 'uploads' folder
//     },
//     filename: (req, file, cb) => {
//         // Set unique filename for uploaded files
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, `productImage-${uniqueSuffix}${path.extname(file.originalname)}`);
//     },
// });

// const upload = multer({ storage: storage });

const verifyToken = (request, response, next) => {
    try{
        const bearer_token = request.headers.authorization
        const token = bearer_token.split(" ")[1]
        // console.log("from middleware: ", token)
        const verify = jwt.verify(token, process.env.JWT_SECRET_KEY)
        request.emailVerificationToken = token
        // console.log(request.session)

        next();
    }catch(error){
        response.send({
            message: "invalid jsonwebtoken or jwt expired",
            code: "invalid-jwt",
            reason: error.message
        })
    }
}

const verifyAdminToken = (request, response, next) => {
    try{
        const bearer_token = request.headers.authorization
        const token = bearer_token.split(" ")[1]
        // console.log("from middleware: ", token)
        const verify = jwt.verify(token, process.env.JWT_SECRET_KEY)
        if(verify.user == "admin" && verify.is_an_admin){
            return next()
        }else{
            response.send({
                message: "error 404/ unauthorized",
                code: "error",
                reason: error.message
            })
        }

    }catch(error){
        response.send({
            message: "invalid jsonwebtoken or jwt expired",
            code: "invalid-jwt",
            reason: error.message
        })
    }
}

// ---------------------------middleware-end----------------------------//

server.post("/is-token-active", verifyToken, (request, response) => {
    response.send({code: "success", message: "token still active"})
})
server.post("/is-admin-token-active", verifyAdminToken, (request, response) => {
    response.send({code: "success", message: "user is authorized...grant access"})
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
server.post("/verify-email-verification-code", verifyToken,  async(request, response) => {
    const verificationCode = request.body.verificationCode
    const verificationCodeFromCookie = request.headers.verificationcode
    // console.log("verificationCode: ", verificationCode, "emailVerificationToken: ", request.emailVerificationToken)
    const email = request.email
    try{
        const feedback = await Auth.verifyEmailVerificationCode(email, verificationCode, verificationCodeFromCookie)
        response.send(feedback)
    }catch(error){
        response.send({code: "error", message: "An error occured while verifying OTP", reason: error.message})
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
    const registerFeedback = await Auth.login({email, password})
    response.send (registerFeedback)
})












// ---------------------------admin routes-------------------------------------//





// ---------------------------admin login-------------------------------------//

server.post("/admin/login", async (request, response) => {
    const {email, password} = request.body
    const feedback = await AdminAuth.adminLogin(email, password)
    response.send(feedback);
})

server.post('/admin/create-product', verifyAdminToken, upload.any(), async (request, response) => {
    const {productName, productDescription, productPrice} = request.body
    const saveProduct = await Product.createProduct(productName, productDescription, productPrice, request.files)
    response.send(saveProduct)
});

server.get('/admin/get-page', verifyAdminToken, async (request, response) => {
    const {page} = request.query
    const feedback = await GetPages.index(page)
    response.send(feedback)
    
})

server.post('/admin/edit-page', verifyAdminToken, async (request, response) => {
    const feedback = await EditPages.index(request.body)
})




server.listen(PORT, ()=> console.log(`server is listening on http://localhost:${PORT}`))