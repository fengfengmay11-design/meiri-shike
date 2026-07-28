// pages/health/health.js
const storage = require('../../utils/storage.js');

function pad(n) { return ('0' + n).slice(-2); }
function dateStr(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
function energyOf(steps) { return Math.round(Number(steps) * 0.04); } // 估算：每步≈0.04 kcal

// 照片结构归一化：旧数据平铺数组归入午餐
function normalizePhotos(p) {
  if (p && Array.isArray(p)) return { breakfast: [], lunch: p.slice(), dinner: [] };
  p = p || {};
  return { breakfast: (p.breakfast || []).slice(), lunch: (p.lunch || []).slice(), dinner: (p.dinner || []).slice() };
}
function buildSections(photos) {
  return [
    { key: 'breakfast', label: '🥐 早餐', photos: photos.breakfast || [] },
    { key: 'lunch', label: '🍱 午餐', photos: photos.lunch || [] },
    { key: 'dinner', label: '🌙 晚餐', photos: photos.dinner || [] }
  ];
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    weekHead: WEEK,
    todayDateLabel: '',
    todayDateStr: '',
    todaySteps: 0,
    stepTarget: 8000,
    energyTarget: 300,
    energyBurn: 0,
    progress: 0,
    avatarUrl: '',
    calendar: [],
    // 浮窗状态
    popOpen: false,
    popEntering: false,   // 入场缩放动画
    popClosing: false,    // 退场缩放动画
    pop: { dateLabel: '', dateStr: '', steps: 0, energy: 0, weight: '', photos: { breakfast: [], lunch: [], dinner: [] } },
    photoSections: []
  },

  onShow() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const today = dateStr(y, m, d);
    const label = y + '年' + (m + 1) + '月' + d + '日 周' + WEEK[now.getDay()];

    const rec = storage.getDayRecord(today);
    const target = storage.getStepTarget();
    const eTarget = storage.getEnergyTarget() || 300;
    const steps = rec.steps || 0;

    this.setData({
      todayDateLabel: label,
      todayDateStr: today,
      todaySteps: steps,
      stepTarget: target,
      energyTarget: eTarget,
      energyBurn: energyOf(steps),
      avatarUrl: storage.getHealthAvatar() || '',
      progress: target ? Math.min(100, Math.round(steps / target * 100)) : 0
    });
    this.buildCalendar(y, m);
  },

  buildCalendar(y, m) {
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const records = storage.getRecords();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true });
    for (let d = 1; d <= days; d++) {
      const ds = dateStr(y, m, d);
      cells.push({ empty: false, day: d, dateStr: ds, has: !!records[ds], isToday: ds === this.data.todayDateStr });
    }
    this.setData({ calendar: cells });
  },

  openToday() {
    this.openPopover({ currentTarget: { dataset: { date: this.data.todayDateStr } } });
  },

  // 点日期 → 由小变大浮出小窗
  openPopover(e) {
    const ds = e.currentTarget.dataset.date;
    if (!ds) return;
    // 未到的日期：提示并拦截
    if (ds > this.data.todayDateStr) {
      wx.showToast({ title: '还未到当天哟', icon: 'none' });
      return;
    }
    const parts = ds.split('-');
    const d = Number(parts[2]);
    const label = parts[0] + '年' + Number(parts[1]) + '月' + d + '日';
    const rec = storage.getDayRecord(ds);
    const steps = rec.steps || 0;
    var photos0 = normalizePhotos(rec.photos);
    this.setData({
      popOpen: true,
      popEntering: true,
      popClosing: false,
      photoSections: buildSections(photos0),
      pop: {
        dateLabel: label,
        dateStr: ds,
        steps: steps,
        energy: energyOf(steps),
        weight: rec.weight || '',
        photos: photos0
      }
    });
    // 下一帧去掉 entering，触发由小变大动画
    const self = this;
    setTimeout(function () { self.setData({ popEntering: false }); }, 30);
  },

  closePopover() {
    if (!this.data.popOpen) return;
    this.setData({ popClosing: true });
    const self = this;
    setTimeout(function () {
      self.setData({ popOpen: false, popClosing: false, popEntering: false });
      self.onShow(); // 刷新今日卡与日历
    }, 280);
  },

  // 横向滑动手势：左滑→下一天，右滑→上一天（纵向滚动不受影响）
  onPopTouchStart(e) {
    this._sx = e.touches[0].clientX;
    this._sy = e.touches[0].clientY;
  },
  onPopTouchEnd(e) {
    if (this._sx == null) return;
    const dx = e.changedTouches[0].clientX - this._sx;
    const dy = e.changedTouches[0].clientY - this._sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      this.switchDay(dx < 0 ? 1 : -1);
    }
    this._sx = null; this._sy = null;
  },

  prevDay() { this.switchDay(-1); },
  nextDay() { this.switchDay(1); },

  // 切换日期：自动保存当前编辑，再载入目标日
  switchDay(delta) {
    if (!this.data.popOpen) return;
    const ds = this.data.pop.dateStr;
    const rec = storage.getDayRecord(ds);
    rec.steps = this.data.pop.steps;
    rec.weight = this.data.pop.weight;
    rec.photos = this.data.pop.photos;
    storage.setDayRecord(ds, rec);

    const parts = ds.split('-');
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    dt.setDate(dt.getDate() + delta);
    const ny = dt.getFullYear(), nm = dt.getMonth(), nd = dt.getDate();
    const nds = dateStr(ny, nm, nd);
    const label = ny + '年' + (nm + 1) + '月' + nd + '日';
    // 未到的日期：提示并拦截
    if (nds > this.data.todayDateStr) {
      wx.showToast({ title: '还未到当天哟', icon: 'none' });
      return;
    }
    const nrec = storage.getDayRecord(nds);
    const steps = nrec.steps || 0;
    var photosN = normalizePhotos(nrec.photos);
    this.setData({
      photoSections: buildSections(photosN),
      pop: {
        dateLabel: label,
        dateStr: nds,
        steps: steps,
        energy: energyOf(steps),
        weight: nrec.weight || '',
        photos: photosN
      }
    });
  },

  noop() {},

  onInputSteps(e) {
    this.setData({ 'pop.steps': Number(e.detail.value) || 0, 'pop.energy': energyOf(Number(e.detail.value) || 0) });
  },

  onInputWeight(e) {
    this.setData({ 'pop.weight': e.detail.value });
  },

  // 上传照片到指定餐次（相册/拍摄）
  uploadPhoto(e) {
    const self = this;
    const meal = e.currentTarget.dataset.meal || 'lunch';
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const temp = res.tempFiles.map(function (f) { return f.tempFilePath; });
        self.appendPhotos(meal, temp);
      }
    });
  },

  // 从微信聊天记录导入图片
  importFromChat(e) {
    const self = this;
    const meal = e.currentTarget.dataset.meal || 'lunch';
    wx.chooseMessageFile({
      count: 9,
      type: 'image',
      success: function (res) {
        const temp = res.tempFiles.map(function (f) { return f.path; });
        self.appendPhotos(meal, temp);
        wx.showToast({ title: '已从聊天导入 ' + temp.length + ' 张', icon: 'none' });
      },
      fail: function () {
        wx.showToast({ title: '已取消导入', icon: 'none' });
      }
    });
  },

  // 追加照片并刷新分组
  appendPhotos(meal, paths) {
    const photos = JSON.parse(JSON.stringify(this.data.pop.photos));
    if (!photos[meal]) photos[meal] = [];
    photos[meal] = photos[meal].concat(paths);
    this.setData({ 'pop.photos': photos, photoSections: buildSections(photos) });
  },

  // 删除单张
  removePhoto(e) {
    const meal = e.currentTarget.dataset.meal;
    const idx = e.currentTarget.dataset.idx;
    const photos = JSON.parse(JSON.stringify(this.data.pop.photos));
    if (photos[meal]) {
      photos[meal].splice(idx, 1);
      this.setData({ 'pop.photos': photos, photoSections: buildSections(photos) });
    }
  },

  previewPhoto(e) {
    const url = e.currentTarget.dataset.url;
    const p = this.data.pop.photos;
    const all = (p.breakfast || []).concat(p.lunch || []).concat(p.dinner || []);
    wx.previewImage({ current: url, urls: all });
  },

  saveDetail() {
    const ds = this.data.pop.dateStr;
    const rec = storage.getDayRecord(ds);
    rec.steps = this.data.pop.steps;
    rec.weight = this.data.pop.weight;
    rec.photos = this.data.pop.photos;
    storage.setDayRecord(ds, rec);
    wx.showToast({ title: '已保存', icon: 'success' });
    this.closePopover();
  },

  // 上传头像
  chooseAvatar(e) {
    e.stopPropagation();
    const self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function (res) {
        const tempPath = res.tempFiles[0].tempFilePath;
        self.setData({ avatarUrl: tempPath });
        storage.setHealthAvatar(tempPath);
        // 正式环境应上传云存储，这里先存本地路径
        wx.showToast({ title: '头像已更新', icon: 'success' });
      }
    });
  },

  editTarget() {
    const self = this;
    wx.showModal({
      title: '设置每日目标',
      editable: true,
      placeholderText: '目标步数，如 8000',
      content: String(this.data.stepTarget),
      success: function (res) {
        if (res.confirm) {
          const n = Number(res.content);
          if (n > 0) {
            storage.setStepTarget(n);
            // 能量目标按步数估算：每步 0.04kcal，目标约等于 步数*0.04 的合理值（默认300）
            var eTgt = Math.max(150, Math.round(n * 0.04));
            if (eTgt > 600) eTgt = 600; // 上限
            storage.setEnergyTarget(eTgt);
            self.onShow();
          }
        }
      }
    });
  }
});
