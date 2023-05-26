const express = require('express');
const { check, body } = require('express-validator');
const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

// Handling GET and POST requests
router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
    [
        // Validation checks for the email and password fields
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
            .normalizeEmail(),
            body(
                'password', 
                'Please enter a password with only numbers and text and at least 5 characters.'
                )
                .isLength({min: 5})
                .isAlphanumeric()
                .trim()
    ],
    authController.postLogin);

router.post(
    '/signup',
    [ 
        // Validation checks for the email, password, and confirmPassword fields
        check('email')
            .isEmail()
            .withMessage('Please enter a valid email.')
            .custom((value, {req}) => {
                // Custom validation to check if the email already exists in the database
                return User.findOne({email: value})
                    .then(userDoc => {
                        if(userDoc) {
                            return Promise.reject('Email exists already, please pick a different one.');
                        }
                    });
            })
            .normalizeEmail(),
            body(
                'password', 
                'Please enter a password with only numbers and text and at least 5 characters.'
                )
                .isLength({min: 5})
                .isAlphanumeric()
                .trim(),
            body('confirmPassword')
                .trim()
                .custom((value, { req }) => {
                    // Custom validation to check if the confirmPassword matches the password field
                    if(value !== req.body.password) {
                        throw new Error('Passwords have to match!');
                    }
                    return true;
                })
    ],
    authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

// Exporting the router module
module.exports = router; 