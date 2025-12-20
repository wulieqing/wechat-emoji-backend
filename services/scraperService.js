const axios = require('axios');
const config = require('../config');

/**
 * 爬虫服务类
 * 处理微信消息爬取相关业务逻辑
 */
class ScraperService {
  constructor() {
    this.config = config.weixin;
    // 使用 Map 替代普通对象，性能更好
    this.userMessageCache = new Map();
  }

  /**
   * 单次获取消息
   * @param {Object} inputParams - 输入参数
   * @param {string} cookie - 微信cookie
   * @returns {Promise<Object>} 返回获取到的数据
   */
  async fetchLatest(inputParams, cookie) {
    const { baseUrl } = this.config;

    const params = {
      action: 'sync',
      f: 'json',
      ajax: 1,
      lang: 'zh_CN',
      ...inputParams,
    };

    const requestConfig = {
      params,
      timeout: 10000,
      headers: {},
    };

    if (cookie) {
      requestConfig.headers['Cookie'] = cookie;
    }

    try {
      const resp = await axios.get(baseUrl.singlesendpage, requestConfig);
      return resp.data;
    } catch (error) {
      console.error('[ScraperService] Fetch error:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * 获取第一条消息
   * @param {Object} scrapeParams - 爬虫参数
   * @param {string} cookie - 微信cookie
   * @returns {Promise<Object|null>} 返回第一条消息
   */
  async fetchLastMessage(scrapeParams, cookie) {
    try {
      // 添加 action:index 参数，一次性获取第一条消息
      const params = { ...scrapeParams, action: 'index' };

      console.log('[ScraperService] Fetching first message with params:', {
        action: params.action,
        tofakeid: params.tofakeid,
        createtime: params.createtime,
      });

      const data = await this.fetchLatest(params, cookie);

      if (!data || data.base_resp?.ret !== 0) {
        console.error('[ScraperService] Invalid response or error ret code:', data.base_resp?.ret);
        return null;
      }

      // 提取用户标识和消息列表
      const identityOpenId = data.page_info?.identity_open_id;
      const msgItems = data.page_info?.msg_items?.msg_item || [];

      if (msgItems.length === 0) {
        console.log('[ScraperService] No messages available');
        return null;
      }

      // 获取第一条消息
      const firstMsg = msgItems[0];
      console.log('[ScraperService] Got first message:', {
        msgId: firstMsg.id,
        nickName: firstMsg.nick_name,
        type: firstMsg.type,
      });

      // 缓存该消息的 ID，key为 identity_open_id
      if (identityOpenId && firstMsg.id) {
        this.userMessageCache.set(identityOpenId, firstMsg.id);
        console.log(`[ScraperService] Cached msgId for user ${identityOpenId}: ${firstMsg.id}`);
      }

      return firstMsg;
    } catch (error) {
      console.error('[ScraperService] Fetch message error:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * 获取缓存的用户消息ID
   * @param {string} identityOpenId - 用户标识
   * @returns {string|null} 缓存的 lastmsgid 或 null
   */
  getCachedMessageId(identityOpenId) {
    return this.userMessageCache.get(identityOpenId) || null;
  }

  /**
   * 构建下载URL
   * @param {string} msgId - 消息ID
   * @param {string} token - 微信token
   * @returns {string} 构建的下载URL
   */
  buildDownloadUrl(msgId, token) {
    const { baseUrl } = this.config;

    const params = new URLSearchParams({
      msgid: msgId,
      token: token,
      lang: 'zh_CN',
    });

    return `${baseUrl.downloadfile}?${params.toString()}`;
  }

  /**
   * 构建单条消息对象
   * @param {Object} msg - 消息对象
   * @param {string} token - 微信token
   * @param {string} toFakeId - 收信人fakeid
   * @returns {Object|null} 构建的消息对象
   */
  createMessage(msg, token, toFakeId = '') {
    if (!msg) {
      return null;
    }

    const downloadUrl = this.buildDownloadUrl(msg.id, token);
    return {
      id: msg.id,
      id_64bit: msg.id_64bit,
      nick_name: msg.nick_name,
      date_time: msg.date_time,
      type: msg.type,
      download_url: downloadUrl,
      small_headimg_url: msg.small_headimg_url,
    };
  }

  /**
   * 处理消息爬虫任务
   * @param {string} fromUserName - 用户的fakeid
   * @param {string} createTime - 创建时间
   * @param {string} identityOpenId - 用户标识（可选）
   * @returns {Promise<void>}
   */
  async handleScrapeTask(fromUserName, createTime, identityOpenId = null) {
    try {
      const { token, cookie, fingerprint } = this.config;
      const weixinService = require('./weixinService');

      const scrapeParams = {
        tofakeid: fromUserName,
        lastmsgfromfakeid: fromUserName,
        createtime: createTime,
        token,
      };

      // 如果提供了 identityOpenId，检查缓存中是否有该用户的 lastmsgid
      if (identityOpenId) {
        const cachedLastMsgId = this.getCachedMessageId(identityOpenId);
        if (cachedLastMsgId) {
          scrapeParams.lastmsgid = cachedLastMsgId;
          console.log(`[ScraperService] Using cached lastmsgid for ${identityOpenId}: ${cachedLastMsgId}`);
        }
      }

      if (fingerprint) {
        scrapeParams.fingerprint = fingerprint;
      }

      // 获取最后一条消息
      const lastMsg = await this.fetchLastMessage(scrapeParams, cookie);

      console.log('[ScraperService] Background fetch completed.', lastMsg);

      if (lastMsg) {
        // 构建消息对象
        const message = this.createMessage(lastMsg, token, fromUserName);

        // 发送消息给用户
        await weixinService.sendMessage(fromUserName, [message]);
      }
    } catch (error) {
      console.error('[ScraperService] Background fetch failed:', {
        message: error.message,
        code: error.code,
      });
      throw error;
    }
  }
}

module.exports = new ScraperService();

