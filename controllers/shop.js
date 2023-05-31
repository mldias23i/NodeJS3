const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_KEY);
const PDFDocument = require('pdfkit');
const Product = require('../models/product');
const Order = require('../models/order');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

const ITEMS_PER_PAGE = 3;

// Configure AWS S3
const s3 = new S3Client({
    region: 'eu-west-3',
    credentials: {
        accessKeyId: (process.env.AWS_KEY),
        secretAccessKey: (process.env.AWS_KEY_SECRET)
    }
});

//Getting a list of all products in database
exports.getProducts = (req, res, next) => {
    // Extracts the current page number from the query parameters or defaults to 1 if not provided
    const page = +req.query.page || 1;
    // Variable to store the total number of products
    let totalItems;

    // Count the total number of products in the database
    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        // Retrieve a subset of products based on the current page and the number of items per page
        return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
        // Iterate through each product and fetch its corresponding image from AWS S3
        const productPromises = products.map((product) => {
            const params = {
              Bucket: 'nodejsimagestorage',
              Key: product.imageUrl
            };
            // Fetch the image from S3
            return s3.send(new GetObjectCommand(params))
            .then(data => {
                if (data.Body instanceof Readable) {
                    const chunks = [];
                    data.Body.on('data', chunk => chunks.push(chunk));
                    return new Promise((resolve, reject) => {
                        data.Body.on('end', () => {
                        const imageBuffer = Buffer.concat(chunks);
                        const base64Image = imageBuffer.toString('base64');
                        product.base64ImageUrl = base64Image;
                        resolve(product);
                        });
                        data.Body.on('error', reject); // Handle error event
                    });
                } else {
                      console.log('Invalid image data');
                      return product;
                  }
            }).catch(error => {
                // Handle error if unable to fetch image from S3
                console.log('Error fetching image from S3:', error);
                return product;
            });
        });
        // Wait for all image fetch operations to complete
        return Promise.all(productPromises);
    })
    .then((productsWithImages) => {
        // Render the product list view with the retrieved products and pagination information
        res.render('shop/product-list', {
            prods: productsWithImages, 
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
};

//Getting a product in database
exports.getProduct = (req, res, next) => {
    // Extracts the product ID from the request parameters
    const prodId = req.params.productId;
    // Variable to store the product data
    let productData;
    // Find the product by its ID
    Product.findById(prodId)
        .then(product => {
            productData = product;

            const params = {
                Bucket: 'nodejsimagestorage',
                Key: product.imageUrl
            };
            // Fetch the image from S3
            return s3.send(new GetObjectCommand(params));
        })
        .then(data => {
            if (data.Body instanceof Readable) {
                const chunks = [];
                data.Body.on('data', chunk => chunks.push(chunk));
                return new Promise((resolve, reject) => {
                    data.Body.on('end', () => {
                        const imageBuffer = Buffer.concat(chunks);
                        const base64Image = imageBuffer.toString('base64');
                        productData.base64ImageUrl = base64Image;
                        resolve(productData);
                    });
                    data.Body.on('error', reject);
                });
            } else {
                console.log('Invalid image data');
                return productData;
            }
        })
        .then(productWithImage => {
            // Render the product detail view with the retrieved product and its associated image
            res.render('shop/product-detail', {
                product: productWithImage,
                pageTitle: productWithImage.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

// Get the index page with image data from S3
exports.getIndex = (req, res, next) => {
    const imageUrl = 'images/MiguelDiasCV.jpg'; // Specify the image URL
  
    const params = {
      Bucket: 'nodejsimagestorage',
      Key: imageUrl
    };

    // Create a new GetObjectCommand
    const getCommand = new GetObjectCommand(params);

    s3.send(getCommand)
    .then(data => {
      if (data.Body instanceof Readable) {
        const chunks = [];
        data.Body.on('data', (chunk) => chunks.push(chunk));
        data.Body.on('end', () => {
          const imageBuffer = Buffer.concat(chunks);
          const base64Image = imageBuffer.toString('base64');

          // Render the index view with the retrieved image data
          res.render('shop/index', {
            pageTitle: 'About',
            path: '/',
            imageUrl: 'data:image/jpeg;base64,' + base64Image
          });
        });
      } else {
        console.log('Invalid image data');
        return res.status(500).send('Invalid image data');
      }
    })
    .catch(err => {
      console.log('Error fetching image from S3:', err);
      return res.status(500).send('Error fetching image from S3');
    });
};

// Fetches the user's cart and renders the cart page
exports.getCart = (req, res, next) => {
    req.user
    // Populate the product details in the cart
    .populate('cart.items.productId')
    .then(user => {
        // Get the products in the cart
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
};
 
 // Adds products to the user's cart
 exports.postCart = (req, res, next) => {
    // Get the product ID from the request body
    const prodId = req.body.productId;
    // Find the product by ID
    Product.findById(prodId).then(product => {
        // Add the product to the user's cart
        return req.user.addToCart(product);
    }).then(result => {
        console.log(result);
        // Redirect the user to the cart page
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

// Deletes a product from the user's cart
exports.postCartDeleteProduct = (req, res, next) => {
    // Get the product ID from the request body
    const prodId = req.body.productId;
    req.user
    // Remove the product from the user's cart  
    .removeFromCart(prodId)
    .then(result => {
        // Redirect the user to the cart page
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

// Renders the checkout page with the user's cart products and creates a Stripe checkout session
exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
    .populate('cart.items.productId')
    .then(user => {
        // Get the products from the user's cart
        products = user.cart.items;
        total = 0;
        products.forEach(p => {
            // Calculate the total price of all products in the cart
            total += p.quantity * p.productId.price;
        });
        // Create a Stripe checkout session
        return stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: "payment",
            line_items: products.map((p) => {
                return {
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
            // Success URL for redirecting after successful payment
            success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
            // Cancel URL for redirecting if the payment is canceled
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        });
    })
    .then(session => {
        // Render the checkout page with the necessary data
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

// Handles the successful payment redirect
 exports.getCheckoutSuccess = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .then(user => {
        // Retrieve products from the cart and format them for the order
        const products = user.cart.items.map(i => {
            return {quantity: i.quantity, product:  {...i.productId._doc } };
        }); 
        // Create a new order with the user and products
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });
        // Save the order to the database
        return order.save();
    })
    .then(result => {
        // Clear the cart after successful order creation
        return req.user.clearCart();
    })
    .then(() => {
        // Redirect to the orders page
        res.redirect('/orders');
    })
    .catch(err => {
        // Handle errors and pass them to the error handling middleware
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

// Retrieves orders from the database to display on the orders page
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
        // Handle errors and pass them to the error handling middleware
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }); 
 };

 // Generates and serves an invoice PDF for a specific order
 exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
    .then(order => {
        // Check if the order exists
        if(!order) {
            return next(new Error('No error found.'));
        }
        // Check if the order belongs to the logged-in user
        if(order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized'));
        }
        
        // Generate the invoice PDF
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);
        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        // Add content to the PDF
        pdfDoc.font('Helvetica-Bold').fontSize(32).text('Invoice', {
            underline: true,
            align: 'center',
            bold: true
        });

        pdfDoc.text('-----------------', {
            align: 'center'
        });

        // Add header section
        pdfDoc.font('Helvetica')
        .fontSize(12)
        .text('JustForFun', { align: 'center' })
        .moveDown(0.5)
        .text('123 Main Street, Porto, Portugal', { align: 'center' })
        .moveDown(0.5)
        .text('Phone: (+351) 917496071', { align: 'center' })
        .moveDown(0.5)
        .text('Email: mldias23i@gmail.com', { align: 'center' })
        .moveDown(0.5); // Add line spacing after the last line of text

        const lineY = pdfDoc.y + 10; // Set the y-coordinate of the line
        pdfDoc.moveTo(50, lineY) // Start position of the line
        .lineTo(pdfDoc.page.width - 50, lineY) // End position of the line
        .stroke(); // Draw the line

        // Add billing information
        pdfDoc.moveDown(2);
        pdfDoc.font('Helvetica-Bold').fontSize(12).text('Bill To:');
        pdfDoc.font('Helvetica').text(order.user.email);

        // Add order details
        pdfDoc.moveDown(0.9);
        pdfDoc.font('Helvetica-Bold').fontSize(12).text('Order Details:');
        pdfDoc.font('Helvetica').text('Order ID: ' + order._id);
        pdfDoc.moveDown(5);

        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price;
            pdfDoc
            .fontSize(12)
            .text(
                prod.product.title + 
                ' - ' + 
                prod.quantity + 
                ' X ' + 
                '$' + 
                prod.product.price
            );
        });
        pdfDoc.moveDown(1.2);
        const lineW = pdfDoc.y + 10; // Set the y-coordinate of the line
        pdfDoc.moveTo(50, lineW) // Start position of the line
        .lineTo(pdfDoc.page.width - 50, lineW) // End position of the line
        .stroke(); // Draw the line
        pdfDoc.moveDown(2);
        pdfDoc.fontSize(16).text('Total Price: $' + totalPrice, { align: 'right' });
        pdfDoc.end();
    })
    .catch(err => {
        // Handle errors and pass them to the error handling middleware
        next(err);
    })
 };