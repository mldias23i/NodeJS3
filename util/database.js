const mongodb = require('mongodb');

const MongoClient = mongodb.MongoClient;

let _db;

//Connecting to database mongoDb
const mongoConnect = (callback) => {
    MongoClient.connect('mongodb+srv://mdias23i:W5EpVmfOFwAgkCYJ@cluster0.och8axc.mongodb.net/shop?retryWrites=true&w=majority').then(client => {
        console.log('Connected!');
        _db = client.db();
        callback();
    }).catch(err => {
        console.log(err);
        throw err;
    });
};

//Getting database
const getDb = () => {
    if(_db) {
        return _db;
    }
    throw 'No database found!';
};

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
