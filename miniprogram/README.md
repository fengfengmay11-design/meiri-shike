# 今天吃什么 · 饭点选餐不纠结小程序

解决饭点选餐纠结症。三个界面：

1. **推荐**：选当下状态（健身减脂/增肌、学习备考、疾病修养、正常…）→ 一键生成 3 种不同风味餐食，每餐标注能量(kcal)，不满意可「换一批」。基于「我的」里设置的偏好与忌口。
2. **健康**：当日日期/步数/目标步数进度/能量消耗；当月日历，点某日弹出当日详情（步数、体重、餐食照片上传与滑动查看）。
3. **我的**：设置偏好（菜系/主食/水果）与忌口（口味/蔬菜/水果）。

## 目录结构

```
what-to-eat-miniprogram/
├── app.js / app.json / app.wxss      全局配置与样式、tabBar
├── project.config.json / sitemap.json
├── pages/
│   ├── recommend/   界面1 推荐
│   ├── health/      界面2 健康
│   └── profile/     界面3 我的
├── utils/
│   ├── recipes.js        内置菜谱库
│   ├── storage.js        偏好/状态/每日记录本地存储封装
│   └── mealGenerator.js  本地规则推荐生成器（AI 兜底）
└── cloudfunctions/
    └── generateMeal/     云函数：接大模型生成推荐（可选）
```

## 快速预览（无需后端）

用**微信开发者工具**导入 `what-to-eat-miniprogram` 目录即可运行（appid 选「测试号」或你自己的）。
默认走**本地规则生成**，打开「推荐」页会自动出 3 餐，立刻能看到效果，不需要任何后端配置。

> 想先在电脑浏览器里看三屏效果？工程同级目录有 `preview.html`（网页预览版），双击用浏览器打开即可，逻辑与小程序一致。

## 接入 AI 大模型（可选，推荐更灵活）

推荐页逻辑：已开通云开发且部署了 `generateMeal` 云函数 → 优先走 AI；否则自动回退本地规则。
接入步骤：

1. 微信开发者工具里对该项目**开通云开发**，记下环境 ID。
2. 右键 `cloudfunctions/generateMeal` → 上传并部署（云端安装）。
3. 在云函数「配置 → 环境变量」填入：
   - `AI_API_KEY`：你的模型 Key（必填）
   - `AI_BASE_URL`：兼容 OpenAI 的接口地址，默认腾讯混元 `https://api.hunyuan.cloud.tencent.com/v1`
   - `AI_MODEL`：模型名，默认 `hunyuan-turbo`（也可填 DeepSeek / 通义等兼容接口）
4. 打开 `app.js`，取消 `wx.cloud.init(...)` 那段注释，填入你的环境 ID，`globalData.cloudReady` 置为 `true`，重新编译即可。

云函数会要求模型返回结构化 JSON（风味、主食、菜、水果、能量、建议），前端直接渲染。

## 说明与可扩展点

- **步数/体重**为手动记录（H5/小程序无法直接读取手机健康数据；要真机自动同步需接入微信运动或健康 App，属于后续扩展）。
- **餐食照片**在演示中用临时路径；正式上线建议上传到云存储（`wx.cloud.uploadFile`）再保存 fileID。
- **状态/菜系/忌口**选项都在 `utils/mealGenerator.js`（状态能量区间）与 `pages/profile/profile.js`（选项列表）里，直接改数组即可增删。
- 推荐逻辑同时支持「本地规则」与「AI 生成」两套，互不冲突。

## 转成正式小程序上线

1. 微信公众平台注册小程序，拿到真实 AppID，替换 `project.config.json` 里的 `appid`。
2. 开通云开发并部署云函数（如上）。
3. 开发者工具「上传」代码，在平台提交审核发布。
