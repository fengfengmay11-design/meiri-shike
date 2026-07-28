// pages/profile/profile.js
const storage = require('../../utils/storage.js');
const nlParser = require('../../utils/nlParser.js');

const BLOCKS = [
  {
    key: 'prefer',
    title: '偏好',
    icon: '🍽️',
    groups: [
      { key: 'cuisine', label: '菜系', items: ['川', '粤', '家常', '日式', '西式', '轻食'] },
      { key: 'staple', label: '主食', items: ['米饭', '面', '杂粮', '薯类'] },
      { key: 'fruit', label: '水果', items: ['苹果', '香蕉', '橘子', '猕猴桃', '蓝莓', '草莓', '柚子', '雪梨'] }
    ]
  },
  {
    key: 'avoid',
    title: '忌口',
    icon: '🚫',
    groups: [
      { key: 'avoidTaste', label: '口味', items: ['辣', '油腻', '甜', '咸'] },
      { key: 'avoidVeg', label: '蔬菜', items: ['香菇', '香菜', '芹菜', '韭菜', '葱', '苦瓜', '茄子', '西兰花', '青椒'] },
      { key: 'avoidFruit', label: '水果', items: ['芒果', '菠萝', '榴莲', '荔枝', '桃子'] }
    ]
  }
];

Page({
  data: {
    blocks: BLOCKS,
    summaries: { prefer: [], avoid: [] },
    profile: {},
    sheetOpen: false,
    sheetKey: '',
    sheetTitle: '',
    sheetIcon: '',
    sheetGroups: [],
    recording: false,

    // 智能识别
    nlText: '',
    nlRecording: false,
    nlResult: ''
  },

  // 录音管理器（页面加载时初始化一次）
  recorderManager: null,

  onShow() {
    this.setData({ profile: storage.getProfile() });
    this.refreshSummaries();
    if (!this.recorderManager) {
      this.recorderManager = wx.getRecorderManager();
      var self = this;
      this.recorderManager.onStop(function (res) {
        self.setData({ recording: false });
        self.speechToText(res.tempFilePath);
      });
      this.recorderManager.onError(function (err) {
        self.setData({ recording: false });
        console.error('录音出错:', err);
        wx.showToast({ title: '录音失败，请重试', icon: 'none' });
      });
    }
  },

  refreshSummaries() {
    const self = this;
    const summaries = { prefer: [], avoid: [] };
    BLOCKS.forEach(function (b) {
      const sel = [];
      b.groups.forEach(function (g) {
        (self.data.profile[g.key] || []).forEach(function (v) { sel.push(v); });
      });
      summaries[b.key] = sel;
    });
    this.setData({ summaries: summaries });
  },

  openBlock(e) {
    const key = e.currentTarget.dataset.key;
    const block = BLOCKS.find(function (b) { return b.key === key; });
    this.setData({
      sheetOpen: true,
      sheetKey: key,
      sheetTitle: block.title,
      sheetIcon: block.icon,
      sheetGroups: block.groups,
      recording: false
    });
  },

  closeSheet() {
    this.setData({ sheetOpen: false, recording: false });
    this.refreshSummaries();
    storage.setProfile(this.data.profile);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  toggleInSheet(e) {
    const group = e.currentTarget.dataset.group;
    const val = e.currentTarget.dataset.val;
    const arr = (this.data.profile[group] || []).slice();
    const i = arr.indexOf(val);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(val);
    const patch = {};
    patch['profile.' + group] = arr;
    this.setData(patch);
  },

  // 自由输入：偏好框→customPrefer，忌口框→customAvoid
  onInputCustom(e) {
    const field = e.currentTarget.dataset.field;
    const key = field === 'prefer' ? 'customPrefer' : 'customAvoid';
    const patch = {};
    patch['profile.' + key] = e.detail.value;
    this.setData(patch);
  },

  // ====== 语音输入 ======
  startVoiceInput() {
    var self = this;
    this._voiceTarget = 'sheet'; // 识别结果进偏好/忌口自由填写框
    if (this.data.recording) {
      // 正在录音 → 停止
      this.recorderManager.stop();
      return;
    }

    // 开始录音
    this.setData({ recording: true });
    wx.showLoading({ title: '正在聆听…', mask: true });

    this.recorderManager.start({
      duration: 15000,       // 最长录15秒
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'mp3'
    });

    // 15秒自动停止
    setTimeout(function () {
      if (self.data.recording) {
        self.recorderManager.stop();
        wx.hideLoading();
      }
    }, 15000);
  },

  // 语音转文字（调云函数）
  speechToText(tempFilePath) {
    var self = this;

    wx.hideLoading();

    // 上传录音文件到云存储，再调用语音识别云函数
    wx.cloud.uploadFile({
      cloudPath: 'voice/' + Date.now() + '.mp3',
      filePath: tempFilePath,
      success: function (uploadRes) {
        wx.cloud.callFunction({
          name: 'speechToText',
          data: { fileID: uploadRes.fileID },
          success: function (res) {
            var text = '';
            if (res.result && res.result.text) {
              text = res.result.text.trim();
            }
            if (text) {
              self.appendVoiceText(text);
            } else {
              wx.showToast({ title: '未识别到内容，请重试', icon: 'none' });
            }
          },
          fail: function () {
            // 云函数不存在时，提示用户使用文字输入
            wx.showToast({ title: '语音功能需部署 speechToText 云函数', icon: 'none', duration: 2500 });
          }
        });
      },
      fail: function () {
        wx.showToast({ title: '上传失败，请检查网络', icon: 'none' });
      }
    });
  },

  // 将识别结果追加到当前输入框
  appendVoiceText(text) {
    // 智能识别卡片模式：识别结果进 nlText
    if (this._voiceTarget === 'nl') {
      this.setData({ nlText: (this.data.nlText ? this.data.nlText + '，' : '') + text, nlRecording: false });
      wx.showToast({ title: '识别成功 ✓', icon: 'success' });
      return;
    }
    var key = this.data.sheetKey === 'prefer' ? 'customPrefer' : 'customAvoid';
    var current = this.data.profile[key] || '';
    var newText = current ? current + '，' + text : text;
    var patch = {};
    patch['profile.' + key] = newText;
    this.setData(patch);
    wx.showToast({ title: '识别成功 ✓', icon: 'success' });
  },

  /* ===== 智能识别：AI 分析 ===== */
  onNlInput(e) {
    this.setData({ nlText: e.detail.value });
  },

  startNlVoice() {
    var self = this;
    if (this.data.nlRecording) {
      this.recorderManager.stop();
      this.setData({ nlRecording: false });
      return;
    }
    this._voiceTarget = 'nl'; // 识别结果进智能识别框
    this.setData({ nlRecording: true });
    wx.showLoading({ title: '正在聆听…', mask: true });
    this.recorderManager.start({
      duration: 15000,
      sampleRate: 16000,
      numberOfChannels: 1,
      format: 'mp3'
    });
    setTimeout(function () {
      if (self.data.nlRecording) {
        self.recorderManager.stop();
        self.setData({ nlRecording: false });
        wx.hideLoading();
      }
    }, 15000);
  },

  analyzeNl() {
    var text = (this.data.nlText || '').trim();
    if (!text) {
      this.setData({ nlResult: '<span style="color:#FF6B35">⚠️ 请先输入或语音说出你的饮食习惯</span>' });
      return;
    }
    var prof = JSON.parse(JSON.stringify(this.data.profile));
    var result = nlParser.analyze(text, prof);
    if (!result.prefer.length && !result.avoid.length) {
      this.setData({ nlResult: '<span style="color:#FF6B35">🤔 没识别出明确的偏好或忌口。试试这样说："我不吃辣和香菜，喜欢川菜"</span>' });
      return;
    }
    this.setData({ profile: prof });
    storage.setProfile(prof);
    this.refreshSummaries();
    var msg = '<span style="color:#7C5CBF">✅ 识别完成！<br/>';
    if (result.prefer.length) msg += '<b>偏好：</b>' + result.prefer.join('、') + '<br/>';
    if (result.avoid.length) msg += '<b>忌口：</b>' + result.avoid.join('、') + '<br/>';
    msg += '已自动勾选到下方设置中</span>';
    this.setData({ nlResult: msg });
    wx.showToast({ title: '已识别 ' + result.applied.length + ' 项', icon: 'none' });
  },

  noop() {},

  save() {
    storage.setProfile(this.data.profile);
    wx.showToast({ title: '已保存', icon: 'success' });
  }
});
