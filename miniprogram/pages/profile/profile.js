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
      this.recorderManager.onStart(function () {
        if (self._voicePhase !== 'starting') {
          self._recordingActive = true;
          self._ignoreNextRecorderStop = true;
          self.stopRecordingOnce();
          return;
        }
        self._recordingActive = true;
        self._stopRequested = false;
        self.setVoiceBusy('recording');
        self.setData({
          recording: self._voiceTarget === 'sheet',
          nlRecording: self._voiceTarget === 'nl'
        });
        self.startRecordTimer();
      });
      this.recorderManager.onStop(function (res) {
        self._recordingActive = false;
        self._stopRequested = false;
        self.clearRecordTimer();
        self.setData({ recording: false, nlRecording: false });
        if (self._ignoreNextRecorderStop) {
          self._ignoreNextRecorderStop = false;
          self.resetVoiceUi();
          return;
        }
        if (res && res.tempFilePath) {
          self.setVoiceBusy('uploading');
          self.speechToText(res.tempFilePath, self._activeVoiceRequestId);
        } else {
          self.finishVoiceFailure('录音失败，请使用文字输入');
        }
      });
      this.recorderManager.onError(function () {
        self._recordingActive = false;
        self._stopRequested = false;
        self._activeVoiceRequestId = (self._activeVoiceRequestId || 0) + 1;
        self.clearRecordTimer();
        self.finishVoiceFailure('录音失败，请使用文字输入');
      });
    }
  },

  onHide() {
    this.cancelVoiceWork();
  },

  onUnload() {
    this.cancelVoiceWork();
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
    this.requestVoiceInput('sheet');
  },

  startNlVoice() {
    this.requestVoiceInput('nl');
  },

  requestVoiceInput(target) {
    if (this._voiceBusy) {
      if (this._voicePhase === 'recording' && this._recordingActive) {
        this.stopRecordingOnce();
      } else if (this._voicePhase === 'uploading' || this._voicePhase === 'recognizing') {
        wx.showToast({ title: '语音识别处理中', icon: 'none' });
      }
      return;
    }

    var self = this;
    const requestId = (this._activeVoiceRequestId || 0) + 1;
    this._activeVoiceRequestId = requestId;
    this.setVoiceBusy('preparing');
    this.hideVoiceLoading();
    this.setData({ recording: false, nlRecording: false });
    wx.getSetting({
      success: function (settings) {
        if (!self.isCurrentVoiceRequest(requestId, 'preparing')) return;
        const authSetting = settings.authSetting || {};
        const recordSetting = authSetting['scope.record'];
        if (recordSetting === true) {
          self.beginRecording(target, requestId);
        } else if (recordSetting === false) {
          self.showRecordPermissionGuide();
        } else {
          wx.authorize({
            scope: 'scope.record',
            success: function () {
              if (self.isCurrentVoiceRequest(requestId, 'preparing')) {
                self.beginRecording(target, requestId);
              }
            },
            fail: function () {
              if (self.isCurrentVoiceRequest(requestId, 'preparing')) {
                self.showRecordPermissionGuide();
              }
            }
          });
        }
      },
      fail: function () {
        if (self.isCurrentVoiceRequest(requestId, 'preparing')) {
          self.finishVoiceFailure('无法检查麦克风权限，请使用文字输入');
        }
      }
    });
  },

  showRecordPermissionGuide() {
    var self = this;
    this.resetVoiceUi();
    wx.showModal({
      title: '需要麦克风权限',
      content: '语音输入需要麦克风权限；你也可以继续使用文字输入。',
      confirmText: '去设置',
      cancelText: '文字输入',
      success: function (result) {
        if (!result.confirm) return;
        wx.openSetting({
          fail: function () {
            self.finishVoiceFailure('未能打开设置，请使用文字输入');
          }
        });
      }
    });
  },

  beginRecording(target, requestId) {
    if (!this.isCurrentVoiceRequest(requestId, 'preparing')) return;
    this._voiceTarget = target;
    this._recordingActive = false;
    this._stopRequested = false;
    this.setVoiceBusy('starting');

    try {
      this.recorderManager.start({
        duration: 15000,
        sampleRate: 16000,
        numberOfChannels: 1,
        format: 'mp3'
      });
    } catch (error) {
      this._recordingActive = false;
      this._stopRequested = false;
      this.finishVoiceFailure('录音启动失败，请使用文字输入');
    }
  },

  startRecordTimer() {
    var self = this;
    this.clearRecordTimer();
    this._recordStopTimer = setTimeout(function () {
      self.stopRecordingOnce();
    }, 15000);
  },

  stopRecordingOnce() {
    if (!this._recordingActive || this._stopRequested) return;
    this._stopRequested = true;
    this.clearRecordTimer();
    try {
      this.recorderManager.stop();
    } catch (error) {
      this._recordingActive = false;
      this._stopRequested = false;
      this.finishVoiceFailure('录音停止失败，请使用文字输入');
    }
  },

  clearRecordTimer() {
    if (this._recordStopTimer) {
      clearTimeout(this._recordStopTimer);
      this._recordStopTimer = null;
    }
  },

  setVoiceBusy(phase) {
    this._voiceBusy = Boolean(phase);
    this._voicePhase = phase || '';
  },

  isCurrentVoiceRequest(requestId, phase) {
    return requestId === this._activeVoiceRequestId
      && this._voiceBusy
      && (!phase || this._voicePhase === phase);
  },

  showVoiceLoading(title) {
    if (this._loadingVisible) return;
    this._loadingVisible = true;
    wx.showLoading({ title: title, mask: true });
  },

  hideVoiceLoading() {
    if (!this._loadingVisible) return;
    this._loadingVisible = false;
    wx.hideLoading();
  },

  resetVoiceUi() {
    this.setVoiceBusy('');
    this.hideVoiceLoading();
    this.setData({ recording: false, nlRecording: false });
  },

  finishVoiceFailure(message) {
    this.resetVoiceUi();
    wx.showToast({ title: message, icon: 'none', duration: 2500 });
  },

  cancelVoiceWork() {
    this._activeVoiceRequestId = (this._activeVoiceRequestId || 0) + 1;
    this.clearRecordTimer();
    if (this._recordingActive && this.recorderManager) {
      this._ignoreNextRecorderStop = true;
      this.stopRecordingOnce();
    }
    this.resetVoiceUi();
  },

  runWxOperation(startOperation, timeoutMs, onLateSuccess) {
    return new Promise(function (resolve) {
      let settled = false;
      const timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve({ ok: false, timeout: true });
      }, timeoutMs);

      function finish(result) {
        if (settled) {
          if (result.ok && onLateSuccess) onLateSuccess(result.value);
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }

      try {
        startOperation({
          success: function (value) { finish({ ok: true, value: value }); },
          fail: function () { finish({ ok: false, timeout: false }); }
        });
      } catch (error) {
        finish({ ok: false, timeout: false });
      }
    });
  },

  cleanupCloudRecording(fileID) {
    if (!fileID) return;
    try {
      wx.cloud.deleteFile({
        fileList: [fileID],
        fail: function () {
          console.error('voice: temporary recording cleanup failed');
        }
      });
    } catch (error) {
      console.error('voice: temporary recording cleanup failed');
    }
  },

  createVoiceCloudPath() {
    const randomPart = Math.random().toString(36).slice(2, 12);
    const sequence = (this._voiceFileSequence || 0) + 1;
    this._voiceFileSequence = sequence;
    return 'voice/' + Date.now().toString(36) + '-' + randomPart + '-' + sequence + '.mp3';
  },

  // 上传临时录音并调用云函数；超时后的迟到回调只参与清理，不回写输入。
  async speechToText(tempFilePath, requestId) {
    var self = this;
    let completed = false;

    function complete(text, message) {
      if (completed || requestId !== self._activeVoiceRequestId) return;
      completed = true;
      self.resetVoiceUi();
      if (text) {
        self.appendVoiceText(text);
      } else {
        self.finishVoiceFailure(message);
      }
    }

    this.showVoiceLoading('正在识别…');
    const upload = await this.runWxOperation(function (callbacks) {
      wx.cloud.uploadFile({
        cloudPath: self.createVoiceCloudPath(),
        filePath: tempFilePath,
        success: callbacks.success,
        fail: callbacks.fail
      });
    }, 10000, function (lateResult) {
      self.cleanupCloudRecording(lateResult && lateResult.fileID);
    });

    if (!upload.ok || !upload.value || !upload.value.fileID) {
      complete('', upload.timeout ? '上传超时，请使用文字输入' : '上传失败，请使用文字输入');
      return;
    }

    const fileID = upload.value.fileID;
    if (requestId !== this._activeVoiceRequestId) {
      this.cleanupCloudRecording(fileID);
      return;
    }

    this.setVoiceBusy('recognizing');
    const recognition = await this.runWxOperation(function (callbacks) {
      wx.cloud.callFunction({
          name: 'speechToText',
          data: { fileID: fileID },
          success: callbacks.success,
          fail: callbacks.fail
      });
    }, 20000);

    if (!recognition.ok) {
      this.cleanupCloudRecording(fileID);
      complete('', recognition.timeout ? '识别超时，请使用文字输入' : '语音识别失败，请使用文字输入');
      return;
    }

    const result = recognition.value && recognition.value.result;
    const text = result && typeof result.text === 'string' ? result.text.trim() : '';
    if (!text) {
      complete('', '未识别到内容，请使用文字输入');
      return;
    }
    complete(text, '');
  },

  // 将识别结果追加到当前输入框
  appendVoiceText(text) {
    if (this._voiceTarget === 'nl') {
      this.setData({ nlText: (this.data.nlText ? this.data.nlText + '，' : '') + text });
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

  /* ===== 智能识别：本地规则分析 ===== */
  onNlInput(e) {
    this.setData({ nlText: e.detail.value });
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
