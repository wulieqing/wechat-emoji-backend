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
      console.log('Message received:', req.body);

      // 先立即返回 success 给微信服务器，避免超时
      res.send('success');

      // 后台异步触发爬虫，不阻塞主流程
      setTimeout(() => {
        scraperService
          .handleScrapeTask(FromUserName, CreateTime)
          .catch((error) => console.error('Background task failed:', error));
      }, 0);
    } catch (error) {
      console.error('Failed to handle message:', error);
      res.send('success'); 
    }
  }
}

module.exports = new MessageController();

