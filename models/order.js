const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the order schema
const orderSchema = new Schema({
    products: [
        {
            product: {
                type: Object, required: true
            },
            quantity: {
                type: Number, required: true
            }
        }
    ],
    user: {
        email: {
            type: String, 
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    }
});

// Create and export the Order model using the order schema
module.exports = mongoose.model('Order', orderSchema);