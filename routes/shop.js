const express = require('express');
const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');

// Creating an instance of the Express Router
const router = express.Router();

// Handling GET and POST requests, some with authentication
router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

router.get('/checkout/success', isAuth, shopController.getCheckoutSuccess);

router.get('/checkout/cancel', isAuth, shopController.getCheckout);

router.get('/orders', isAuth, shopController.getOrders); 

router.get('/orders/:orderId', isAuth, shopController.getInvoice);

 // Exporting the router module
module.exports = router;