const dotenv = require("dotenv").config()
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });


class Product {
    async createProduct(productName, productDescription, productPrice, arrayOfFiles){
        if(!productName || !productDescription || !productPrice || !arrayOfFiles){
            return {
                message: "All fields required",
                code: "error"
            }
        }
        try {
            const imageUploadPromises = arrayOfFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({ folder: process.env.FOLDER_FOR_IMAGES_IN_CLOUDINARY }, (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            return reject(error);
                        }
                        resolve(result);
                    });
                    streamifier.createReadStream(file.buffer).pipe(uploadStream);
                });
            });
    
            const uploadResults = await Promise.all(imageUploadPromises);
    
            // Log all image URLs
            console.log('Uploaded image URLs:', uploadResults.map(result => result.secure_url));
            
            const productDetails = {
                productName: productName,
                productDescription: productDescription,
                productPrice: productPrice,
                images: uploadResults.map(result => result.secure_url),
            };
            const saveProduct = await client.db(process.env.DB_NAME).collection("products").insertOne(productDetails)
    
            // Save productDetails to your database here
            return({ message: 'Product created successfully!', code: "success", data: productDetails });
        } catch (error) {
            return({ code: "error", message: 'Error creating product' , reason: error.message});
        }
    }
}

module.exports = Product