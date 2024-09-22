const paypal = require("@paypal/checkout-server-sdk");
const dotenv = require("dotenv").config()

// Setup PayPal environment
const Environment = paypal.core.SandboxEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(new Environment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET_KEY));

class Payment {
    // Create Payment
    async makePayment(request) {
        const { totalPrice, currency } = request.body;

        const requestBody = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: totalPrice
                }
            }],
            application_context: {
                return_url: `${process.env.FRONTEND_URL}/payment-success`,  // URL to redirect after approval
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
    async validatePayment(request){
        const { token, PayerID } = req.query;

        try {
            const request = new paypal.orders.OrdersCaptureRequest(token);
            const capture = await paypalClient.execute(request);
            
            if (capture.statusCode === 201) {
                // Payment was successful
                res.json({ success: true });
            } else {
                // Payment validation failed
                return{ success: false };
            }
        } catch (error) {
            return{ success: false, message: error.message };
        }
    }
}

module.exports = Payment;
