// 加载环境变量（必须在其他模块之前加载）
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./config/routes');
const { init: initDB } = require('./models');
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');
const shareService = require('./services/shareService');

// 创建Express应用
const app = express();

// 中间件配置
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(morgan(config.logger.format));

// 注册路由
app.use(routes);

// 错误处理中间件（必须在路由之后）
app.use(notFoundHandler);
app.use(globalErrorHandler);

// 应用初始化
async function bootstrap() {
  try {
    // 初始化数据库
  await initDB();

    // 启动分享服务清理任务
  shareService.startCleanupSchedule();

    // 启动服务器
    const port = config.server.port;
  app.listen(port, () => {
      console.log(`[Bootstrap] Server started successfully on port ${port}`);
  });
  } catch (error) {
    console.error('[Bootstrap] Failed to start application:', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// 启动应用
bootstrap();
