const axios = require('axios');
const { PassThrough } = require('stream');
const config = require('../config');
const COS = require('cos-nodejs-sdk-v5');

/**
 * 微信服务类
 * 处理微信相关业务逻辑，包括图片下载、上传到COS、发送消息等
 */
class WeixinService {
  constructor() {
    this.config = config.weixin;
    this.cosConfig = config.cos;
    this.cos = null;
    // 异步初始化COS，不阻塞构造函数
    this.initCos().catch((err) => {
      console.error('[WeixinService] Failed to initialize COS SDK:', err.message);
    });
  }

  /**
   * 初始化COS SDK
   */
  async initCos() {
    try {
      this.cos = new COS({
        getAuthorization: async (options, callback) => {
          try {
            // 调用微信云托管的授权接口获取临时密钥
            const res = await axios.get('http://api.weixin.qq.com/_/cos/getauth', {
              timeout: 10000,
            });
            const info = res.data;
            console.log('[WeixinService] COS Authorization Info retrieved');
            
            const auth = {
              TmpSecretId: info.TmpSecretId,
              TmpSecretKey: info.TmpSecretKey,
              SecurityToken: info.Token,
              ExpiredTime: info.ExpiredTime,
            };
            callback(auth);
          } catch (error) {
            console.error('[WeixinService] Failed to get COS authorization:', error.message);
            callback(new Error('Failed to get COS authorization'));
          }
        },
      });
      console.log('[WeixinService] COS SDK initialized successfully');
    } catch (error) {
      console.error('[WeixinService] Failed to initialize COS SDK:', error.message);
      this.cos = null;
    }
  }

