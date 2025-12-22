const config = require('../config');

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
      const data = parseJsonSafe(config.recommendEmoji, []);
      res.json({
        code: 0,
        data,
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
}

module.exports = new EmojiController();

