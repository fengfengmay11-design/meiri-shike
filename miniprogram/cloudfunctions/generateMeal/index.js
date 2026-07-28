// cloudfunctions/generateMeal/index.js
// 云函数：调用大模型生成「一键推荐餐」。
// 前端 pages/recommend 会优先调用本云函数；若未部署/未配置 key，则自动回退到本地规则生成。
//
// 部署与配置见工程根目录 README.md。
// 环境变量（在云函数「配置 → 环境变量」里填）：
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

function buildPrompt(status, profile, excludeTitles) {
  const label = STATUS_LABEL[status] || '正常';
  const pref = [
    profile.cuisine && profile.cuisine.length ? '偏好菜系：' + profile.cuisine.join('、') : '',
    profile.staple && profile.staple.length ? '偏好主食：' + profile.staple.join('、') : '',
    profile.fruit && profile.fruit.length ? '偏好水果：' + profile.fruit.join('、') : '',
    profile.avoidTaste && profile.avoidTaste.length ? '忌口口味：' + profile.avoidTaste.join('、') : '',
    profile.avoidVeg && profile.avoidVeg.length ? '忌口蔬菜：' + profile.avoidVeg.join('、') : '',
    profile.avoidFruit && profile.avoidFruit.length ? '忌口水果：' + profile.avoidFruit.join('、') : ''
  ].filter(Boolean).join('；');

  // 自由文本（用户自己输入的偏好/忌口）
  const free = [
    profile.customPrefer ? '自由偏好：' + profile.customPrefer : '',
    profile.customAvoid ? '自由忌口：' + profile.customAvoid : ''
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
    let s = content.trim();
    const fence = s.indexOf('```');
    if (fence >= 0) {
      s = s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1);
    }
    const obj = JSON.parse(s);
    if (obj && Array.isArray(obj.meals)) return obj.meals;
    if (Array.isArray(obj)) return obj;
  } catch (e) {
    // 解析失败返回空，前端会回退本地
  }
  return [];
}

exports.main = async (event) => {
  const { status, profile, excludeTitles } = event;
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
  const model = process.env.AI_MODEL || 'hunyuan-turbo';

  if (!apiKey) return { meals: [] };

  try {
    const resp = await axios.post(
      baseURL + '/chat/completions',
      {
        model: model,
        temperature: 0.9,
        messages: [{ role: 'user', content: buildPrompt(status, profile || {}, excludeTitles || []) }]
      },
      { headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const content = resp.data.choices[0].message.content;
    return { meals: parseMeals(content) };
  } catch (e) {
    return { meals: [] };
  }
};
