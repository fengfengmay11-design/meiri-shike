// utils/aiConfig.js
// 前端直连混元（utils/hunyuan.js）所需的配置。
// 安全约定：密钥绝不硬编码，统一从环境变量 / 本地安全存储读取。
//   - Node 侧（云函数 / 构建脚本）：process.env.AI_API_KEY
//   - 小程序端：wx.getStorageSync('aiApiKey')（由用户在「我的」页填写，仅存本地）
// 未配置时 isEnabled() 返回 false，调用方自动回退到规则引擎 / 云函数。

function read(key) {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof wx !== 'undefined' && wx.getStorageSync) {
    const v = wx.getStorageSync(key.toLowerCase());
    if (v) return v;
  }
  return '';
}

module.exports = {
  // 腾讯混元 API Key（不入库，运行时注入）
  AI_API_KEY: read('AI_API_KEY'),
  // 混元 OpenAI 兼容端点
  AI_BASE_URL: read('AI_BASE_URL') || 'https://api.hunyuan.cloud.tencent.com/v1',
  // 模型名
  AI_MODEL: read('AI_MODEL') || 'hunyuan-turbo',
  // 请求超时(ms)
  TIMEOUT: 15000
};
