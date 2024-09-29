const dotenv = require("dotenv").config()
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const cacheManager = require("../CacheManager/CacheManager")
class GetPages {

    async index(page) {
        if (page === "shippingPolicy") {
            return this.shippingPolicy(page);
        }else if(page === "refundPolicy"){
            return this.refundPolicy(page)
        }
        // Handle other pages or add more conditions if needed
    }

    async shippingPolicy(page) {
        try {
            const cachedData = cacheManager.get('shippingPolicy')
            if (cachedData) {
                return {
                    code: "success",
                    message: "Page successfully retrieved from cache",
                    data: cachedData
                };
            } else {
                const feedback = await client.db(process.env.DB_NAME).collection("pages").findOne({ page: "shippingPolicy" });

                // Cache the data in Redis
                if (feedback) {
                    cacheManager.set('shippingPolicy', {
                        title: feedback.title,
                        firstSection: feedback.firstSection,
                        secondSection: feedback.secondSection,
                        thirdSection: feedback.thirdSection
                    })
                }

                return {
                    code: "success",
                    message: "Page successfully retrieved from database",
                    data: {
                        title: feedback.title,
                        firstSection: feedback.firstSection,
                        secondSection: feedback.secondSection,
                        thirdSection: feedback.thirdSection
                    }
                };
            }
        } catch (error) {
            return {
                code: "error",
                message: "An error occurred while retrieving the page",
                reason: error.message
            };
        }
    }
    async refundPolicy(page) {
        try {
            const cachedData = cacheManager.get('refundPolicy')
            if (cachedData) {
                return {
                    code: "success",
                    message: "Page successfully retrieved from cache",
                    data: cachedData
                };
            } else {
                const feedback = await client.db(process.env.DB_NAME).collection("pages").findOne({ page: "refundPolicy" });

                // Cache the data in Redis
                if (feedback) {
                    cacheManager.set('refundPolicy', {
                        title: feedback.title,
                        firstSection: feedback.firstSection,
                        secondSection: feedback.secondSection,
                        thirdSection: feedback.thirdSection,
                        fourthSection: feedback.fourthSection,
                        fifthSection: feedback.fifthSection,
                        sixthSection: feedback.sixthSection,
                        seventhSection: feedback.seventhSection,
                        eighthSection: feedback.eighthSection,

                    })
                }

                return {
                    code: "success",
                    message: "Page successfully retrieved from database",
                    data: {
                        title: feedback.title,
                        firstSection: feedback.firstSection,
                        secondSection: feedback.secondSection,
                        thirdSection: feedback.thirdSection,
                        fourthSection: feedback.fourthSection,
                        fifthSection: feedback.fifthSection,
                        sixthSection: feedback.sixthSection,
                        seventhSection: feedback.seventhSection,
                        eighthSection: feedback.eighthSection,
                    }
                };
            }
        } catch (error) {
            return {
                code: "error",
                message: "An error occurred while retrieving the page",
                reason: error.message
            };
        }
    }

    async homePage() {
        // Implement logic if needed
    }

    async cartPage() {
        // Implement logic if needed
    }
}

module.exports = GetPages;
