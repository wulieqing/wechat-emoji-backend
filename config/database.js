const { Sequelize } = require('sequelize');
const config = require('./index');

const { username, password, address, database, dialect } = config.database;

// 解析地址和端口
const [host, port] = address.split(':');

// 创建数据库连接实例
const sequelize = new Sequelize(database, username, password, {
  host,
  port: port || 3306,
  dialect,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;

