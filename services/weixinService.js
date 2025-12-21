const axios = require('axios');
const config = require('../config');
const COS = require('cos-nodejs-sdk-v5');
const { PassThrough } = require('stream');

class WeixinService {
  constructor() {
    this.config = config.weixin;
    this.cosConfig = config.cos;
    this.cos = null;
    // 在构造函数中启动异步初始化，但不等待其完成
    this.initCos().catch((err) => {
      console.error('Failed to initialize COS SDK in constructor:', err.message);
    });
  }

  /**
   * 初始化COS SDK
   */
  async initCos() {
    try {
      // 使用获取到的临时密钥初始化COS SDK
      this.cos = new COS({
        getAuthorization: async (options, callback) => {
          // 调用微信云托管的授权接口获取临时密钥
          const res = await axios.get('http://api.weixin.qq.com/_/cos/getauth');
          const info = res.data;
          console.log('COS Authorization Info:', info);
          // 直接使用已获取的临时密钥
          const auth = {
            TmpSecretId: info.TmpSecretId,
            TmpSecretKey: info.TmpSecretKey,
            SecurityToken: info.Token,
            ExpiredTime: info.ExpiredTime,
          };
          callback(auth);
        },
      });
      console.log('COS SDK initialized successfully');
    } catch (e) {
      console.error('Failed to initialize COS SDK:', e.message);
      this.cos = null;
    }
  }

  /**
   * 发送消息给用户
   * @param {string} toUserName - 用户的fakeid
   * @param {Array} messages - 要发送的消息数组
   * @returns {Promise<void>}
   */
  /**
   * 下载图片到临时文件
   * @param {Object} message - 消息对象，包含msgId
   * @returns {Promise<Object>} - 包含图片流和contentType的对象
   */
  async downloadImage(message) {
    try {
      // 创建一个PassThrough流作为中间缓冲
      const stream = new PassThrough();
      // 使用axios发送流式请求，将参数放在params选项中
      const response = await axios({
        method: 'get',
        url: message.download_url,
        responseType: 'stream',
        timeout: 30000, // 设置超时时间
        withCredentials: true, // 启用cookie支持，允许携带跨域cookie
        headers: {
          // 从配置中获取cookie
          Cookie: this.config.cookie || '',
        },
      });
      // 构建完整URL用于日志输出
      console.log('downloadImage 111', message.download_url, response.data);
      // 将响应流通过PassThrough流返回
      response.data.pipe(stream);

      // 监听错误事件
      response.data.on('error', (error) => {
        console.error('Error in response stream:', error.message);
        stream.destroy(error);
      });

      // 返回流和contentType信息
      return {
        stream,
        contentType: response.headers['content-type'] || 'image/jpeg',
      };
    } catch (error) {
      console.error('Failed to download image:', error.message);
      throw error;
    }
  }

