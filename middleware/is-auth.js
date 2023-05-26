 // Middleware function to check if the user is logged in
module.exports = (req, res, next) => {
    // If the user is not logged in, redirect to the login page
    if(!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    // If the user is logged in, continue to the next middleware or route handler
    next();
}