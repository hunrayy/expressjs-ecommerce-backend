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

const PaymentClass = require("./Payment/Payment");
const Payment = new PaymentClass()
// server.use(cors())
server.use(cors({
    origin: process.env.FRONTEND_URL,
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

const verifyToken = async (request, response, next) => {
    try{
        const bearer_token = request.headers.authorization
        const token = bearer_token.split(" ")[1]
        const verify = jwt.verify(token, process.env.JWT_SECRET_KEY)
        request.emailVerificationToken = token
        email = verify.email
        const getDetailsByEmail = await Auth.getUserByEmail(email)
        objectId = getDetailsByEmail.data.id
        const resolveUserId = await Auth.resolveUserId(objectId)
        request.user_id = resolveUserId
        // console.log("from middleware: ", getDetailsByEmail)

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

// pusher test route
server.post("/pusher-test-route", async(request, response) => {
    const feedback = await Auth.testPusher()
    response.send(feedback)
})
server.post("/is-token-active", (request, response) => {
    const bearer_token = request.headers.authorization
    const token = bearer_token.split(" ")[1]
    const verify = jwt.verify(token, process.env.JWT_SECRET_KEY)
    if(verify){
        response.send({code: "success", message: "token still active"})
    }else{
        response.send({message: "invalid jsonwebtoken or jwt expired", code: "invalid-jwt"})
    }
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
// ----------------------------fetch-all-products----------------------------//
server.get('/get-all-products', async (request, response) => {
    const feedback = await Product.getAllProducts()
    response.send(feedback)
})
// ----------------------------fetch-single-product----------------------------//
server.get('/get-single-product', async (request, response) => {
    let { productName } = request.query
    console.log(typeof(productName))
    productName = String(productName)
    const feedback = await Product.getSingleProduct(productName)
    response.send(feedback)
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
server.post("/verify-email-verification-code", async(request, response) => {
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

server.get("/get-user-details", verifyToken, async (request, response) => {
    const user_id = request.user_id
    const feedback = await Auth.getUserById(user_id)
    response.send(feedback)
})






server.post("/flutterwave/make-payment", verifyToken, async (request, response) => {
    try {
        const feedback = await Payment.makePayment(request);
        response.send(feedback);
    } catch (error) {

        response.send({ code: "error", reason: error.message });
    }
});

// server.post("/paypal/capture-payment", verifyToken, async (request, response) => {
//     const { orderId } = request.body; // Get the order ID from the request body
//     try {
//         const payment = await Payment.capturePayment(orderId);
//         response.json(payment);
//     } catch (error) {
//         response.status(500).send({ error: error.message });
//     }
// });

server.get('/flutterwave/validate-payment', verifyToken, async (request, response) => {
    const feedback = await Payment.validatePayment(request)
    response.send(feedback)
});

server.post('/save-products-to-db-after-payment', verifyToken, async(request, response) => {
    const user_id = request.user_id
    const products = request.body.cartProducts
    const detailsToken = request.headers.detailsToken
    const feedback = await Product.savedProductToDbAfterPayment(user_id, products, detailsToken)
    response.send(feedback)

    // const user_id = request.user_id
    // const feedback = await Product.savedProductToDbAfterPayment()
})



// ---------------------------admin routes-------------------------------------//





// ---------------------------admin login-------------------------------------//

server.post("/admin/login", async (request, response) => {
    const {email, password} = request.body
    const feedback = await AdminAuth.adminLogin(email, password)
    response.send(feedback);
})

server.post('/admin/create-product', verifyAdminToken, upload.any(), async (request, response) => {
    // console.log(request.files)
    const feedback = await Product.createProduct(request)
    response.send(feedback)
    console.log(feedback)

});

// const {productName, productDescription, productPrice} = request.body
// const saveProduct = await Product.createProduct(productName, productDescription, productPrice, request.files)
// response.send(saveProduct)
server.get('/admin/get-page', verifyAdminToken, async (request, response) => {
    const {page} = request.query
    const feedback = await GetPages.index(page)
    response.send(feedback)
    
})

server.post('/admin/edit-page', verifyAdminToken, async (request, response) => {
    const feedback = await EditPages.index(request.body)
    // console.log(request.body)
})
server.get('/admin/get-all-products', verifyAdminToken, async (request, response) => {
    const feedback = await Product.getAllProducts()
    response.send(feedback)
})

server.post('/admin/update-product', verifyAdminToken, upload.any(), async (request, response) => {
    const { productName, productDescription, productPrice, productImage } = request.body; // Text fields including main image
    const files = request.files; // Uploaded files (subimages)
    const {productId} = request.query
    const feedback = await Product.updateProduct(productId, request.body, request.files)
    response.send(feedback)
});

server.get('/admin/search-products', verifyAdminToken, async(request, response) => {
    const {query} = request.query
    const feedback = await Product.searchProduct(query)
    response.send(feedback)
})

server.post('/admin/delete-product', verifyAdminToken, async (request, response) => {
    const { _id, images } = request.body.productToDelete;
    const feedback = await Product.deleteProduct(_id, images)
    console.log("from server", feedback)
    response.send(feedback)
});
server.get('/admin/get-admin-unread-notifications', verifyAdminToken, async(request, response) => {
    const feedback = await AdminAuth.getAdminUnreadNotifications()
    response.send(feedback)
})
server.get('/get-all-admin-notifications', verifyAdminToken, async (request, response) => {
    const feedback = await AdminAuth.getAllAdminNotifications()
    response.send(feedback)
})
  





server.listen(PORT, ()=> console.log(`server is listening on http://localhost:${PORT}`))