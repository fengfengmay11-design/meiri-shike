// app.js
// 路 B 方案：AI 由小程序前端直连混元（utils/hunyuan.js），不依赖云开发。
// 若要切回云函数方案（路 A），在 utils/aiConfig.js 把 AI_API_KEY 留空，
// 并恢复下方 wx.cloud.init + 云函数部署即可。
App({
  globalData: {
    // 当前用路 B：前端直连，无需云开发
    useCloud: false
  },

  onLaunch() {
    // 路 B 不需要云开发初始化；如切回路 A，取消下面注释并填真实环境 ID：
    // if (wx.cloud) {
    //   wx.cloud.init({ env: '你的环境ID', traceUser: true });
    // }
  }
});
