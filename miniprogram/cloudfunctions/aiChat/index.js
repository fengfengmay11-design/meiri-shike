// cloudfunctions/aiChat/index.js
// 云函数：AI 营养师问答，调用大模型回答用户的饮食健康问题。
// 前端 pages/recommend 的问答浮窗会优先调用本云函数；若未部署/未配置 key，则自动回退本地规则引擎。
//
// 环境变量（与 generateMeal 共用同一套，在云函数「配置 → 环境变量」里填）：
//   AI_API_KEY  你的模型 API Key（必填）
//   AI_BASE_URL 兼容 OpenAI 的接口地址，默认腾讯混元
//   AI_MODEL    模型名，默认 hunyuan-turbo

const axios = require('axios');

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

exports.main = async (event) => {
  const { question, status, profile, location, history } = event;
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
  const model = process.env.AI_MODEL || 'hunyuan-turbo';

  if (!apiKey || !question) return { reply: '' };

  // 组装消息：system + 最近几轮对话 + 当前问题
  const messages = [{ role: 'system', content: buildSystemPrompt(status, profile, location) }];
  if (Array.isArray(history)) {
    history.slice(-6).forEach(function (m) {
      if (m && m.role && m.text) {
        messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text).slice(0, 500) });
      }
    });
  }
  messages.push({ role: 'user', content: String(question).slice(0, 500) });

  try {
    const resp = await axios.post(
      baseURL + '/chat/completions',
      { model: model, temperature: 0.7, messages: messages },
      { headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const content = resp.data.choices[0].message.content;
    return { reply: (content || '').trim() };
  } catch (e) {
    return { reply: '' };
  }
};
