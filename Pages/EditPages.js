const dotenv = require("dotenv").config()
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const cacheManager = require("../CacheManager/CacheManager")



class EditPages{
    async index(object){
        if(object.page == "shippingPolicy"){
            return this.shippingPolicy(object)
        }else if(object.page == "refundPolicy"){
            return this.refundPolicy(object)
        }
    }
    async shippingPolicy(object){
        try{
            if(object.section == "title") {
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{title: object.content}})
            }else if(object.section == "section-0"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{firstSection: object.content}})
            }else if(object.section == "section-1"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{secondSection: object.content}})
            }else if(object.section == "section-2"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "shippingPolicy"}, {$set:{thirdSection: object.content}})
            }
            // Fetch the updated page from the database
            const updatedPage = await client.db(process.env.DB_NAME).collection("pages").findOne({ page: "shippingPolicy" });

            if (updatedPage) {
                // Update the cache with the new data
                cacheManager.set('shippingPolicy', {
                        title: updatedPage.title,
                        firstSection: updatedPage.firstSection,
                        secondSection: updatedPage.secondSection,
                        thirdSection: updatedPage.thirdSection
                    }
                );
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
    async refundPolicy(object){
        console.log(object)
        try{
            if(object.section == "title") {
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{title: object.content}})
            }else if(object.section == "section-0"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{firstSection: object.content}})
            }else if(object.section == "section-1"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{secondSection: object.content}})
            }else if(object.section == "section-2"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{thirdSection: object.content}})
            }else if(object.section == "section-3"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{fourthSection: object.content}})
            }else if(object.section == "section-4"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{fifthSection: object.content}})
            }else if(object.section == "section-5"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{sixthSection: object.content}})
            }else if(object.section == "section-6"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{seventhSection: object.content}})
            }else if(object.section == "section-7"){
                const update = client.db(process.env.DB_NAME).collection("pages").findOneAndUpdate({page: "refundPolicy"}, {$set:{eighthSection: object.content}})
            }
            // Fetch the updated page from the database
            const updatedPage = await client.db(process.env.DB_NAME).collection("pages").findOne({ page: "refundPolicy" });

            if (updatedPage) {
                // Update the cache with the new data
                cacheManager.set('refundPolicy', {
                        title: updatedPage.title,
                        firstSection: updatedPage.firstSection,
                        secondSection: updatedPage.secondSection,
                        thirdSection: updatedPage.thirdSection,
                        fourthSection: updatedPage.thirdSection,
                        fifthSection: updatedPage.thirdSection,
                        sixthSection: updatedPage.thirdSection,
                        seventhSection: updatedPage.thirdSection,
                        eighthSection: updatedPage.thirdSection,
                        
                    }
                );
            }
            return {
                code: "success",
                message: "refund policy page successfully updated",
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
}

module.exports = EditPages