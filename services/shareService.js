const fs = require('fs').promises;
const path = require('path');

/**
 * 用户分享服务类
 * 处理用户分享表情的存储、查询和清理
 */
class ShareService {
  constructor() {
    this.shareDir = path.join(__dirname, '../data/shares');
    this.init();
  }

  /**
   * 初始化服务，确保数据目录存在
   */
  async init() {
    try {
      await fs.mkdir(this.shareDir, { recursive: true });
      console.log('[ShareService] Share data directory initialized');
    } catch (error) {
      console.error('[ShareService] Failed to initialize share directory:', error.message);
    }
  }

  /**
   * 获取当天日期字符串（格式：YYYY-MM-DD）
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 获取当天分享文件的路径
   */
  getTodayShareFile() {
    const today = this.getTodayDate();
    return path.join(this.shareDir, `${today}.json`);
  }

  /**
   * 加载当天的分享数据
   */
  async loadTodayShares() {
    try {
      const filePath = this.getTodayShareFile();
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // 文件不存在或格式错误，返回空数组
      return [];
    }
  }

  /**
   * 保存分享数据到当天文件
   */
  async saveTodayShares(shares) {
    try {
      const filePath = this.getTodayShareFile();
      await fs.writeFile(filePath, JSON.stringify(shares, null, 2));
    } catch (error) {
      console.error('[ShareService] Failed to save shares:', error.message);
      throw error;
    }
  }

  /**
   * 添加分享（自动去重）
   */
  async addShare(fileId) {
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('Invalid fileId');
    }

    // fileId已经编码，直接使用
    const shares = await this.loadTodayShares();
    
    // 检查是否已存在
    const exists = shares.some(share => share.fileId === fileId);
    if (exists) {
      return { success: true, message: 'Already shared today' };
    }

    // 添加新分享（放在队头，保存解码后的fileId）
    shares.unshift({
      fileId,
      timestamp: new Date().toISOString()
    });

    await this.saveTodayShares(shares);
    return { success: true, message: 'Share added successfully' };
  }

  /**
   * 取消分享
   */
  async removeShare(fileId) {
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('Invalid fileId');
    }

    // fileId已经编码，直接使用
    const shares = await this.loadTodayShares();
    const initialLength = shares.length;
    
    // 过滤掉指定的fileId
    const filteredShares = shares.filter(share => share.fileId !== fileId);
    
    if (filteredShares.length === initialLength) {
      return { success: false, message: 'Share not found' };
    }

    await this.saveTodayShares(filteredShares);
    return { success: true, message: 'Share removed successfully' };
  }

  /**
   * 查询分享状态
   */
  async getShareStatus(fileId) {
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('Invalid fileId');
    }

    const shares = await this.loadTodayShares();
    // 检查是否已存在
    const exists = shares.some(share => share.fileId === fileId);
    console.log(`[ShareService] Share status for fileId ${fileId}: ${exists}`, shares);
    return exists;
  }

  /**
   * 获取当天所有分享
   */
  async getTodayShares() {
    return await this.loadTodayShares();
  }

  /**
   * 清理过期分享文件（保留当天的）
   */
  async cleanupOldShares() {
    try {
      const files = await fs.readdir(this.shareDir);
      const today = this.getTodayDate();
      console.log(`[ShareService] Cleaning up old share files, today is ${today}`);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const fileDate = file.replace('.json', '');
          if (fileDate !== today) {
            const filePath = path.join(this.shareDir, file);
            console.log(`[ShareService] Found old share file: ${fileDate}`);
            await fs.unlink(filePath);
            console.log(`[ShareService] Cleaned up old share file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('[ShareService] Failed to cleanup old shares:', error.message);
    }
  }

  /**
   * 启动定时清理任务（每天凌晨执行）
   */
  startCleanupSchedule() {
    // 计算到明天凌晨的时间
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // 设置定时器，在明天凌晨执行清理
    setTimeout(() => {
      this.cleanupOldShares();
      // 设置每天执行的定时器
      setInterval(() => {
        this.cleanupOldShares();
      }, 24 * 60 * 60 * 1000); // 24小时
    }, timeUntilMidnight);
    
    console.log('[ShareService] Cleanup schedule started');
  }
}

module.exports = new ShareService();