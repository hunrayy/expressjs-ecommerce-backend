const axios = require('axios');
const dotenv = require("dotenv").config();

class Payment {
    // Create Payment
    async makePayment(request) {
        const { email, firstname, lastname, address, city, postalCode, phoneNumber, country, state, totalPrice, currency } = request.body;
        const uniqueId = Date.now()
        const payload = {
            tx_ref: `ref_${uniqueId}`, // Unique transaction reference
            amount: parseFloat(totalPrice),
            currency: currency,  // Ensure this currency is supported by Flutterwave
            customer: {
                email: email,
                phone_number: phoneNumber,
                name: `${firstname} ${lastname}`
            },
            redirect_url: `${process.env.FRONTEND_URL}/payment-success?tx_ref=ref_${uniqueId}`, // URL to redirect after approval
        };
    
        try {
            const response = await axios.post('https://api.flutterwave.com/v3/payments', payload, {
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data; // Return the response from Flutterwave
        } catch (error) {
            return {
                message: 'Error creating payment',
                code: "error",
                reason: error.response ? error.response.data.message : error.message
            };
        }
    }
    

    // Validate Payment
    async validatePayment(request) {
        const { tx_ref } = request.query;
        console.log(tx_ref)

        // if (!tx_ref) {
        //     return { code: 'error', reason: 'Transaction reference is required.' };
        // }
    
        // try {
        //     const response = await axios.get(`https://api.flutterwave.com/v3/transaction/verify_by_txref/${tx_ref}`, {
        //         headers: {
        //             Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
        //         }
        //     });
        //     console.log("from flutterwave", response)
    
        //     // if (response.data.status === 'success') {
        //     //     return res.json({ success: true, message: 'Payment verified' });
        //     // } else if (response.data.status === 'already_made') {
        //     //     return res.status(400).json({ code: 'already-made', message: 'Payment has already been made.' });
        //     // }
    
        //     // return { success: false, message: 'Payment verification failed' };
        // } catch (error) {
        //     return { success: false, message: 'Error validating payment' };
        // }
    }
}
// if (response.data.status === 'success') {
//     return { success: true, message: "Payment captured successfully." };
// } else {
//     return { success: false, message: `Payment status: ${response.data.status}` };
// }

module.exports = Payment;

















































// const paypal = require("@paypal/checkout-server-sdk");
// const dotenv = require("dotenv").config()

// const AuthClass = require('../Auth/Auth')
// const Auth = new AuthClass()

// // Setup PayPal environment
// const Environment = paypal.core.SandboxEnvironment;
// const paypalClient = new paypal.core.PayPalHttpClient(new Environment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET_KEY));

// class Payment {
//     // Create Payment
//     async makePayment(request) {
//         const { email, firstname, lastname, address, city, postalCode, phoneNumber, country, state, totalPrice, currency } = request.body;
//         const payload = {email, firstname, lastname, address, city, postalCode, phoneNumber, country, state, totalPrice, currency}
//         const generateToken = await Auth.createToken(payload, "30m")

//         const requestBody = {
//             intent: 'CAPTURE',
//             purchase_units: [{
//                 amount: {
//                     currency_code: currency,
//                     value: totalPrice
//                 }
//             }],
//             application_context: {
//                 return_url: `${process.env.FRONTEND_URL}/payment-success?details=${generateToken}`,  // URL to redirect after approval
//                 cancel_url: `${process.env.FRONTEND_URL}/products/checkout`,    // URL to redirect if the buyer cancels
//             }
//         };

//         const createOrderRequest = new paypal.orders.OrdersCreateRequest();
//         createOrderRequest.headers['Content-Type'] = 'application/json';
//         createOrderRequest.requestBody(requestBody);

//         try {
//             const response = await paypalClient.execute(createOrderRequest);
//             return response.result; // Return the created order
//         } catch (error) {
//             return {
//                 message: 'Error creating payment',
//                 code: "error",
//                 reason: error.message
//             }
//         }
//     }

//     // Capture Payment
//     async capturePayment(orderId) {
//         const captureOrderRequest = new paypal.orders.OrdersCaptureRequest(orderId);
//         captureOrderRequest.headers['Content-Type'] = 'application/json';
//         captureOrderRequest.requestBody({}); // Empty body for capture

//         try {
//             const response = await paypalClient.execute(captureOrderRequest);
//             return response.result; // Return the captured order
//         } catch (error) {
//             return {
//                 message: 'Error capturing payment',
//                 code: "error",
//                 reason: error.message
//             }
//         }
//     }

//     async validatePayment(request) {
//         const { token, PayerID } = request.query;
    
//         try {
//             // Get the order details using the token (orderID)
//             const orderRequest = new paypal.orders.OrdersGetRequest(token);
//             const order = await paypalClient.execute(orderRequest);
    
//             // Check if the order has already been captured
//             if (order.result.status === "COMPLETED") {
//                 // Payment was already captured
//                 return { success: true, message: "Payment already captured.", code: "already-made" };
//             } else if (order.result.status === "APPROVED") {
//                 // The order is approved and can be captured
//                 const captureRequest = new paypal.orders.OrdersCaptureRequest(token);
//                 const capture = await paypalClient.execute(captureRequest);
    
//                 if (capture.statusCode === 201) {
//                     return { success: true, message: "Payment captured successfully." };
//                 } else {
//                     return { success: false, message: "Failed to capture payment." };
//                 }
//             } else {
//                 // Handle other statuses
//                 return { success: false, message: `Invalid order status: ${order.result.status}` };
//             }
//         } catch (error) {
//             return { success: false, reason: error.message };
//         }
//     }
    
// }

// module.exports = Payment;
