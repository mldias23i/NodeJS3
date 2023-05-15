const Product = require('../models/product');

//Getting a list of all products in database
exports.getProducts = (req, res, next) => {
    Product.fetchAll().then(products => {
        res.render('shop/product-list', {
            prods: products, 
            pageTitle: 'All Products', 
            path:'/products'
        });
    }).catch(err => {
        console.log(err);
    });
}

//Getting a product in database
 exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    /* Product.findAll({where: {id: prodId}}).then(products => {
        res.render('shop/product-detail', {
            productDetail: products[0],
            pageTitle: products[0].title, 
            path:'/products'
        });
    }).catch(err => console.log(err)); */
    Product.findById(prodId).then(product => {
        res.render('shop/product-detail', {
            productDetail: product,
            pageTitle: product.title, 
            path:'/products'
        });
    })
    .catch(err => {
        console.log(err);
    });        
 };

 //Getting a list  of all products in database to first page
 exports.getIndex = (req, res, next) => {
    Product.fetchAll().then(products => {
        res.render('shop/index', {
            prods: products, 
            pageTitle: 'Shop', 
            path:'/'
        });
    }).catch(err => {
        console.log(err);
    });
 };

 //Getting products in cart
exports.getCart = (req, res, next) => {
    req.user.getCart().then(products => {
        res.render('shop/cart', {
            pageTitle: 'Your Cart', 
            path:'/cart',
            products: products
        });
    })
    .catch(err => {
        console.log(err);
    })

    // Without Sequelize
    /* Cart.getCart(cart => {
        Product.fetchAll(products => {
            const cartProducts = [];
            for (product of products) {
                const cartProductData = cart.products.find(prod => prod.id === product.id);
                if(cartProductData) {
                    cartProducts.push({productData : product, qty: cartProductData.qty});
                }
            }
            res.render('shop/cart', {
                pageTitle: 'Your Cart', 
                path:'/cart',
                products: cartProducts
            });
        });     
    }); */
 };

 //Adding products to cart
 exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId).then(product => {
        return req.user.addToCart(product);
    }).then(result => {
        console.log(result);
        res.redirect('/cart');
    });
    //Without mongoDB
    /* let fetchedCart;
    let newQuantity = 1;
    req.user.getCart().then(cart => {
        fetchedCart = cart;
        return cart.getProducts({ where: { id: prodId } });
      })
      .then(products => {
        let product;
        if (products.length > 0) {
          product = products[0];
        }
        if (product) {
          const oldQuantity = product.cartItem.quantity;
          newQuantity = oldQuantity + 1;
          return product;
        }
        return Product.findByPk(prodId);
    }).then(product => {
        return fetchedCart.addProduct(product, {
            through: { quantity: newQuantity }
        });
    }).then(() => {
        res.redirect('/cart');
    }).catch(err => console.log(err)); */

    //without Sequelize
    /* 
    Product.findById(prodId, (product) => {
        Cart.addProduct(prodId, product.price);
    });
    res.redirect('/cart'); */
};

//Deleting product from cart
exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.deleteItemFromCart(prodId).then(result => {
        res.redirect('/cart');
    })
    .catch(err => {
        console.log(err);
    });
};

//Adding order to orders page
 exports.postOrder = (req, res, next) => {
    let fetchedCart;
    req.user
    .addOrder()
    .then(result => {
        res.redirect('/orders');
    })
    .catch(err => {
        console.log(err);
    });
};
    // with sequelize
    /* req.user.getCart().then(cart => {
        fetchedCart = cart;
        return cart.getProducts();
    }).then(products => {
        return req.user.createOrder().then(order => {
           return order.addProducts(products.map(product => {
                product.orderItem = {quantity: product.cartItem.quantity};
                return product;
            }));
        })
        .catch(err => {
            console.log(err);
        });
    }).then(result => {
        return fetchedCart.setProducts(null);
    }).then(result => {
        res.redirect('/orders');
    })
    .catch(err => {
        console.log(err);
    });*/

//Getting orders on database to show in page orders
 exports.getOrders = (req, res, next) => {
    req.user
    .getOrders()
    .then(orders => {
        res.render('shop/orders', {
            pageTitle: 'Your Orders', 
            path:'/orders',
            orders: orders
        });
    }).catch(err => {
        console.log(err);
    }); 
 };