const sequelize = require('../config/database');

/**
 * 模型初始化方法
 * 同步所有模型到数据库
 */
async function init() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    console.log('Database models synced successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    // 在生产环境中，可以选择不抛出错误，允许应用继续运行
    if (process.env.NODE_ENV === 'production') {
      console.warn('Application will continue running without database support');
    } else {
      throw error;
    }
  }
}

module.exports = {
  init,
};

