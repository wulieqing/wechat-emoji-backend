/**
 * 全局错误处理中间件
 * 统一处理应用中的错误
 */

/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function globalErrorHandler(err, req, res, next) {
  console.error('[ErrorHandler] Global error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // 设置默认状态码和错误消息
  let statusCode = 500;
  let message = 'Internal Server Error';

  // 根据错误类型设置不同的状态码和消息
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message || message;
  }

  // 返回JSON格式的错误响应
  res.status(statusCode).json({
    code: statusCode,
    message: process.env.NODE_ENV === 'production' ? message : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404错误处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.name = 'NotFoundError';
  error.statusCode = 404;
  next(error);
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
};

