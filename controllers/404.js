// Render the 404 error page
exports.get404 = (req, res, next) => {
    res.status(404).render('error404', {
        pageTitle: 'Page Not Found', 
        path:'/404',
        isAuthenticated: req.session.isLoggedIn
    });
};

// Render the 500 error page
exports.get500 = (req, res, next) => {
    res.status(500).render('error500', {
        pageTitle: 'Error!', 
        path:'/500',
        isAuthenticated: req.session.isLoggedIn
    });
};