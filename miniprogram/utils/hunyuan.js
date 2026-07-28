// utils/hunyuan.js
// 前端直连混元大模型（路 B：不走云函数）。用 wx.request 封装成 Promise。
// 逻辑与 cloudfunctions/generateMeal、cloudfunctions/aiChat 一致，只是跑在客户端。

const cfg = require('./aiConfig.js');

const STATUS_LABEL = {
  fitness_cut: '健身减脂',
  fitness_gain: '健身增肌',
  study: '学习备考',
  recover: '疾病修养',
  normal: '正常',
  overtime: '熬夜加班',
  period: '生理期',
  sugar: '控糖控重'
};

// wx.request 封装成 Promise
function request(messages, temperature) {
  return new Promise(function (resolve, reject) {
    if (!cfg.AI_API_KEY) { reject(new Error('no key')); return; }
    wx.request({
      url: cfg.AI_BASE_URL + '/chat/completions',
      method: 'POST',
      timeout: cfg.TIMEOUT,
      header: {
        'Authorization': 'Bearer ' + cfg.AI_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        model: cfg.AI_MODEL,
        temperature: temperature,
        messages: messages
      },
      success: function (res) {
        try {
          const content = res.data.choices[0].message.content;
          resolve(content);
        } catch (e) {
          reject(e);
        }
      },
      fail: function (err) { reject(err); }
    });
  });
}

/* ===== 一键推荐 ===== */
function buildMealPrompt(status, profile, excludeTitles) {
  const label = STATUS_LABEL[status] || '正常';
  const p = profile || {};
  const pref = [
    p.cuisine && p.cuisine.length ? '偏好菜系：' + p.cuisine.join('、') : '',
    p.staple && p.staple.length ? '偏好主食：' + p.staple.join('、') : '',
    p.fruit && p.fruit.length ? '偏好水果：' + p.fruit.join('、') : '',
    p.avoidTaste && p.avoidTaste.length ? '忌口口味：' + p.avoidTaste.join('、') : '',
    p.avoidVeg && p.avoidVeg.length ? '忌口蔬菜：' + p.avoidVeg.join('、') : '',
    p.avoidFruit && p.avoidFruit.length ? '忌口水果：' + p.avoidFruit.join('、') : ''
  ].filter(Boolean).join('；');

  const free = [
    p.customPrefer ? '自由偏好：' + p.customPrefer : '',
    p.customAvoid ? '自由忌口：' + p.customAvoid : ''
  ].filter(Boolean).join('；');

  const avoid = excludeTitles && excludeTitles.length
    ? '上一轮已推荐过：' + excludeTitles.join('、') + '，请尽量换不同风味。'
    : '';

  return [
    '你是私人营养师。用户当前状态：' + label + '。' +
      (pref ? '用户设置：' + pref + '。' : '') +
      (free ? '用户额外说明：' + free + '。' : '') + avoid,
    '请生成 3 种不同风味的推荐餐，每种包含：1 份主食、1-2 道菜、可选 1 份水果，并估算总能量(kcal)。',
    '严格只输出如下 JSON（不要解释、不要 markdown 代码块）：',
    '{"meals":[{"title":"风味名","staple":{"name":"主食","kcal":数字},"dishes":[{"name":"菜名","kcal":数字}],"fruit":{"name":"水果","kcal":数字},"totalKcal":数字,"note":"一句建议"}]}',
    '注意：必须严格避开用户忌口（含"忌口蔬菜/水果/口味"以及"自由忌口"里的所有内容）；尽量贴合"自由偏好"；减脂/修养状态总能量更低，增肌更高。'
  ].join('\n');
}

function parseMeals(content) {
  try {
    let s = (content || '').trim();
    const fence = s.indexOf('```');
    if (fence >= 0) {
      s = s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1);
    }
    const obj = JSON.parse(s);
    if (obj && Array.isArray(obj.meals)) return obj.meals;
    if (Array.isArray(obj)) return obj;
  } catch (e) { /* 解析失败返回空 */ }
  return [];
}

function generateMeals(status, profile, excludeTitles) {
  return request([{ role: 'user', content: buildMealPrompt(status, profile || {}, excludeTitles || []) }], 0.9)
    .then(parseMeals)
    .catch(function () { return []; });
}

/* ===== AI 营养师问答 ===== */
function buildSystemPrompt(status, profile, location) {
  const label = STATUS_LABEL[status] || '正常';
  const p = profile || {};
  const parts = [
    p.cuisine && p.cuisine.length ? '偏好菜系：' + p.cuisine.join('、') : '',
    p.avoidTaste && p.avoidTaste.length ? '忌口口味：' + p.avoidTaste.join('、') : '',
    p.avoidVeg && p.avoidVeg.length ? '忌口蔬菜：' + p.avoidVeg.join('、') : '',
    p.avoidFruit && p.avoidFruit.length ? '忌口水果：' + p.avoidFruit.join('、') : '',
    p.customPrefer ? '自由偏好：' + p.customPrefer : '',
    p.customAvoid ? '自由忌口：' + p.customAvoid : ''
  ].filter(Boolean).join('；');

  const loc = location && location.org
    ? '用户就餐地点：' + location.org + (location.campus ? ' ' + location.campus : '') + '，建议尽量贴近食堂实际能买到的菜。'
    : '';

  return [
    '你是「食刻」小程序里的 AI 营养师，语气亲切、专业、简洁。',
    '用户当前身心状态：' + label + '。' + (parts ? '用户设置：' + parts + '。' : '') + loc,
    '回答要求：',
    '1. 只回答饮食、营养、健康相关的问题；无关问题礼貌地把话题引回饮食。',
    '2. 必须严格避开用户的所有忌口内容，推荐时优先贴合偏好。',
    '3. 结合用户当前状态给建议（如减脂期热量偏低、生理期温补、熬夜补觉护胃等）。',
    '4. 回答控制在 150 字以内，分点更清晰，可以用少量 emoji。',
    '5. 不做医疗诊断，涉及疾病治疗时建议就医。'
  ].join('\n');
}

function chat(question, status, profile, location, history) {
  const messages = [{ role: 'system', content: buildSystemPrompt(status, profile, location) }];
  if (Array.isArray(history)) {
    history.slice(-6).forEach(function (m) {
      if (m && m.role && m.text) {
        messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text).slice(0, 500) });
      }
    });
  }
  messages.push({ role: 'user', content: String(question).slice(0, 500) });

  return request(messages, 0.7)
    .then(function (content) { return (content || '').trim(); })
    .catch(function () { return ''; });
}

module.exports = {
  isEnabled: function () { return !!cfg.AI_API_KEY; },
  generateMeals: generateMeals,
  chat: chat
};
