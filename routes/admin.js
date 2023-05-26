const path = require('path');
const express = require('express');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');
const { body } = require('express-validator');

// Creating an instance of the Express Router
const router = express.Router();

// Handling GET and POST requests with authentication 
router.get('/add-product', isAuth, adminController.getAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.post('/add-product', [
    // Validation checks for the title, price, and description fields
    body('title')
        .isString()
        .isLength({ min: 3 })
        .trim(),
    body('price')
        .isFloat(),
    body('description')
        .isLength({ min: 5, max: 400 })
        .trim()
], 
isAuth, 
adminController.postAddProduct); 

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', [
        // Validation checks for the title, price, and description fields
        body('title')
            .isString()
            .isLength({ min: 3 })
            .trim(),
        body('price')
            .isFloat(),
        body('description')
            .isLength({ min: 5, max: 400 })
            .trim()
    ],
    isAuth, 
    adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);  

// Exporting the router module
module.exports = router; 
