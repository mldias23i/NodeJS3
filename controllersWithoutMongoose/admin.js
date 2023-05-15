const Product = require('../models/product');

// Getting information about product
exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product', 
        path: '/admin/add-product',
        editing: false
    });
};

//Adding products to database
exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    const product = new Product(title, price, description, imageUrl, null, req.user._id);
    product.save().then(result => {
        console.log('Created Product!');
        res.redirect('/admin/products');
    }).catch(err => {
        console.log(err);
    });
};

//Getting a list of all products in database
exports.getProducts = (req, res, next) => {
    Product.fetchAll().then(products => {
        res.render('admin/products', {
            prods: products, 
            pageTitle: 'Admin Products', 
            path:'/admin/products'
        });
    })
    .catch(err => {
        console.log(err);
    });
};

// Getting information about a product to alter
exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if(!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product) {
            return res.redirect('/');
        }
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product', 
            path: '/admin/edit-product',
            editing: editMode,
            product: product
        });
    })
    .catch(err => {
        console.log(err);
    });
    
}; 

// Editing information about a product
 exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedImageUrl = req.body.imageUrl;
    const updatedDesc = req.body.description;
    //Product.findById(prodId).then(productData => {
    const product = new Product(updatedTitle, updatedPrice, updatedDesc, updatedImageUrl, prodId);
        /* product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        product.imageUrl = updatedImageUrl; */
        product.save().then(result => {
        console.log('Updated Product!');
    }).catch(err => {
        console.log(err);
    });
    //without sequelize
    // const updateProduct = new Product(prodId, updatedTitle, updatedImageUrl, updatedDesc, updatedPrice);
    //updateProduct.save(); 
    res.redirect('/admin/products');
}; 

//Deleting a product
exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    //Without sequelize
    //    Product.deleteById(prodId);
    Product.deleteById(prodId).then(() => {
        console.log('Destroyed Product');
        res.redirect('/admin/products');
    }).catch(err => {
        console.log(err);
    });
};