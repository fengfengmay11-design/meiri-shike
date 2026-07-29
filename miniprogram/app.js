App({
  globalData: {
    useCloud: true
  },

  onLaunch() {
    // 使用小程序当前默认关联的云环境，不在前端写入环境 ID。
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true });
    }
  }
});
