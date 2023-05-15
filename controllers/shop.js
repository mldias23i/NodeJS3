const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY);

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 2;

//Getting a list of all products in database
exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
        res.render('shop/product-list', {
            prods: products, 
            pageTitle: 'Products', 
            path:'/products',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}

//Getting a product in database
 exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        res.render('shop/product-detail', {
            product: product,
            pageTitle: product.title, 
            path:'/products'
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });        
 };

 //Getting a list  of all products in database to first page
 exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
        res.render('shop/index', {
            prods: products, 
            pageTitle: 'Shop', 
            path:'/',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
 };


 exports.getCart = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .then(user => {
        const products = user.cart.items;
        res.render('shop/cart', {
            pageTitle: 'Your Cart', 
            path:'/cart',
            products: products
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })

 //Getting products in cart without mongoose
/* exports.getCart = (req, res, next) => {
    req.user.getCart().then(products => {
        res.render('shop/cart', {
            pageTitle: 'Your Cart', 
            path:'/cart',
            products: products
        });
    })
    .catch(err => {
        console.log(err);
    }) */

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
    req.user
    .removeFromCart(prodId)
    .then(result => {
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
    .populate('cart.items.productId')
    .then(user => {
        products = user.cart.items;
        total = 0;
        products.forEach(p => {
            total += p.quantity * p.productId.price;
        });

        return stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: "payment",
            line_items: products.map((p) => {
                return {
                    /* name: p.productId.title,
                    description: p.productId.description,
                    amount: Math.round(p.productId.price.toFixed(2)*100),
                    currency: 'usd', */
                    quantity: p.quantity,
                    price_data: {
                        currency: "usd",
                        unit_amount: p.productId.price * 100,
                        product_data: {
                          name: p.productId.title,
                          description: p.productId.description
                        }
                    }
                };
            }),
            customer_email: req.user.email,
            success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        });
    })
    .then(session => {
        res.render('shop/checkout', {
            pageTitle: 'Checkout', 
            path:'/checkout',
            products: products,
            totalSum: total,
            sessionId: session.id
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })

};

//Adding order to orders page
 exports.getCheckoutSuccess = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .then(user => {
        const products = user.cart.items.map(i => {
            return {quantity: i.quantity, product:  {...i.productId._doc } };
        }); 
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(result => {
        return req.user.clearCart();
    })
    .then(() => {
        res.redirect('/orders');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
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
    Order.find({'user.userId': req.user._id })
    .then(orders => {
        res.render('shop/orders', {
            pageTitle: 'Your Orders', 
            path:'/orders',
            orders: orders
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }); 
 };

 exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
    .then(order => {
        if(!order) {
            return next(new Error('No error found.'));
        }
        if(order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized'));
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);

        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(26).text('Invoice', {
            underline: true
        });

        pdfDoc.text('-----------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price;
            pdfDoc
            .fontSize(14)
            .text(
                prod.product.title + 
                ' - ' + 
                prod.quantity + 
                ' X ' + 
                '$' + 
                prod.product.price
            );
        });
        pdfDoc.text('-------');
        pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

        pdfDoc.end();
        /* fs.readFile(invoicePath, (err, data) => {
            if(err) {
                return next(err);
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            res.send(data);
            res.end();
        }); */
        /* const file = fs.createReadStream(invoicePath);
        
        file.pipe(res); */
    })
    .catch(err => {
        next(err);
    })
 };