const mongoose = require('mongoose');

const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

const Product = require('../models/product');

const ITEMS_PER_PAGE = 2;

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

// Getting information about product
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
        //Key: new Date().toISOString().replace(/:/g, '-') + '-' + image.originalname,
        Body: fs.createReadStream(image.path)
    };  

    s3.send(new PutObjectCommand(uploadParams))
        .then(data => {
            console.log('File uploaded successfully:');
        });


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
        /* return res.status(500).render('admin/edit-product', {
            pageTitle: 'Add Product', 
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: 'Database operation failed, please try again.',
            validationErrors: []
        }); */
        //res.redirect('/error500');
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

//Getting a list of all products in database
/* exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find({userId: req.user._id})
    .countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find({userId: req.user._id})
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
        res.render('admin/products', {
            prods: products, 
            pageTitle: 'Admin Products', 
            path:'/admin/products',
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
    }); */

    
   // Product.find({userId: req.user._id})
    /* .select('title price -_id')
    .populate('userId', 'name') */
    //.then(products => {
        //console.log(products);
      /*  res.render('admin/products', {
            prods: products, 
            pageTitle: 'Admin Products', 
            path:'/admin/products'
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });*/
//};

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
  
    Product.find({ userId: req.user._id })
      .countDocuments()
      .then((numProducts) => {
        totalItems = numProducts;
        return Product.find({ userId: req.user._id })
          .skip((page - 1) * ITEMS_PER_PAGE)
          .limit(ITEMS_PER_PAGE);
      })
      .then((products) => {
        const productPromises = products.map((product) => {
          const params = {
            Bucket: 'nodejsimagestorage',
            Key: product.imageUrl
          };

          return s3.send(new GetObjectCommand(params))
            .then(data => {
                if (data.Body instanceof Readable) {
                    const chunks = [];
                    data.Body.on('data', chunk => chunks.push(chunk));
                    data.Body.on('end', () => {
                      const imageBuffer = Buffer.concat(chunks);
                      const base64Image = imageBuffer.toString('base64');
                      product.base64ImageUrl = base64Image;
                    });
                  } else {
                    console.log('Invalid image data');
                  }
              return product;
            }).catch(error => {
              // Handle error if unable to fetch image from S3
              console.log('Error fetching image from S3:', error);
              return product;
            });
        });
  
        return Promise.all(productPromises);
      })
      .then((productsWithImages) => {
        res.render('admin/products', {
          prods: productsWithImages,
          pageTitle: 'Admin Products',
          path: '/admin/products',
          currentPage: page,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
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
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
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
    Product.findById(prodId)
    .then(product => {
        if (product.userId.toString() != req.user._id.toString()) {
            return res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        if(image) {
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = image.path;
        }
        return product.save()
        .then(result => {
            console.log('Updated Product!');
            res.redirect('/admin/products');
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}; 

//Deleting a product
exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product) {
            return next(new Error('Product not found.'));
        }
        fileHelper.deleteFile(product.imageUrl);
        return Product.deleteOne({_id: prodId, userId: req.user._id});
    })
    .then(() => {
        console.log('Destroyed Product');
        res.status(200).json({message: 'Success!'});
    })
    .catch(err => {
        res.status(500).json({message: 'Deleting product failed.'});
    });
};