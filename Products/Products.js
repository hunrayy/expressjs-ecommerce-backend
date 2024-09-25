const dotenv = require("dotenv").config()
const mongodb = require("mongodb")
const client = new mongodb.MongoClient(process.env.DB_URL)
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const CacheManager = require('../CacheManager/CacheManager');
const ObjectId = mongodb.ObjectId;
const jwt = require("jsonwebtoken")
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });


class Product {
    async uploadToCloudinary(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
            } else {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "products" }, // Optional folder in Cloudinary
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result.secure_url); // Returning the uploaded file URL
                        }
                    }
                );
                // Pipe the file buffer into the upload stream
                streamifier.createReadStream(file.buffer).pipe(uploadStream);
            }
        });
    };

    async createProduct(request) {
        const { productName, productPrice } = request.body;
    
        if (!productName || !productPrice) {
            return {
                message: "All fields required",
                code: "error"
            };
        }
    
        try {
            console.log("Files received in request:", request.files);
    
            // Helper function to find file by fieldname
            const findFileByFieldname = (files, fieldname) => {
                return files.find(file => file.fieldname === fieldname) || null;
            };
    
            // Find each image from request.files
            const productImage = findFileByFieldname(request.files, 'productImage');
            const subImage1 = findFileByFieldname(request.files, 'subImage1');
            const subImage2 = findFileByFieldname(request.files, 'subImage2');
            const subImage3 = findFileByFieldname(request.files, 'subImage3');
    
            console.log("Product Image:", productImage);
            console.log("Sub Image 1:", subImage1);
            console.log("Sub Image 2:", subImage2);
            console.log("Sub Image 3:", subImage3);
    
            // Upload images conditionally
            const uploadedProductImage = await this.uploadToCloudinary(productImage);
            const uploadedSubImage1 = await this.uploadToCloudinary(subImage1);
            const uploadedSubImage2 = await this.uploadToCloudinary(subImage2);
            const uploadedSubImage3 = await this.uploadToCloudinary(subImage3);
    
            const newProduct = {
                productName: productName,
                productPriceInNaira: productPrice,
                productImage: uploadedProductImage,
                subImage1: uploadedSubImage1,
                subImage2: uploadedSubImage2,
                subImage3: uploadedSubImage3
            };
    
            console.log("New Product Object:", newProduct);
    
            // Save product to the database
            const savedProduct = await client.db(process.env.DB_NAME).collection("products").insertOne(newProduct)
            // After product is saved, fetch and save all products from the database to the cache
            const allProducts = await client.db(process.env.DB_NAME).collection("products").find().toArray();

            // Cache all products
            CacheManager.set("products", allProducts);
            return {
                message: "Product created successfully",
                code: "success"
            };
        } catch (error) {
            return {
                message: "Error creating product",
                code: "error",
                reason: error.message
            };
        }    
    }
    async getAllProducts() {
        try {
            const cachedProducts = CacheManager.get('products');
            console.log("Cached products before setting:", cachedProducts);
            
            if (cachedProducts) {
                console.log("Returning cached products:", cachedProducts);
                return {
                    code: "success",
                    message: "All products successfully retrieved",
                    data: cachedProducts
                };
            } else {
                const feedback = await client.db(process.env.DB_NAME).collection("products").find().toArray();
                console.log("Saving products to cache:", feedback);
                CacheManager.set('products', feedback);
                return {
                    code: "success",
                    message: "All products successfully retrieved",
                    data: feedback
                };
            }
        } catch (error) {
            return {
                code: "error",
                message: "An error occurred while retrieving all products",
                reason: error.message
            };
        }
    }
    async createCacheKey(productName){
        return `product_${productName.replace(/\s+/g, '_').toLowerCase()}`;
    };
    

    async getSingleProduct(productName){
        // const cacheKey = this.createCacheKey(productName);
        // Check if the product is in the cache
        console.log("from single producttt: ", productName)

        let cachedProduct = CacheManager.get(productName);

        if (cachedProduct) {
            console.log('Product found in cache');
            return {
                message: "Product retrieved successfully",
                code: "success",
                data: cachedProduct
            }
        }

        // If not in cache, fetch from the database
        console.log('Product not found in cache, fetching from database');
        try {
            const product = await client.db(process.env.DB_NAME).collection("products").findOne({ productName: new RegExp(`^${productName}$`, 'i') })
            if(product){
                // Store the product in the cache
                CacheManager.set(productName, product);
                return {
                    message: "Product retrieved successfully",
                    code: "success",
                    data: product
                }
            }else{
                return {
                    message: "Product could not be retrieved",
                    code: "error"
                }
            }

        
        } catch (error) {
            console.error("Error fetching product:", error);
            return {
                message: "Product could not be retrieved",
                code: "error",
                reason: error.message
            }
        }
    }
    
    async searchProduct(query) {
        // Split query into words
        const queryWords = query.toLowerCase().split(' ');

        // Check cache first
        let cachedProducts = CacheManager.get('products');
        console.log(cachedProducts)
        if (cachedProducts) {
            // Filter products from the cache
            console.log("Products found in cache:", cachedProducts);
            const filteredProducts = this.filterProducts(cachedProducts, queryWords);
            return {
                message: "Products successfully retrieved",
                code: "success",
                data: filteredProducts
            };
        } else {
            // Fetch products from the database if not in cache
            console.log("No products found in cache. Fetching from database...");
            const response = await this.getAllProducts();
            if (response.code === "success") {
                cachedProducts = response.data; // Extract data from the response
                const filteredProducts = this.filterProducts(cachedProducts, queryWords);
                return {
                    message: "Products successfully retrieved",
                    code: "success",
                    data: filteredProducts
                };
            } else {
                // Handle the error if products could not be retrieved
                return {
                    code: "error",
                    message: "An error occurred while retrieving products",
                    reason: response.reason
                };
            }
        }
    }

    // Function to filter products based on the query
    filterProducts(products, queryWords) {
        return products.filter(product => {
            const productWords = product.productName.toLowerCase().split(' ');
    
            // Check if any query word exactly matches any product word
            return queryWords.some(queryWord => 
                productWords.some(productWord => 
                    productWord === queryWord
                )
            );
        });
    }
    

    async getProductById(productId){
        try{
            const feedback = await client.db(process.env.DB_NAME).collection("products").findOne({_id: new ObjectId(productId)})
            console.log("from jggdh", feedback)
            return feedback
        }catch(error){
            return {
                message: "An error occured while fetching product by id",
                code: "error",
                reason: error.message
            }
        }
    }
    extractPublicId(url) {
        if (!url || !url.includes('cloudinary.com')) return '';
        return url.split('/').slice(6, -1).join('/');
    }

    async updateProduct(productId, body, files) {
        try {
            const product = await this.getProductById(productId);
            console.log("Product details before update:", product);

            if (!product) {
                return {
                    code: "error",
                    message: "Product not found"
                };
            }

            // Extract old image public IDs
            const oldSubImagePublicIds = product.images.slice(1).map(this.extractPublicId); // Skip the first image (main image)
            const oldMainImagePublicId = this.extractPublicId(product.images[0]);

            // Handle new main image URL (the first image in the array)
            const newMainImageUrl = product.images[0];

            // Handle new sub-image uploads
            const imageUploadPromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: process.env.FOLDER_FOR_IMAGES_IN_CLOUDINARY },
                        (error, result) => {
                            if (error) {
                                console.error('Cloudinary upload error:', error);
                                return reject(error);
                            }
                            resolve(result);
                        }
                    );
                    streamifier.createReadStream(file.buffer).pipe(uploadStream);
                });
            });

            const uploadResults = await Promise.all(imageUploadPromises);
            const newSubImageUrls = uploadResults.map(result => result.secure_url);

            // Delete old images from Cloudinary
            if (oldMainImagePublicId) {
                cloudinary.uploader.destroy(oldMainImagePublicId, (error, result) => {
                    if (error) {
                        console.error('Error deleting old main image:', error);
                    } else {
                        console.log('Old main image deleted:', result);
                    }
                });
            }

            oldSubImagePublicIds.forEach(publicId => {
                if (publicId) {
                    cloudinary.uploader.destroy(publicId, (error, result) => {
                        if (error) {
                            console.error('Error deleting old sub-image:', error);
                        } else {
                            console.log('Old sub-image deleted:', result);
                        }
                    });
                }
            });

            // Update product details
            const updatedProductDetails = {
                productName: body.productName || product.productName,
                productDescription: body.productDescription || product.productDescription,
                productPriceInNaira: body.productPrice || product.productPriceInNaira,
                images: [newMainImageUrl, ...newSubImageUrls], // Main image first, followed by sub-images
            };

            await client.db(process.env.DB_NAME).collection("products").updateOne(
                { _id: new ObjectId(productId) },
                { $set: updatedProductDetails }
            );

            // Update cache
            const allProducts = await client.db(process.env.DB_NAME).collection("products").find().toArray();
            CacheManager.set("products", allProducts);

            return { message: 'Product updated successfully!', code: "success", data: updatedProductDetails };
        } catch (error) {
            return { code: "error", message: 'Error updating product', reason: error.message };
        }
    }
    async deleteProduct(_id, images){
        try {
            // Create a unique set of images to avoid duplicate deletion
            const uniqueImages = new Set(images);
        
            // Delete each image from Cloudinary by extracting its publicId
            const deletePromises = Array.from(uniqueImages).map(imageUrl => {
              // Extract the publicId from the URL (assuming the format is consistent)
              const publicId = imageUrl.split('/').pop().split('.')[0];
              return cloudinary.uploader.destroy(`beautybykiara/${publicId}`);
            });
        
            // Wait for all Cloudinary deletions to complete
            await Promise.all(deletePromises);
        
            // Delete the product from MongoDB
            await client.db(process.env.DB_NAME).collection('products').deleteOne({ _id: new ObjectId(_id) });
            //fetch the new products from the database and save it to the cache
            const allProductsInDb = await client.db(process.env.DB_NAME).collection("products").find().toArray();
            CacheManager.set('products', allProductsInDb);
        
            return{ code: "success", message: 'Product and associated images deleted successfully' }
          } catch (error) {
            console.error("Error deleting product and images:", error);
            return{ message: "Failed to delete product", code: "error", reason: error.message }
          }
    }
    async savedProductToDbAfterPayment (user_id, products, detailsToken) {
        try{
            const verifyToken = jwt.verify(detailsToken, process.env.JWT_SECRET_KEY)
            const {firstname, lastname, email, address, city, postalCode, phoneNumber, country, state, totalPrice, currency} = verifyToken
            const today = new Date();
            const dd = today.getDate()
            const mm = today.toLocaleString('en-US', { month: 'short' });
            const yyyy = today.getFullYear();
            const date = dd + ' ' + mm + ' ' + yyyy;
            const time = `${today.getHours()}:${today.getMinutes()}`
            const orderDetails = {
                user_id: user_id,
                firstname: firstname,
                lastname: lastname,
                email: email,
                country: country,
                state: state,
                address: address,
                city: city,
                postalCode: postalCode,
                phoneNumber: phoneNumber,
                totalPrice: totalPrice,
                currency: currency,
                date: date,
                time: time,
                products: products,
                status: "Pending"
            }
            const saveProducts = await client.db(process.env.DB_NAME).collection("orders").insertOne(orderDetails)
            return {
                message: "products ordered successfully saved to db",
                code: "success"
            }
        }catch(error){
            return{
                message: "products ordered could not be saved to db",
                code: "error",
                reason: error.message
            }
        }
    }
}

module.exports = Product