  /**
   * 下载图片到流
   * @param {Object} message - 消息对象，包含download_url
   * @returns {Promise<Object>} 包含图片流和contentType的对象
   */
  async downloadImage(message) {
    try {
      const stream = new PassThrough();
      
      const response = await axios({
        method: 'get',
        url: message.download_url,
        responseType: 'stream',
        timeout: 30000,
        withCredentials: true,
        headers: {
          Cookie: this.config.cookie || '',
        },
      });

      console.log('[WeixinService] Image download started:', message.download_url);

      // 将响应流通过PassThrough流返回
      response.data.pipe(stream);

      // 监听错误事件
      response.data.on('error', (error) => {
        console.error('[WeixinService] Error in response stream:', error.message);
        stream.destroy(error);
      });

      return {
        stream,
        contentType: response.headers['content-type'] || 'image/jpeg',
      };
    } catch (error) {
      console.error('[WeixinService] Failed to download image:', {
        message: error.message,
        statusCode: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * 上传图片到对象存储（流式上传）
   * @param {Object} imageStreamObj - 包含stream和contentType的对象
   * @param {string} originalUrl - 原始图片URL
   * @returns {Promise<string>} 对象存储返回的路径
   */
  async uploadToCos(imageStreamObj, originalUrl) {
    const { bucket, region } = this.cosConfig;
    
    if (!bucket || !region) {
      console.error('[WeixinService] COS_BUCKET or COS_REGION not set');
      return originalUrl;
    }

    if (!this.cos) {
      console.error('[WeixinService] COS SDK not initialized');
      return originalUrl;
    }

    // 从contentType获取扩展名
    const contentType = imageStreamObj.contentType || 'image/jpeg';
    const contentTypeToExtension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    const fileExtension = contentTypeToExtension[contentType] || 'jpg';

    // 生成唯一的文件名
    const fileName = `emoji/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExtension}`;

    try {
      // 获取文件元数据
      const metaData = await this.getFileMetaData('', bucket, fileName);
      
      if (!metaData?.respdata?.x_cos_meta_field_strs?.[0]) {
        console.error('[WeixinService] Failed to get file metadata:', metaData);
        return originalUrl;
      }

      const metaFileId = metaData.respdata.x_cos_meta_field_strs[0];

      console.log('[WeixinService] Starting COS upload:', {
        bucket,
        region,
        fileName,
        contentType,
        fileExtension,
        metaFileId,
      });

      // 使用Promise包装COS上传
      const uploadResult = await new Promise((resolve, reject) => {
        this.cos.putObject(
          {
            Bucket: bucket,
            Region: region,
            Key: fileName,
            StorageClass: 'STANDARD',
            Body: imageStreamObj.stream,
            ContentType: contentType,
            Headers: {
              'x-cos-meta-fileid': metaFileId,
            },
          },
          (err, data) => {
            if (err) {
              console.error('[WeixinService] COS upload error:', {
                message: err.message,
                code: err.code,
                statusCode: err.statusCode,
              });
              reject(err);
            } else {
              resolve(data);
            }
          }
        );
      });

      if (uploadResult && uploadResult.statusCode === 200) {
        console.log('[WeixinService] COS upload successful:', `${bucket}/${fileName}`);
        return `${bucket}/${fileName}`;
      } else {
        throw new Error('COS upload failed: invalid response');
      }
    } catch (error) {
      console.error('[WeixinService] Failed to upload to COS:', {
        message: error.message,
        fileName,
      });
      // 确保流被销毁，避免内存泄漏
      if (imageStreamObj.stream && typeof imageStreamObj.stream.destroy === 'function') {
        imageStreamObj.stream.destroy();
      }
      throw error;
    }
  }

  /**
   * 获取文件元数据
   * @param {string} openid - 用户openid，这里使用空字符串
   * @param {string} bucket - 存储桶名称
   * @param {string} path - 文件路径
   * @returns {Promise<Object|null>} 元数据对象
   */
  async getFileMetaData(openid, bucket, path) {
    try {
      const response = await axios.post(
        'http://api.weixin.qq.com/_/cos/metaid/encode',
        {
          openid: openid,
          bucket: bucket,
          paths: [path],
        },
        {
          headers: {
            'content-type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('[WeixinService] Failed to get file metadata:', {
        message: error.message,
        statusCode: error.response?.status,
      });
      return null;
    }
  }

  /**
   * 发送消息给用户
   * @param {string} toUserName - 用户的fakeid
   * @param {Array} messages - 要发送的消息数组
   * @returns {Promise<void>}
   */
  async sendMessage(toUserName, messages) {
    try {
      const { token, cookie, fingerprint, referer, baseUrl, miniprogram } = this.config;

      console.log('[WeixinService] Starting to send message to user:', toUserName);

      if (!token) {
        console.error('[WeixinService] WEIXIN_TOKEN not set, cannot send message');
        return;
      }

      if (!messages || messages.length === 0) {
        console.warn('[WeixinService] No messages to send');
        return;
      }

      // 只处理第一条消息
      const msg = messages[0];
      console.log('[WeixinService] Processing first message:', {
        msgId: msg.id,
        nickName: msg.nick_name,
        type: msg.type,
      });

      // 下载图片并上传到对象存储（使用流处理）
      let imageStreamObj = null;
      let location = '';
      
      try {
        console.log('[WeixinService] Starting to download image from:', msg.download_url);
        imageStreamObj = await this.downloadImage(msg);
        console.log('[WeixinService] Image downloaded successfully, uploading to COS...');
        location = await this.uploadToCos(imageStreamObj, msg.download_url);
        console.log('[WeixinService] Image uploaded to COS:', location);
      } catch (error) {
        console.error('[WeixinService] Failed to process image:', error.message);
        // 确保在错误时销毁流以避免内存泄漏
        if (imageStreamObj?.stream && typeof imageStreamObj.stream.destroy === 'function') {
          imageStreamObj.stream.destroy();
        }
        // 图片处理失败时，仍然尝试发送消息（使用原始URL）
        location = msg.download_url;
      }

      // 构建消息内容
      const formData = new URLSearchParams();
      formData.append('tofakeid', toUserName);
      formData.append('type', '1'); // 1 为富文本消息
      formData.append('token', token);
      formData.append('lang', 'zh_CN');
      formData.append('f', 'json');
      formData.append('ajax', '1');
      
      const messageContent = `表情处理完成： <a data-miniprogram-appid="${miniprogram.appid}" data-miniprogram-path="${miniprogram.pagepath}?fileId=${encodeURIComponent(location)}">查看详情</a>`;
      formData.append('content', messageContent);

      if (fingerprint) {
        formData.append('fingerprint', fingerprint);
      }

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: referer,
      };

      if (cookie) {
        headers['Cookie'] = cookie;
      }

      console.log('[WeixinService] Prepared request:', {
        url: `${baseUrl.singlesend}?t=ajax-response&f=json`,
        toUserName,
        hasToken: !!token,
        hasCookie: !!cookie,
        hasFingerprint: !!fingerprint,
        contentLength: messageContent.length,
      });

      const response = await axios.post(
        `${baseUrl.singlesend}?t=ajax-response&f=json`,
        formData.toString(),
        { 
          headers,
          timeout: 30000,
        }
      );

      console.log('[WeixinService] Message sent successfully:', {
        statusCode: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      console.error('[WeixinService] Failed to send message:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw error;
    }
  }
}

module.exports = new WeixinService();

