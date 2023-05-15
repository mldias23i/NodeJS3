const Sequelize = require('sequelize');

const sequelize = new Sequelize(
    'node-complete',
    'root',
    'MRetail23i!!!',
    {dialect: 'mysql', host: 'localhost'}
);

module.exports = sequelize;