  /**
   * 上传图片到对象存储（流式上传）
   * @param {stream.Readable} imageStream - 图片流
   * @param {string} originalUrl - 原始图片URL
   * @returns {Promise<string>} - 对象存储返回的URL
   */
  async uploadToCos(imageStreamObj, originalUrl) {
    const { bucket, region } = this.cosConfig;
    if (!bucket || !region) {
      console.error('COS_BUCKET or COS_REGION not set');
      return originalUrl;
    }

    // 从contentType获取扩展名，这比从URL解析更可靠
    const contentType = imageStreamObj.contentType || 'image/jpeg';
    let fileExtension = 'jpg'; // 默认扩展名

    // 从contentType映射到扩展名
    const contentTypeToExtension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    // 查找对应的扩展名
    if (contentTypeToExtension[contentType]) {
      fileExtension = contentTypeToExtension[contentType];
    }

    // 生成唯一的文件名
    const fileName = `emoji/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}.${fileExtension}`;

    // 获取文件元数据 - 管理端openid为空
    const metaData = await this.getFileMetaData('', bucket, fileName);
    if (
      !metaData ||
        !metaData.respdata ||
        !metaData.respdata.x_cos_meta_field_strs
    ) {
      console.error('Failed to get file metadata:', metaData);
      return originalUrl;
    }

    // 使用COS SDK上传文件（支持流式上传）
    console.log('[UploadToCos] Starting upload:', {
      bucket,
      region,
      fileName,
      contentType,
      fileExtension,
      metaFileId: metaData.respdata.x_cos_meta_field_strs[0],
    });

    const uploadResult = await new Promise((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: bucket,
          Region: region,
          Key: fileName,
          StorageClass: 'STANDARD',
          Body: imageStreamObj.stream, // 使用对象中的stream
          ContentType: contentType, // 使用从响应中获取的contentType
          Headers: {
            'x-cos-meta-fileid': metaData.respdata.x_cos_meta_field_strs[0],
          },
        },
        (err, data) => {
          if (err) {
            console.error('[UploadToCos] Upload error callback:', {
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
      // const cosUrl = `https://${bucket}.cos.${region}.myqcloud.com/${fileName}`;
      // console.log('[UploadToCos] Upload successful, URL:', cosUrl);
      // return cosUrl;
      // return uploadResult.Location;
      return `${bucket}/${fileName}`;
    } else {
      console.error('[UploadToCos] Upload failed:', {
        statusCode: uploadResult?.statusCode,
        statusMessage: uploadResult?.statusMessage,
        error: uploadResult?.error,
        fullResult: uploadResult,
      });
      throw new Error('COS upload failed');
    }
    
  }

  /**
   * 获取文件元数据
   * @param {string} openid - 用户openid，这里使用anonymous
   * @param {string} bucket - 存储桶名称
   * @param {string} path - 文件路径
   * @returns {Promise<Object|null>} 元数据对象
   */
  async getFileMetaData(openid, bucket, path) {
    try {
      // 严格按照参考文件使用正确的请求路径和参数格式
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
        }
      );
      console.log('getFileMetaData response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get file metadata:', error.message);
      return null;
    }
  }

  /**
   * 获取文件内容类型
   * @param {string} extension - 文件扩展名
   * @returns {string} - 内容类型
   */
  getContentType(extension) {
    const contentTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return contentTypeMap[extension.toLowerCase()] || 'image/jpeg';
  }

  async sendMessage(toUserName, messages) {
    try {
      const { token, cookie, fingerprint, referer, baseUrl } = this.config;

      console.log('[SendMessage] Starting to send message to user:', toUserName);

      if (!token) {
        console.error('[SendMessage] WEIXIN_TOKEN not set, cannot send message');
        return;
      }

      if (!messages || messages.length === 0) {
        console.warn('[SendMessage] No messages to send');
        return;
      }

      // 只处理第一条消息
      const msg = messages[0];
      console.log('[SendMessage] Processing first message:', {
        msgId: msg.id,
        nickName: msg.nick_name,
        type: msg.type,
      });

      // 下载图片并上传到对象存储（使用流处理）
      let imageUrl = msg.image_url;
      let location = '';
      let imageStreamObj = null;
      try {
        console.log('[SendMessage] Starting to download image from:', msg.download_url);
        imageStreamObj = await this.downloadImage(msg); // 传入msg对象，包含msgId信息
        console.log('[SendMessage] Image downloaded successfully, uploading to COS...');
        location = await this.uploadToCos(imageStreamObj, imageUrl);
        console.log('[SendMessage] Image uploaded to COS:', location);
      } catch (error) {
        console.error('[SendMessage] Failed to process image:', error.message);
        // 确保在错误时销毁流以避免内存泄漏
        if (
          imageStreamObj &&
          imageStreamObj.stream &&
          typeof imageStreamObj.stream.destroy === 'function'
        ) {
          imageStreamObj.stream.destroy();
        }
      }
      const formData = new URLSearchParams();
      formData.append('tofakeid', toUserName);
      formData.append('type', '1'); // 1 为富文本消息
      formData.append('token', token);
      formData.append('lang', 'zh_CN');
      formData.append('f', 'json');
      formData.append('ajax', '1');
      const { miniprogram } = this.config;
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

      console.log('[SendMessage] Prepared request:', {
        url: `${baseUrl.singlesend}?t=ajax-response&f=json`,
        toUserName,
        hasToken: !!token,
        hasCookie: !!cookie,
        hasFingerprint: !!fingerprint,
        contentLength: messageContent.length,
        messageContent
      });

      const response = await axios.post(
        `${baseUrl.singlesend}?t=ajax-response&f=json`,
        formData,
        { headers }
      );

      console.log('[SendMessage] Message sent successfully:', {
        statusCode: response.status,
        statusText: response.statusText,
        responseData: response.data,
      });
    } catch (error) {
      console.error('[SendMessage] Failed to send message:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });
      throw error;
    }
  }
}

module.exports = new WeixinService();