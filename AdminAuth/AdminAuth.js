const dotenv = require("dotenv").config()
const jwt = require("jsonwebtoken")
const bcryptjs = require("bcryptjs")
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const cacheManager = require("../CacheManager/CacheManager")


class AdminAuth {

    async checkIfAdminExist(email){
        const feedback = await client.db(process.env.DB_NAME).collection("admin").findOne({email: email})
        if(feedback){return "exists"}else{return "not-exist"}
    }

    async getAdminByEmail(email){
        const get_admin_feedback = await client.db(process.env.DB_NAME).collection("admin").findOne({email: email})
        if(get_admin_feedback){

            return {
                message: "Admin retrieved by their email ",
                code: "success",
                data: get_admin_feedback
            }

        }else{

            return {
                message: "Admin's data could not be retrieved",
                code: 'error',
                data: null

            }
        }
    }

    async createToken(payload, expires){
    
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: expires })
    
        return token;
    
    }


    async adminLogin(email, password){
        try{
            if(!email || !password){
                return({message: "All fields required", code: "error"})
            }
            const checkIfAdminExist = await this.checkIfAdminExist(email)
            if(checkIfAdminExist == "not-exist"){
                return ({
                    message: "Invalid email/password",
                    code: "error"
                })
            }
            // get admin's details by email
            const getAdminDetails = await this.getAdminByEmail(email)
            // console.log(getAdminDetails)
            if(getAdminDetails.code == "success"){
                const firstname = getAdminDetails.data.firstname
                const lastname = getAdminDetails.data.lastname
                const user = getAdminDetails.data.user
                const is_an_admin = getAdminDetails.data.is_an_admin
                const countryOfWarehouseLocation = getAdminDetails.data.countryOfWarehouseLocation
                const domesticShippingFeeInNaira = getAdminDetails.data.domesticShippingFeeInNaira
                const internationalShippingFeeInNaira = getAdminDetails.data.internationalShippingFeeInNaira
                const hashedPassword = getAdminDetails.data.password

                const verifyPassword = await bcryptjs.compare(password, hashedPassword)
                if(!verifyPassword){
                    return({
                        message: "Invalid email/password",
                        code: "error"
                    })
                }
                const payload = {
                    firstname: firstname,
                    lastname: lastname,
                    email: email,
                    user: user,
                    is_an_admin: is_an_admin
                }
                const loginTokin = await this.createToken(payload, "20d")
                return({
                    message: "Login success",
                    code: "success",
                    data: {
                        firstname: firstname,
                        lastname: lastname,
                        email: email,
                        user: user,
                        is_an_admin: is_an_admin,
                        token: loginTokin,
                        countryOfWarehouseLocation: getAdminDetails.data.countryOfWarehouseLocation,
                        domesticShippingFeeInNaira: getAdminDetails.data.domesticShippingFeeInNaira,
                        internationalShippingFeeInNaira: getAdminDetails.data.internationalShippingFeeInNaira
                    }
                })
            }
        }catch(error){
            return({code: "error", message: "An error  while creating logging in", reason: error.message})
        }
    }
    // async saveNotificationsToCache(){
    //     //retrieve all notifications and send to the client
    //     const allNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find().toArray()
    //     //store the fetched notifications in cache
    //     cacheManager.set("adminReadNotifications", allNotifications)
    // }


    async getAdminUnreadNotifications(){
        console.log("from cache manager unread", cacheManager.get("adminUnreadNotifications"))

        try{
            //check the cache for unread notifications
            const notificationsInCache = cacheManager.get('adminUnreadNotifications')
            if(notificationsInCache){
                return {message: "Unread notifications successfully retrieved from cache", code: "success", data: notificationsInCache}

            }else{
                //no unread notifications in cache hence check the database
                const feedback = await client.db(process.env.DB_NAME).collection("adminNotifications").find({ "notification.hasBeenRead": false }).toArray()
                //save fetched result to cache
                cacheManager.set("adminUnreadNotifications", feedback)
                console.log("from feedback", cacheManager.get("adminUnreadNotifications"))
                return {message: "Unread notifications fetched successfully from database", code: "success", data: feedback}
            }
        }catch(error){
            return {
                message: "An error occured while fetching unread notifications",
                code: "error",
                reason: error.message
            }
        }finally {
            // IIFE that runs asynchronously in the background after the return
            (async () => {
                try {
                    // Fetch all notifications and cache them
                    const allNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find().toArray();
                    cacheManager.set("adminReadNotifications", allNotifications);
                } catch (error) {
                    console.error("Error while fetching all notifications in background:", error.message);
                }
            })();
        }
    }

    async getAllAdminNotifications (){
        console.log("from cache manager read", cacheManager.get("adminReadNotifications"))

        try{
            // Check if notifications are already cached
            const cachedNotifications = cacheManager.get("adminReadNotifications");
            console.log("from cache manager", cacheManager.get("adminReadNotifications"))


            if (cachedNotifications) {
                // If notifications are found in cache, return them
                //delete the unread notifications from cache(if any)
                cacheManager.del("adminUnreadNotifications")


                return {
                    message: "Notifications retrieved from cache",
                    code: "success",
                    data: cachedNotifications
                };
            }
            // turn all notifications.hasBeenRead to true
            await client.db(process.env.DB_NAME).collection("adminNotifications").updateMany({"notification.hasBeenRead": false}, {$set: {"notification.hasBeenRead": true}})

            //delete the unread notifications from cache(if any)
            cacheManager.del("adminUnreadNotifications")

            //retrieve all notifications and send to the client
            const allNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find().toArray()

            //store the fetched notifications in cache
            cacheManager.set("adminReadNotifications", allNotifications)
            return{
                message: "All notifications successfully retrieved from database",
                code: "success",
                data: allNotifications
            }
        }catch(error){
            return {
                message: "An error ocurred while retrieving all notifications",
                code: "error",
                reason: error.message
            }
        }finally{
            await client.db(process.env.DB_NAME).collection("adminNotifications").updateMany({"notification.hasBeenRead": false}, {$set: {"notification.hasBeenRead": true}})
            cacheManager.del("adminUnreadNotifications")
        }
    }

}

