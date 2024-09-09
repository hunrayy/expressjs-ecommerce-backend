const dotenv = require("dotenv").config()
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const redis = require("redis")
const redisClient = redis.createClient()

class GetPages {
    constructor(redisClient) {
        this.redisClient = redisClient;
    }

    async index(page) {
        if (page === "shippingPolicy") {
            return this.shippingPolicy(page);
        }
        // Handle other pages or add more conditions if needed
    }

    async shippingPolicy(page) {
        try {
            const cachedData = await new Promise((resolve, reject) => {
                this.redisClient.get('shippingPolicy', (error, data) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(data);
                });
            });

            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                return {
                    code: "success",
                    message: "Page successfully retrieved from cache",
                    data: parsedData
                };
            } else {
                const feedback = await client.db(process.env.DB_NAME).collection("pages").findOne({ page: "shippingPolicy" });

                // Cache the data in Redis
                if (feedback) {
                    this.redisClient.set('shippingPolicy', JSON.stringify({
                        title: feedback.title,
                        firstSection: feedback.firstSection,
                        secondSection: feedback.secondSection,
                        thirdSection: feedback.thirdSection
                    }), 'EX', 3600); // Cache for 1 hour
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

    async homePage() {
        // Implement logic if needed
    }

    async cartPage() {
        // Implement logic if needed
    }
}

module.exports = GetPages;
