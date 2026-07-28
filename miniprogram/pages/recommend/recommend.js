// pages/recommend/recommend.js
const storage = require('../../utils/storage.js');
const mealGenerator = require('../../utils/mealGenerator.js');
const canteens = require('../../utils/canteens.js');
const aiNutritionist = require('../../utils/aiNutritionist.js');
const hunyuan = require('../../utils/hunyuan.js');

const QUICK = [
  { key: 'week', label: '近一周', days: 7 },
  { key: 'twoweek', label: '近两周', days: 14 },
  { key: 'month', label: '近一个月', days: 30 },
  { key: 'halfyear', label: '近半年', days: 182 }
];

function pad(n) { return ('0' + n).slice(-2); }
function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parse(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }

function todayStr() {
  return fmt(new Date());
}

Page({
  data: {
    statusList: [],
    curStatus: 'normal',
    curStatusLabel: '正常',
    curStatusEmoji: '😊',
    showStatusSheet: false,

    // 位置选择
    showLocSheet: false,
    userIdentity: 'student',
    locStep: 'school', // 'school' | 'campus' | 'canteen'
    userOrg: '',
    userCampus: '',
    locationLabel: '',
    schoolSearch: '',
    filteredSchools: [],
    campusList: [],
    canteenList: [],

    showDateSheet: false,
    dateMode: 'quick',
    quickRanges: QUICK,
    curQuick: 'week',
    startDate: '',
    endDate: '',
    dateSummary: '',
    progress: 0,
    progressText: '',

    loading: false,
    source: '',
    meals: [],
    showMealDetail: false,
    mealDetail: null,

    // AI 营养师
    showAiChat: false,
    aiMsgs: [],
    aiInput: '',
    aiSuggestions: aiNutritionist.SUGGESTIONS,
    aiScrollTo: ''
  },

  onLoad() {
    const self = this;
    const statusList = Object.keys(mealGenerator.STATUS).filter(function(k){return k!=='custom';}).map(function (k) {
      return { key: k, label: mealGenerator.STATUS[k].label, emoji: mealGenerator.STATUS[k].emoji };
    });
    const curStatus = storage.getStatus();
    const customLabel = storage.getCustomStatusLabel() || '';
    const infoOf = function (k) { return mealGenerator.STATUS[k] || mealGenerator.STATUS.normal; };
    const curIdentity = storage.getLocation('identity') || 'student';
    const curOrg = storage.getLocation('org') || '';
    const curCampus = storage.getLocation('campus') || '';
    const locLabel = curOrg ? (curIdentity==='student'?'🎓':'💼')+' '+curOrg+(curCampus?' · '+curCampus:'') : '点击设置';
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    // 加载全国高校列表
    const allSchools = canteens.getSchoolsList();
    this.allSchools = allSchools;
    this.setData({
      statusList: statusList,
      curStatus: curStatus,
      curStatusLabel: curStatus === 'custom' && customLabel ? customLabel : infoOf(curStatus).label,
      curStatusEmoji: curStatus === 'custom' ? '✏️' : infoOf(curStatus).emoji,
      userIdentity: curIdentity,
      userOrg: curOrg,
      userCampus: curCampus,
      locationLabel: locLabel,
      filteredSchools: allSchools,
      startDate: fmt(weekAgo),
      endDate: fmt(now)
    });
    this.computeProgress();
  },

  /* ===== 近期状态 ===== */
  openStatusSheet() { this.setData({ showStatusSheet: true }); },
  closeStatusSheet() { this.setData({ showStatusSheet: false }); },
  chooseStatus(e) {
    const key = e.currentTarget.dataset.key;
    const self = this;
    if (key === 'custom') {
      wx.showModal({
        title: '自定义状态',
        editable: true,
        placeholderText: '如"孕早期"、"术后恢复"',
        content: storage.getCustomStatusLabel() || '',
        success: function(res){
          if(res.confirm && res.content && res.content.trim()){
            storage.setCustomStatusLabel(res.content.trim());
            storage.setStatus('custom');
            self.setData({
              curStatus: 'custom',
              curStatusLabel: res.content.trim(),
              curStatusEmoji: '✏️',
              showStatusSheet: false
            });
            self.generateMeals();
          }
        }
      });
      return;
    }
    const info = mealGenerator.STATUS[key] || {};
    storage.setStatus(key);
    this.setData({
      curStatus: key,
      curStatusLabel: info.label || key,
      curStatusEmoji: info.emoji || '😊',
      showStatusSheet: false
    });
    this.generateMeals();
  },

  /* ===== 时间段（弹层交互）===== */
  openDateSheet() { this.setData({ showDateSheet: true }); },
  closeDateSheet() { this.setData({ showDateSheet: false }); },

  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const patch = { dateMode: mode };
    if (mode === 'custom' && !this.data.startDate) {
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      patch.startDate = fmt(weekAgo);
      patch.endDate = fmt(now);
    }
    this.setData(patch);
    this.computeProgress();
  },
  pickQuick(e) {
    this.setData({ curQuick: e.currentTarget.dataset.key });
    this.computeProgress();
  },
  onStart(e) { this.setData({ startDate: e.detail.value }); this.computeProgress(); },
  onEnd(e) { this.setData({ endDate: e.detail.value }); this.computeProgress(); },

  computeProgress() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let start, end, summary;
    if (this.data.dateMode === 'quick') {
      const q = QUICK.find(function (x) { return x.key === this.data.curQuick; }.bind(this));
      const s = new Date(today); s.setDate(s.getDate() - (q ? q.days : 7));
      start = s; end = today;
      summary = (q ? q.label : '近一周');
    } else {
      start = parse(this.data.startDate); end = parse(this.data.endDate);
      summary = this.data.startDate.slice(5) + ' ~ ' + this.data.endDate.slice(5);
    }
    const total = Math.max(1, diffDays(start, end));
    const elapsed = diffDays(start, today);
    const prog = Math.max(0, Math.min(100, Math.round(elapsed / total * 100)));
    const text = '距开始 ' + Math.max(0, elapsed) + ' 天 / 共 ' + total + ' 天';
    this.setData({
      progress: prog,
      progressText: text,
      dateSummary: summary
    });
  },

  /* ===== 一键推荐 ===== */
  generateMeals() {
    var self = this;
    var profile = storage.getProfile();
    var excludeTitles = this.data.meals.map(function (m) { return m.title; });
    this.setData({ loading: true });

    if (hunyuan.isEnabled()) {
      // 路 B：前端直连混元，走真 AI
      hunyuan.generateMeals(self.data.curStatus, profile, excludeTitles).then(function (meals) {
        if (meals && meals.length) {
          self.applyMeals(meals, 'AI 推荐');
        } else {
          self.localGenerate(excludeTitles);
        }
      });
    } else {
      self.localGenerate(excludeTitles);
    }
  },

  localGenerate(excludeTitles) {
    var meals = mealGenerator.generate({
      status: this.data.curStatus,
      profile: storage.getProfile(),
      excludeTitles: excludeTitles
    });
    this.applyMeals(meals, '本地推荐');
  },

  applyMeals(meals, source) {
    meals.forEach(function (m) {
      m.dishesText = (m.dishes || []).map(function (d) { return d.name + '（' + d.kcal + ' kcal）'; }).join('、');
      if (!m.dishName) { m.dishName = (m.dishes && m.dishes[0] && m.dishes[0].name) || m.title; }
      if (!m.cuisine) { m.cuisine = m.title; }
    });
    this.setData({ meals: meals, loading: false, source: source });
    var rec = storage.getDayRecord(todayStr());
    rec.meals = meals.map(function (m) { return { title: m.title, totalKcal: m.totalKcal }; });
    storage.setDayRecord(todayStr(), rec);
  },

  /* ===== 餐食详情 ===== */
  openMeal(e) {
    var idx = e.currentTarget.dataset.idx;
    this.setData({ mealDetail: this.data.meals[idx], showMealDetail: true });
  },
  closeMealDetail() { this.setData({ showMealDetail: false }); },

  /* ===== AI 营养师 ===== */
  openAiChat() {
    var msgs = this.data.aiMsgs;
    if (!msgs.length) {
      var st = mealGenerator.STATUS[this.data.curStatus] || mealGenerator.STATUS.normal;
      msgs = [{ role: 'ai', text: '你好！我是你的 AI 营养师 🥗 我可以根据你当前的状态（' + st.label + '）给你饮食建议。试试下面的快捷问题，或者直接问我。' }];
    }
    this.setData({ showAiChat: true, aiMsgs: msgs, aiScrollTo: 'aim' + (msgs.length - 1) });
  },
  closeAiChat() { this.setData({ showAiChat: false }); },
  onAiInput(e) { this.setData({ aiInput: e.detail.value }); },
  askAi(e) {
    var q = e.currentTarget.dataset.q;
    this.setData({ aiInput: q });
    this.sendAiMsg();
  },
  sendAiMsg() {
    var text = (this.data.aiInput || '').trim();
    if (!text) return;
    var msgs = this.data.aiMsgs.concat([{ role: 'user', text: text }]);
    this.setData({ aiMsgs: msgs, aiInput: '', aiScrollTo: 'aim' + (msgs.length - 1) });
    var self = this;

    // 本地规则兜底回复
    function localReply() {
      var reply = aiNutritionist.answer(text, {
        status: self.data.curStatus,
        profile: storage.getProfile(),
        location: { org: self.data.userOrg, campus: self.data.userCampus }
      });
      var msgs2 = self.data.aiMsgs.concat([{ role: 'ai', text: reply }]);
      self.setData({ aiMsgs: msgs2, aiScrollTo: 'aim' + (msgs2.length - 1) });
    }

    var app = getApp();
    if (hunyuan.isEnabled()) {
      // 路 B：前端直连混元走真 AI，失败回退本地规则
      var thinking = self.data.aiMsgs.concat([{ role: 'ai', text: '正在思考…' }]);
      self.setData({ aiMsgs: thinking, aiScrollTo: 'aim' + (thinking.length - 1) });
      hunyuan.chat(
        text,
        self.data.curStatus,
        storage.getProfile(),
        { org: self.data.userOrg, campus: self.data.userCampus },
        msgs.slice(-6)
      ).then(function (reply) {
        if (reply) {
          // 用真实回复替换「正在思考…」占位
          var replaced = self.data.aiMsgs.slice(0, -1).concat([{ role: 'ai', text: reply }]);
          self.setData({ aiMsgs: replaced, aiScrollTo: 'aim' + (replaced.length - 1) });
        } else {
          // 云端无有效回复：撤掉占位，走本地规则
          self.setData({ aiMsgs: self.data.aiMsgs.slice(0, -1) });
          localReply();
        }
      });
    } else {
      // 未配置 Key：本地规则引擎，带一点思考延迟
      setTimeout(localReply, 500);
    }
  },

  noop() {}
});
