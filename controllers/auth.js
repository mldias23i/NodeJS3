const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Create a nodemailer transporter using the SendGrid transport
const transporter = nodemailer.createTransport(sendGridTransport({
    auth: {
        api_key: process.env.SEND_GRID
    }
}));

// Render the login page
exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
        res.render('auth/login', { 
            path:'/login',
            pageTitle: 'Login',
            errorMessage: message,
            oldInput: {
                email: '',
                password: ''
            },
            validationErrors: []
        });
 };

 // Render the signup view template with the appropriate data
 exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: message,
      oldInput: { 
        email: '', 
        password: '', 
        confirmPassword: ''  
        },
        validationErrors: []
    });
  };

 exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    // Check for validation errors
    if (!errors.isEmpty()) {
        console.log(errors.array());
        // Render the login view template with the validation errors and input values
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
          });
    }
    // Find the user by email
    User.findOne({email: email})
    .then(user => {
        if(!user) {
            // Render the login view template with an error message for invalid email or password
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
        }
        // Compare the provided password with the stored password
        bcrypt
        .compare(password, user.password)
        .then(doMatch => {
            // Set the user as logged in by creating a session and redirect to the home page
            if(doMatch) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save((err) => {
                    console.log(err);
                    res.redirect('/');
                });              
            }
            // Render the login view template with an error message for invalid email or password
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    // Check for validation errors
    if (!errors.isEmpty()) {
        console.log(errors.array());
        // Render the signup view template with the validation errors and input values
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: { 
                email: email, 
                password: password, 
                confirmPassword: req.body.confirmPassword 
            },
            validationErrors: errors.array()
          });
    }
    // Hash the password using bcrypt
    bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
        // Create a new user with the hashed password and an empty cart
        const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] }
        });
        return user.save();
    })
    .then(result => {
        // Redirect to the login page after successful signup
        res.redirect('/login');
        // Send a signup success email to the user
        return transporter.sendMail({
            to: email,
            from: 'mldias23i@gmail.com',
            subject: 'SignUp succeeded',
            html: '<h1>You sucessfully signed up!<h1>'
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postLogout = (req, res, next) => {
    // Destroy the session and remove the session data
    req.session.destroy((err) => {
        console.log(err);
        // Redirect the user to the home page after logout
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};

// Handles the POST request for the reset password functionality
exports.postReset = (req, res, next) => {
    //Using crypto model to generate a random token of length 32 bytes
    crypto.randomBytes(32, (err, buffer) => {
        if(err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        // Find user by email
        User.findOne({email: req.body.email})
        .then(user => {
            // If no user found
            if(!user) {
                req.flash('error', 'No account with that email found.');
                return res.redirect('/reset');
            }
            user.resetToken = token;
            // Token expiration set to 1 hour from now
            user.resetTokenExpiration = Date.now() + 3600000;
            return user.save();
        })
        .then(result => {
            res.redirect('/');
            // Send password reset email to the user
            return transporter.sendMail({
                to: req.body.email,
                from: 'mldias23i@gmail.com',
                subject: 'Password reset',
                html: `
                    <p>You request a password reset</p>
                    <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
                `
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
            })
    });
};

// Resetting the password
exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    //Searching for a user whose resetToken matches the provided token and whose resetTokenExpiration is in the future, 
    //indicating that the password reset token is still valid and has not expired
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
    .then(user => {
        let message = req.flash('error');
        if(message.length > 0) {
            message = message[0];
        }
        else {
            message = null;
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: message,
            // Convert the user ID to a string
            userId: user._id.toString(),
            passwordToken: token
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });  
};

// Resetting the password
exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    // Find the user in the database with the provided password token, valid expiration, and matching user ID
    User.findOne({
        resetToken: passwordToken, 
        resetTokenExpiration: {$gt: Date.now()}, 
        _id: userId
    })
    .then(user => {
        resetUser = user;
        // Hash the new password
        return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
        // Update the user's password, reset token, and reset token expiration
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(result => {
        // Redirect the user to the login page after successfully resetting the password
        res.redirect('/login');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};