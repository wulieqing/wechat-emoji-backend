const config = require('../config');
const shareService = require('../services/shareService');

function parseJsonSafe(value, defaultValue) {
  if (!value) {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('[EmojiController] Failed to parse JSON value:', {
      message: error.message,
    });
    return defaultValue;
  }
}

class EmojiController {
  async getRecommendEmojis(req, res) {
    try {
      // 获取环境变量中的推荐表情
      const configEmojis = parseJsonSafe(config.recommendEmoji, []);
      
      // 获取当天用户分享的表情
      const userShares = await shareService.getTodayShares();
      // 使用解码后的fileId（originalFileId）
      const userEmojis = userShares.map(share => share.originalFileId || share.fileId);
      
      // 合并数据，去重
      const combinedEmojis = [...new Set([...configEmojis, ...userEmojis])];
      
      res.json({
        code: 0,
        data: combinedEmojis,
      });
    } catch (error) {
      console.error('[EmojiController] Failed to get recommend emojis:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
      });
    }
  }

  async getGallery(req, res) {
    try {
      const data = parseJsonSafe(config.gallery, []);
      res.json({
        code: 0,
        data,
      });
    } catch (error) {
      console.error('[EmojiController] Failed to get gallery:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
      });
    }
  }

  async addShare(req, res) {
    try {
      const { fileId } = req.body;
      
      if (!fileId) {
        return res.status(400).json({
          code: 400,
          message: 'fileId is required',
        });
      }

      const result = await shareService.addShare(fileId);
      res.json({
        code: 0,
        data: result,
      });
    } catch (error) {
      console.error('[EmojiController] Failed to add share:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
      });
    }
  }

  async removeShare(req, res) {
    try {
      const { fileId } = req.query;
      
      if (!fileId) {
        return res.status(400).json({
          code: 400,
          message: 'fileId is required',
        });
      }

      const result = await shareService.removeShare(fileId);
      res.json({
        code: 0,
        data: result,
      });
    } catch (error) {
      console.error('[EmojiController] Failed to remove share:', {
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        code: 500,
        message: 'Internal server error',
      });
    }
  }

  async getShareStatus(req, res) {
    try {
      const { fileId } = req.query;
      
      if (!fileId) {
        return res.status(400).json({
          code: 400,
          message: 'fileId is required',
        });
      }

      const result = await shareService.getShareStatus(fileId);
      res.json({
        code: 0,
        data: !!result,
      });
    } catch (error) {
      console.error('[EmojiController] Failed to get share status:', {
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

module.exports = new EmojiController();

