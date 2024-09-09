const dotenv = require("dotenv").config()
const jwt = require("jsonwebtoken")
const bcryptjs = require("bcryptjs")
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)


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
                        token: loginTokin
                    }
                })
            }
        }catch(error){
            return({code: "error", message: "An error  while creating logging in", reason: error.message})
        }
    }

}

module.exports = AdminAuth