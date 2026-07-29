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
    '请生成 3 种不同风味的推荐餐，按顺序分别对应早餐、午餐、晚餐。每份包含：1 份主食、1-2 道菜、可选 1 份水果，并估算总能量(kcal)。',
    '每份餐单必须包含 title、mealType、staple、dishes、totalKcal、reason、note、cuisine。mealType 只能是 breakfast、lunch、dinner，三份依次使用这三个值。',
    'staple 必须包含非空 name 和数字 kcal；dishes 每项必须包含非空 name 和数字 kcal；有水果时 fruit 必须包含非空 name 和数字 kcal，没有水果时省略 fruit 字段。',
    '严格只输出如下 JSON（不要解释、不要 markdown 代码块）：',
    '{"meals":[{"title":"早餐风味名","mealType":"breakfast","staple":{"name":"主食","kcal":数字},"dishes":[{"name":"菜名","kcal":数字}],"fruit":{"name":"水果","kcal":数字},"totalKcal":数字,"reason":"推荐理由","note":"用餐建议","cuisine":"菜系"},{"title":"午餐风味名","mealType":"lunch","staple":{"name":"主食","kcal":数字},"dishes":[{"name":"菜名","kcal":数字}],"totalKcal":数字,"reason":"推荐理由","note":"用餐建议","cuisine":"菜系"},{"title":"晚餐风味名","mealType":"dinner","staple":{"name":"主食","kcal":数字},"dishes":[{"name":"菜名","kcal":数字}],"totalKcal":数字,"reason":"推荐理由","note":"用餐建议","cuisine":"菜系"}]}',
    '注意：必须严格避开用户忌口（含"忌口蔬菜/水果/口味"以及"自由忌口"里的所有内容）；尽量贴合"自由偏好"；减脂/修养状态总能量更低，增肌更高。'
  ].join('\n');
}

function parseMeals(content) {
  try {
    let s = typeof content === 'string' ? content.trim() : '';
    if (!s) return [];
    const fence = s.indexOf('```');
    if (fence >= 0) {
      s = s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1);
    }
    const obj = JSON.parse(s);
    const meals = obj && Array.isArray(obj.meals) ? obj.meals : (Array.isArray(obj) ? obj : []);
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    if (meals.length !== mealTypes.length) return [];
    const valid = meals.every(function (meal, index) {
      return meal && typeof meal === 'object' &&
        typeof meal.title === 'string' && meal.title.trim() &&
        meal.mealType === mealTypes[index] &&
        meal.staple && typeof meal.staple === 'object' &&
        typeof meal.staple.name === 'string' && meal.staple.name.trim() &&
        typeof meal.staple.kcal === 'number' && Number.isFinite(meal.staple.kcal) &&
        Array.isArray(meal.dishes) && meal.dishes.length > 0 &&
        meal.dishes.every(function (dish) {
          return dish && typeof dish === 'object' &&
            typeof dish.name === 'string' && dish.name.trim() &&
            typeof dish.kcal === 'number' && Number.isFinite(dish.kcal);
        }) &&
        (meal.fruit == null || (
          typeof meal.fruit === 'object' &&
          typeof meal.fruit.name === 'string' && meal.fruit.name.trim() &&
          typeof meal.fruit.kcal === 'number' && Number.isFinite(meal.fruit.kcal)
        )) &&
        typeof meal.totalKcal === 'number' && Number.isFinite(meal.totalKcal) &&
        typeof meal.reason === 'string' && meal.reason.trim() &&
        typeof meal.note === 'string' && meal.note.trim() &&
        typeof meal.cuisine === 'string' && meal.cuisine.trim();
    });
    return valid ? meals : [];
  } catch (e) {
    // 解析失败返回空，前端会回退本地
  }
  return [];
}

exports.main = async (event) => {
  event = event || {};
  const status = event.status;
  const profile = event.profile && typeof event.profile === 'object' ? event.profile : {};
  const excludeTitles = Array.isArray(event.excludeTitles) ? event.excludeTitles.slice(0, 3) : [];
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
        messages: [{ role: 'user', content: buildPrompt(status, profile, excludeTitles) }]
      },
      { headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const content = resp.data.choices[0].message.content;
    return { meals: parseMeals(content) };
  } catch (e) {
    return { meals: [] };
  }
};
