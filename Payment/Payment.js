const paypal = require("@paypal/checkout-server-sdk");
const dotenv = require("dotenv").config()

const AuthClass = require('../Auth/Auth')
const Auth = new AuthClass()

// Setup PayPal environment
const Environment = paypal.core.SandboxEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(new Environment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET_KEY));

class Payment {
    // Create Payment
    async makePayment(request) {
        const { email, firstname, lastname, address, city, postalCode, phoneNumber, country, state, totalPrice, currency } = request.body;
        const payload = {email, firstname, lastname, address, city, postalCode, phoneNumber, country, state, totalPrice, currency}
        const generateToken = await Auth.createToken(payload, "30m")

        const requestBody = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: totalPrice
                }
            }],
            application_context: {
                return_url: `${process.env.FRONTEND_URL}/payment-success?details=${generateToken}`,  // URL to redirect after approval
                cancel_url: `${process.env.FRONTEND_URL}/products/checkout`,    // URL to redirect if the buyer cancels
            }
        };

        const createOrderRequest = new paypal.orders.OrdersCreateRequest();
        createOrderRequest.headers['Content-Type'] = 'application/json';
        createOrderRequest.requestBody(requestBody);

        try {
            const response = await paypalClient.execute(createOrderRequest);
            return response.result; // Return the created order
        } catch (error) {
            return {
                message: 'Error creating payment',
                code: "error",
                reason: error.message
            }
        }
    }

    // Capture Payment
    async capturePayment(orderId) {
        const captureOrderRequest = new paypal.orders.OrdersCaptureRequest(orderId);
        captureOrderRequest.headers['Content-Type'] = 'application/json';
        captureOrderRequest.requestBody({}); // Empty body for capture

        try {
            const response = await paypalClient.execute(captureOrderRequest);
            return response.result; // Return the captured order
        } catch (error) {
            return {
                message: 'Error capturing payment',
                code: "error",
                reason: error.message
            }
        }
    }
    // async validatePayment(request){
    //     const { token, PayerID } = request.query;

    //     try {
    //         const request = new paypal.orders.OrdersCaptureRequest(token);
    //         const capture = await paypalClient.execute(request);
            
    //         if (capture.statusCode === 201) {
    //             // Payment was successful
    //             return{ success: true };
    //         } else {
    //             // Payment validation failed
    //             return{ success: false };
    //         }
    //     } catch (error) {
    //         return{ success: false, reason: error.message };
    //     }
    // }



    async validatePayment(request) {
        const { token, PayerID } = request.query;
    
        try {
            // Get the order details using the token (orderID)
            const orderRequest = new paypal.orders.OrdersGetRequest(token);
            const order = await paypalClient.execute(orderRequest);
    
            // Check if the order has already been captured
            if (order.result.status === "COMPLETED") {
                // Payment was already captured
                return { success: true, message: "Payment already captured.", code: "already-made" };
            } else if (order.result.status === "APPROVED") {
                // The order is approved and can be captured
                const captureRequest = new paypal.orders.OrdersCaptureRequest(token);
                const capture = await paypalClient.execute(captureRequest);
    
                if (capture.statusCode === 201) {
                    return { success: true, message: "Payment captured successfully." };
                } else {
                    return { success: false, message: "Failed to capture payment." };
                }
            } else {
                // Handle other statuses
                return { success: false, message: `Invalid order status: ${order.result.status}` };
            }
        } catch (error) {
            return { success: false, reason: error.message };
        }
    }
    
}

module.exports = Payment;
