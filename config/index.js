/**
 * 应用配置管理
 * 集中管理所有配置项，便于维护和扩展
 */
module.exports = {
  // 服务器配置
  server: { 
    port: process.env.PORT || 80,
  },

  // 数据库配置
  database: {
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    address: process.env.MYSQL_ADDRESS || '',
    // 支持通过环境变量 MYSQL_DATABASE 指定数据库名，若未设置则默认使用 nodejs_demo
    database: process.env.MYSQL_DATABASE || 'nodejs_demo',
    dialect: 'mysql',
  },

  // 微信配置
  weixin: {
    token: process.env.WEIXIN_TOKEN || '',
    cookie: process.env.WEIXIN_COOKIE || '',
    fingerprint: process.env.WEIXIN_FINGERPRINT || '',
    referer:
      process.env.WEIXIN_REFERER ||
      'https://mp.weixin.qq.com/cgi-bin/message?t=message/list&count=20&day=7&token=308664156&lang=zh_CN',
    baseUrl: {
      singlesend: 'https://mp.weixin.qq.com/cgi-bin/singlesend',
      singlesendpage: 'https://mp.weixin.qq.com/cgi-bin/singlesendpage',
      downloadfile: 'https://mp.weixin.qq.com/cgi-bin/downloadfile',
    },
    miniprogram: {
      appid: process.env.WEIXIN_MINIPROGRAM_APPID || '',
      pagepath: 'pages/emoji/index',
    },
  },

  // 日志配置
  logger: {
    format: process.env.LOG_FORMAT || 'tiny',
  },

  // 对象存储配置
  cos: {
    bucket: process.env.COS_BUCKET || '',
    region: process.env.COS_REGION || '',
  },
};

