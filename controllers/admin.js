const fileHelper = require('../util/file');
const { validationResult } = require('express-validator');
const Product = require('../models/product');
const ITEMS_PER_PAGE = 4;
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const { Readable } = require('stream');

// Configure AWS S3
const s3 = new S3Client({
    region: 'eu-west-3',
    credentials: {
        accessKeyId: (process.env.AWS_KEY),
        secretAccessKey: (process.env.AWS_KEY_SECRET)
    }
});

// Render the add product form
exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product', 
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: null,
        validationErrors: []
    });
};

//Adding products to database
exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;

    // Check if an image is provided
    if(!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product', 
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: 'Attached file is not an image.',
            validationErrors: []
        });
    }

    const imageUrl = image.path;

    const errors = validationResult(req);

     // Check if there are any validation errors
    if(!errors.isEmpty()) {
       return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product', 
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const uploadParams = {
        Bucket: 'nodejsimagestorage',
        Key: imageUrl.toString(),
        Body: fs.createReadStream(image.path)
    };  

    // Upload the image to the S3 bucket
    s3.send(new PutObjectCommand(uploadParams))
        .then(data => {
            console.log('File uploaded successfully:');
        });

    // Create a new product instance
    const product = new Product({
        title: title, 
        price:price, 
        description: description, 
        imageUrl: imageUrl,
        userId: req.user
    });
    product
    .save()
    .then(result => {
        console.log('Created Product!');
        res.redirect('/admin/products');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

// Get all products belonging to the user
exports.getProducts = (req, res, next) => {
    // Current page number from query parameter
    const page = +req.query.page || 1;
    // Total number of products
    let totalItems;
  
    // Count the total number of products for the user
    Product.find({ userId: req.user._id })
      .countDocuments()
      .then((numProducts) => {
        totalItems = numProducts;
        // Find products for the current page
        return Product.find({ userId: req.user._id })
          // Pagination: Skip products based on page number and items per page
          .skip((page - 1) * ITEMS_PER_PAGE)
          // Pagination: Limit the number of products per page
          .limit(ITEMS_PER_PAGE);
      })
      .then((products) => {
        const productPromises = products.map((product) => {
          const params = {
            Bucket: 'nodejsimagestorage',
            Key: product.imageUrl
          };

          // Fetch the image data from S3 for each product
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
        // Wait for all product promises to resolve
        return Promise.all(productPromises);
      })
      .then((productsWithImages) => {
        // Render the products view with fetched products and pagination information
        res.render('admin/products', {
          prods: productsWithImages,
          pageTitle: 'My Products',
          path: '/admin/products',
          currentPage: page,
          // Check if there is a next page
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
           // Check if there is a previous page
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          // Calculate the last page number
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

// Get information about a product to edit
exports.getEditProduct = (req, res, next) => {
    // Check if edit mode is enabled from query parameter
    const editMode = req.query.edit;

    // Redirect to the homepage if edit mode is not enabled
    if(!editMode) {
        return res.redirect('/');
    }

    // Extract the product ID from the request parameters
    const prodId = req.params.productId;
    // Find the product by its ID
    Product.findById(prodId)
    .then(product => {
        if(!product) {
            // Redirect to the homepage if the product is not found
            return res.redirect('/');
        }
        // Render the edit-product view with the product information
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product', 
            path: '/admin/edit-product',
            editing: editMode,
            product: product,
            hasError: false,
            errorMessage: null,
            validationErrors: []
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
    
}; 

// Editing information about a product
 exports.postEditProduct = (req, res, next) => {
    // Extract the product ID from the request body
    const prodId = req.body.productId;
    // Get the updated title from the request body
    const updatedTitle = req.body.title;
    // Get the updated price from the request body
    const updatedPrice = req.body.price;
    // Get the updated image from the request file
    const image = req.file;
    // Get the updated description from the request body
    const updatedDesc = req.body.description;
    // Validate the request body using the validationResult function
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
       // If there are validation errors, render the edit-product view with the error information
       return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product', 
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    // Find the product by its ID
    Product.findById(prodId)
    .then(product => {
        if (product.userId.toString() != req.user._id.toString()) {
            // If the product doesn't belong to the current user, redirect to the homepage
            return res.redirect('/');
        }

        // Update the product with the new information
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        if(image) {
            // If there is an updated image, handle the file upload and update the imageUrl
            fileHelper.deleteFile(product.imageUrl);

            const fileName = new Date().toISOString().replace(/:/g, '-') + '-' + image.originalname;
            const fileKey = `images/${fileName}`;

             // Upload new image to AWS S3
             const uploadParams = {
                Bucket: 'nodejsimagestorage',
                Key: fileKey,
                Body: fs.createReadStream(image.path)
            };

            s3.send(new PutObjectCommand(uploadParams))
                .then(data => {
                    console.log('File uploaded successfully:', data);
                    // Update the imageUrl in the database
                    product.imageUrl = fileKey;

                    // Save the updated product
                    return product.save();
                })
                .catch(err => {
                    console.log('Error uploading file to S3:', err);
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                });
        } else {
            // If there is no new image, save the updated product
            return product.save();
        }
    })
    .then(result => {
        console.log('Updated Product!');
        res.redirect('/admin/products');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}; 

//Deleting a product
exports.deleteProduct = (req, res, next) => {
     // Extract the product ID from the request parameters
    const prodId = req.params.productId;
     // Find the product by its ID
    Product.findById(prodId)
    .then(product => {
        if(!product) {
            // If the product is not found, throw an error
            return next(new Error('Product not found.'));
        }

        // Delete the image associated with the product
        fileHelper.deleteFile(product.imageUrl);
        // Delete the product from the database
        return Product.deleteOne({_id: prodId, userId: req.user._id});
    })
    .then(() => {
        console.log('Destroyed Product');
        // Respond with a success message
        res.status(200).json({message: 'Success!'});
    })
    .catch(err => {
        // Respond with an error message
        res.status(500).json({message: 'Deleting product failed.'});
    });
};