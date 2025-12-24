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
      const { ToUserName, FromUserName, CreateTime, MsgType, Event } = req.body;
      console.log('Message received:', req.body);

      // 处理关注事件
      if (MsgType === 'event' && Event === 'subscribe') {
        console.log('Processing subscribe event for user:', FromUserName);
        
        // 直接返回欢迎消息
        const welcomeMessage = {
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: '感谢您的关注！发送表情即可下载表情图片哦～'
        };
        
        res.json(welcomeMessage);
        return;
      }

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

