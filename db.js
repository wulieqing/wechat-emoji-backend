/**
 * 数据库模块（兼容旧代码）
 * 为了保持向后兼容，保留此文件
 * 实际使用 models/index.js 中的实现
 */
const { init } = require('./models');

module.exports = {
  init,
};
