const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the user schema
const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [
            {
                productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true}, 
                quantity: {type: Number, required: true} 
            }
        ]
    }
});

// Add a method to the user schema to add a product to the cart
userSchema.methods.addToCart = function(product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];

    if(cartProductIndex >= 0) {
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    }
    else {
        updatedCartItems.push({
            productId: product._id,
            quantity: newQuantity
        });
    }
    const updatedCart = {
        items: updatedCartItems
    };
    this.cart = updatedCart;
    return this.save();
}

// Add a method to the user schema to remove a product from the cart
userSchema.methods.removeFromCart = function(productId) {
    const updatedCartItems = this.cart.items.filter(item => {
        return item.productId.toString() !== productId.toString();
    });
    this.cart.items = updatedCartItems;
    return this.save();
}

// Add a method to the user schema to clear the cart
userSchema.methods.clearCart = function () {
    this.cart = {items: [] };
    return this.save();
}

// Create and export the User model using the user schema
module.exports = mongoose.model('User', userSchema);