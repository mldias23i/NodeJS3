const path = require('path');

const express = require("express");
const bodyParser = require('body-parser');
const sequelize = require('./util/database');
const Product = require('./models/product');
const User = require('./models/user');
const Cart = require('./models/cart');
const CartItem = require('./models/cart-item');
const Order = require('./models/order');
const OrderItem = require('./models/order-item');

const app = express();

const error404 = require('./controllers/404');


app.set('view engine', 'ejs');
app.set('views', 'views');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

/* db.execute('SELECT * FROM products')
    .then( result => {
        console.log(result);
    }).catch(err => {
        console.log(err);
    }); */

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    User.findByPk(1).then(user => {
        req.user = user;
        next();
    }).catch(err => {
        console.log(err);
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(error404.get404);

Product.belongsTo(User, {constraints: true, onDelete: 'CASCADE'});
User.hasMany(Product);
User.hasOne(Cart);
Cart.belongsTo(User); 
Cart.belongsToMany(Product, {through: CartItem});
Product.belongsToMany(Cart, {through: CartItem}); 
Order.belongsTo(User);
User.hasMany(Order); 
Order.belongsToMany(Product, {through: OrderItem});

sequelize.sync({ force: true })
.then(result => {
    return User.findByPk(1);
    //console.log(result);    
    //app.listen(3000);
})
.then(user => {
    if(!user) {
       return User.create({name: 'Max', email: 'test@test.com'});
    }
    return user;
})
.then(user => {
    return user.createCart();
    //console.log(user);
}).then(cart => {
    app.listen(3000);
})
.catch(err => {
    console.log(err);
});

