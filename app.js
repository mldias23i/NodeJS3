const path = require('path');  // Importing the path module for working with file paths
const fs = require('fs');  // Importing the fs module for working with the file system
const express = require('express');  // Importing the express module
const bodyParser = require('body-parser');  // Importing the body-parser module for parsing request bodies
const mongoose = require('mongoose');  // Importing the mongoose module for working with MongoDB
const session = require('express-session');  // Importing the express-session module for session management
const MongoDBStore = require('connect-mongodb-session')(session);  // Importing the connect-mongodb-session module for storing sessions in MongoDB
const csrf = require('csurf');  // Importing the csurf module for CSRF protection
const flash = require('connect-flash');  // Importing the connect-flash module for displaying flash messages
const multer = require('multer');  // Importing the multer module for handling file uploads
const helmet = require('helmet');  // Importing the helmet module for enhancing application security
const compression = require('compression');  // Importing the compression module for response compression
const morgan = require('morgan');  // Importing the morgan module for request logging
const errorController = require('./controllers/404');  // Importing the error controller module
const User = require('./models/user');  // Importing the User model

  // MongoDB connection URI
const MONGODB_URI =
 `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.och8axc.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express(); // Creating an instance of the express application

// Creating a new MongoDB session store
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});

const csrfProtection = csrf(); // Creating CSRF protection middleware

// Creating file storage configuration for multer
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Setting the destination directory for uploaded files
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        // Generating a unique filename for uploaded files
        cb(null,new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
    }
});

// Creating file filter for multer
const fileFilter = (req, file, cb) => {
    if(
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/jpeg'
    ) {
        // Accepting the file if it matches the allowed mimetypes
        cb(null, true);
    }
    else {
        // Rejecting the file if it doesn't match the allowed mimetypes
        cb(null, false);
    }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

// Importing Routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

// Creating a write stream for logging access logs
const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'), 
    {flags: 'a'}
);

// Adding helmet middleware with content security policy
app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          connectSrc: ["'self'", 'https://js.stripe.com'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
          frameSrc: ["'self'", 'https://js.stripe.com'],
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://nodejsimagestorage.s3.eu-west-3.amazonaws.com"],
        },
      },
    })
);

// Using compression middleware for response compression
app.use(compression());
 // Using morgan middleware for logging requests
app.use(morgan('combined', { stream: accessLogStream }));
// Parsing URL-encoded bodies
app.use(bodyParser.urlencoded({extended: false}));
// Handling file uploads with multer
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

// Serving static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
// Serving static files from the "images" directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Using session middleware for managing sessions
app.use(
    session({
        secret: 'my secret', // Secret used to sign the session ID cookie
        resave: false, // Whether to save the session on every request even if it's not modified
        saveUninitialized: false, // Whether to save uninitialized sessions
        store: store // Session store for storing session data
    })
);

// Using CSRF protection middleware
app.use(csrfProtection);
// Using flash messages middleware
app.use(flash());

// Adding global variables to response locals
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn; // Setting a local variable for indicating user authentication status
    res.locals.csrfToken = req.csrfToken(); // Setting a local variable for the CSRF token
    next();
});

// Retrieving and storing the user object from the database if logged in
app.use((req, res, next) => {
    // Checking if a user is logged in
    if(!req.session.user) {
        return next();
    }
    // Finding the user by session ID
    User.findById(req.session.user._id)
    .then(user => {
        if(!user) {
            return next();
        }
        // Storing the user object in the request
        req.user = user;
        next();
    })
    .catch(err => {
        next(new Error(err));
    });
});

//Handling routes that are shop, admin and auth related
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// Handling GET requests to '/error500' for server errors
app.get('/error500', errorController.get500);

// Handling 404 errors for unknown routes
app.use(errorController.get404);

// Rendering the 'error500' view for 500 errors
app.use((error, req, res, next) => {
    res.status(500).render('error500', {
        pageTitle: 'Error!', 
        path:'/500',
        isAuthenticated: req.session.isLoggedIn
    });
});

// Connecting to MongoDB using the MONGODB_URI
mongoose
.connect(MONGODB_URI)
.then(result => {
    // Starting the app on the specified port or defaulting to 3000
    app.listen(process.env.PORT || 3000); 
})
.catch(err => {
    console.log(err);
});