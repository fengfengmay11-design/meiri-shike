// app.js
// 全局状态：是否启用了云开发（接入 AI 大模型需要）
App({
  globalData: {
    // 设为 true 表示已开通云开发并部署了 generateMeal 云函数，推荐页会优先走 AI
    cloudReady: false,
    // 云开发环境 ID，开通云开发后在微信开发者工具里查看并填入
    cloudEnv: ''
  },

  onLaunch() {
    // 若要启用 AI 推荐，取消下面这段注释并填入真实环境 ID：
    // if (wx.cloud) {
    //   wx.cloud.init({ env: this.globalData.cloudEnv, traceUser: true });
    //   this.globalData.cloudReady = true;
    // }
  }
});