module.exports = AdminAuth










































// const dotenv = require("dotenv").config()
// const jwt = require("jsonwebtoken")
// const bcryptjs = require("bcryptjs")
// const mongodb = require("mongodb")
// const client = new mongodb.MongoClient(process.env.DB_URL)
// const cacheManager = require("../CacheManager/CacheManager")


// class AdminAuth {

//     async checkIfAdminExist(email){
//         const feedback = await client.db(process.env.DB_NAME).collection("admin").findOne({email: email})
//         if(feedback){return "exists"}else{return "not-exist"}
//     }

//     async getAdminByEmail(email){
//         const get_admin_feedback = await client.db(process.env.DB_NAME).collection("admin").findOne({email: email})
//         if(get_admin_feedback){

//             return {
//                 message: "Admin retrieved by their email ",
//                 code: "success",
//                 data: get_admin_feedback
//             }

//         }else{

//             return {
//                 message: "Admin's data could not be retrieved",
//                 code: 'error',
//                 data: null

//             }
//         }
//     }

//     async createToken(payload, expires){
    
//         const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: expires })
    
//         return token;
    
//     }


//     async adminLogin(email, password){
//         try{
//             if(!email || !password){
//                 return({message: "All fields required", code: "error"})
//             }
//             const checkIfAdminExist = await this.checkIfAdminExist(email)
//             if(checkIfAdminExist == "not-exist"){
//                 return ({
//                     message: "Invalid email/password",
//                     code: "error"
//                 })
//             }
//             // get admin's details by email
//             const getAdminDetails = await this.getAdminByEmail(email)
//             // console.log(getAdminDetails)
//             if(getAdminDetails.code == "success"){
//                 const firstname = getAdminDetails.data.firstname
//                 const lastname = getAdminDetails.data.lastname
//                 const user = getAdminDetails.data.user
//                 const is_an_admin = getAdminDetails.data.is_an_admin
//                 const hashedPassword = getAdminDetails.data.password

