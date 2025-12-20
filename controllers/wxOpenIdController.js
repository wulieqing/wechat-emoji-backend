/**
 * 微信OpenID控制器
 * 处理微信OpenID获取相关请求
 */
class WxOpenIdController {
  /**
   * 获取微信Open ID
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   * @returns {Promise<void>}
   */
  async getWxOpenId(req, res) {
    try {
      // 从请求头中获取微信Open ID
      const openId = req.headers['x-wx-openid'];

      if (!openId) {
        return res.status(400).json({
          code: 400,
          message: 'WeChat Open ID not found in headers',
        });
      }

      res.send(openId);
    } catch (error) {
      console.error('[WxOpenIdController] Failed to get WeChat Open ID:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
      });
    }
  }
}

module.exports = new WxOpenIdController();

