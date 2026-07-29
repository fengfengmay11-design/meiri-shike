// utils/aiConfig.js
// 前端直连大模型的配置（路 B：不走云函数，0 成本）。
//
// ⚠️ 安全说明：小程序前端代码可被反编译，Key 会暴露。
//    这是个人/演示项目的取舍——Key 随时可在腾讯云后台吊销重发。
//    正式生产环境请改回云函数方案（Key 存云端环境变量）。
//
// 想关闭真 AI、退回本地规则：把 AI_API_KEY 改成空字符串 '' 即可。

module.exports = {
  AI_API_KEY: '',
  AI_BASE_URL: 'https://tokenhub.tencentmaas.com/v1',
  AI_MODEL: 'hy3-preview',
  // 思考型模型响应慢，前端超时设长一点
  TIMEOUT: 60000
};