//                 const verifyPassword = await bcryptjs.compare(password, hashedPassword)
//                 if(!verifyPassword){
//                     return({
//                         message: "Invalid email/password",
//                         code: "error"
//                     })
//                 }
//                 const payload = {
//                     firstname: firstname,
//                     lastname: lastname,
//                     email: email,
//                     user: user,
//                     is_an_admin: is_an_admin
//                 }
//                 const loginTokin = await this.createToken(payload, "20d")
//                 return({
//                     message: "Login success",
//                     code: "success",
//                     data: {
//                         firstname: firstname,
//                         lastname: lastname,
//                         email: email,
//                         user: user,
//                         is_an_admin: is_an_admin,
//                         token: loginTokin
//                     }
//                 })
//             }
//         }catch(error){
//             return({code: "error", message: "An error  while creating logging in", reason: error.message})
//         }
//     }
//     // async saveNotificationsToCache(){
//     //     //retrieve all notifications and send to the client
//     //     const allNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find().toArray()
//     //     //store the fetched notifications in cache
//     //     cacheManager.set("adminReadNotifications", allNotifications)
//     // }


//     async getAdminUnreadNotifications(){
//         try{
//             //check the cache for unread notifications
//             const notificationsInCache = cacheManager.get('adminUnreadNotifications')
//             if(notificationsInCache){
//                 return {message: "Unread notifications successfully retrieved from cache", code: "success", data: notificationsInCache}

//             }else{
//                 //no unread notifications in cache hence check the database
//                 const feedback = await client.db(process.env.DB_NAME).collection("adminNotifications").find({ "notification.hasBeenRead": false }).toArray()
//                 //save fetched result to cache
//                 cacheManager.set("adminUnreadNotifications", feedback)
//                 return {message: "Unread notifications fetched successfully from database", code: "success", data: feedback}
//             }
//         }catch(error){
//             return {
//                 message: "An error occured while fetching unread notifications",
//                 code: "error",
//                 reason: error.message
//             }
//         }finally {
//             // IIFE that runs asynchronously in the background after the return
//             (async () => {
//                 try {
//                     // Fetch all notifications and cache them
//                     const allNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find().toArray();
//                     cacheManager.set("adminReadNotifications", allNotifications);
//                 } catch (error) {
//                     console.error("Error while fetching all notifications in background:", error.message);
//                 }
//             })();
//         }
//     }

//     async getAllAdminNotifications (){
//         try{
//             // Check if notifications are already cached
//             const cachedNotifications = cacheManager.get("adminReadNotifications");

//             if (cachedNotifications) {
//                 // If notifications are found in cache, return them
//                 //delete the unread notifications from cache(if any)
//                 cacheManager.del("adminUnreadNotifications")

//                 return {
//                     message: "Notifications retrieved from cache",
//                     code: "success",
//                     data: cachedNotifications
//                 };
//             }
//             // turn all notifications.hasBeenRead to true
//             await client.db(process.env.DB_NAME).collection("adminNotifications").updateMany({"notification.hasBeenRead": false}, {$set: {"notification.hasBeenRead": true}})

//             //delete the unread notifications from cache(if any)
//             cacheManager.del("adminUnreadNotifications")

//             //retrieve all notifications and send to the client
//             const allNotifications = await client.db(process.env.DB_NAME).collection("adminNotifications").find().toArray()

//             //store the fetched notifications in cache
//             cacheManager.set("adminReadNotifications", allNotifications)
//             return{
//                 message: "All notifications successfully retrieved from database",
//                 code: "success",
//                 data: allNotifications
//             }
//         }catch(error){
//             return {
//                 message: "An error ocurred while retrieving all notifications",
//                 code: "error",
//                 reason: error.message
//             }
//         }finally{
//             cacheManager.del("adminUnreadNotifications")
//         }
//     }

// }

// module.exports = AdminAuth