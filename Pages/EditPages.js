const dotenv = require("dotenv").config()
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
// const redis = require("redis")
// const redisClient = redis.createClient()



class EditPages{
    constructor(redisClient) {
        this.redisClient = redisClient;
    }
    async shippingPolicy(object){
        try{
            if(object.section == "title") {
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{title: object.content}})
            }else if(object.section == "section-0"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{firstSection: object.content}})
            }else if(object.section == "section-1"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{secondSection: object.content}})
            }else if(object.section == "section-1"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{thirdSection: object.content}})
            }
            // Fetch the updated page from the database
            const updatedPage = await client.db(process.env.DB_NAME).collection("pages").findOne({ page: "shippingPolicy" });

            if (updatedPage) {
                // Update the cache with the new data
                this.redisClient.set('shippingPolicy', JSON.stringify({
                    title: updatedPage.title,
                    firstSection: updatedPage.firstSection,
                    secondSection: updatedPage.secondSection,
                    thirdSection: updatedPage.thirdSection
                }));
            }
            return {
                code: "success",
                message: "Shipping policy page successfully updated",
                reason: error.message
            }
        }catch(error){
            return {
                code: "error",
                message: "An error occured while updating page",
                reason: error.message
            }
        }
    }
    async index(object){
        if(object.page == "shippingPolicy"){
            return this.shippingPolicy(object)
        }
    }
}

module.exports = EditPages