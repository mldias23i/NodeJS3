const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the product schema
const productSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    base64ImageUrl: {
        type: String
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

// Create and export the Product model using the product schema
module.exports = mongoose.model('Product', productSchema);