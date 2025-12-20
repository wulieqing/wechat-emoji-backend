const scraperService = require('../services/scraperService');

/**
 * 消息控制器
 * 处理微信消息接收相关请求
 */
class MessageController {
  /**
   * 接收微信服务器推送的消息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @returns {Promise<void>}
   */
  async receiveMessage(req, res) {
    try {
      const { FromUserName, CreateTime } = req.body;
      console.log('[MessageController] Message received:', {
        FromUserName,
        CreateTime,
      });

      // 先立即返回 success 给微信服务器，避免超时
      res.send('success');

      // 后台异步触发爬虫，不阻塞主流程
      setImmediate(() => {
        scraperService
          .handleScrapeTask(FromUserName, CreateTime)
          .catch((error) => {
            console.error('[MessageController] Background task failed:', {
              message: error.message,
              FromUserName,
            });
          });
      });
    } catch (error) {
      console.error('[MessageController] Failed to handle message:', {
        message: error.message,
        stack: error.stack,
      });
      // 即使出错也返回success，避免微信服务器重试
      res.send('success');
    }
  }
}

module.exports = new MessageController();

