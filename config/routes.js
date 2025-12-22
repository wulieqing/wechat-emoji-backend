const express = require('express');
const path = require('path');

// 导入控制器
const messageController = require('../controllers/messageController');
const wxOpenIdController = require('../controllers/wxOpenIdController');
const emojiController = require('../controllers/emojiController');

// 创建路由实例
const router = express.Router();

// 首页路由
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// 消息相关路由
router.post('/api/msg', messageController.receiveMessage);

// 微信Open ID路由
router.get('/api/wx_openid', wxOpenIdController.getWxOpenId);

// 推荐表情和图片库路由（按模块增加前缀）
router.get('/api/emoji/recommend_emojis', emojiController.getRecommendEmojis);
router.get('/api/emoji/gallery', emojiController.getGallery);

module.exports = router;
