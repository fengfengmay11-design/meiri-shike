// utils/aiNutritionist.js — AI 营养师规则引擎
// 意图识别 + 上下文感知，预留 LLM 接口位

var mealGenerator = require('./mealGenerator.js');

var FLAVORS = mealGenerator.FLAVORS;
var STATUS = mealGenerator.STATUS;
var STATUS_REASONS = mealGenerator.STATUS_REASONS;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 主入口：用户问题 → AI 回复
// context: { status, profile, location: {org, campus} }
function answer(q, context) {
  context = context || {};
  var st = STATUS[context.status] || STATUS.normal;
  var prof = context.profile || {};
  var avoids = (prof.avoidTaste || []).concat(prof.avoidVeg || []);
  q = (q || '').toLowerCase();

  // 意图1: 推荐吃什么
  if (q.match(/吃什么|推荐|吃啥|吃甚么/)) {
    var pool = [];
    FLAVORS.forEach(function (f) {
      if (prof.cuisine && prof.cuisine.length > 0 && prof.cuisine.indexOf(f.name) < 0) return;
      f.dishes.forEach(function (d) {
        if (avoids.length && d.taste && d.taste.some(function (t) { return avoids.indexOf(t) >= 0; })) return;
        pool.push({ name: d.name, kcal: d.kcal, cuisine: f.name });
      });
    });
    if (pool.length) {
      var p1 = pick(pool);
      return '根据你「' + st.label + '」的状态，推荐「' + p1.name + '」（' + p1.cuisine + ' · 约 ' + p1.kcal + ' kcal）。' + (st.note || '营养均衡最重要！') + ' 想看完整方案的话，点首页的「一键推荐」我给你搭配三餐。';
    }
    return '根据你当前「' + st.label + '」的状态，建议清淡易消化的饮食。点首页「一键推荐」获取完整三餐方案！';
  }

  // 意图2: 能不能吃X
  if (q.match(/能吃|可以吃|可不可以吃|能吃吗|可以吃吗/)) {
    var food = q.replace(/能吃吗|可以吃吗|能吃|可以吃|可不可以吃|吗|？|\?/g, '').trim();
    if (food.length > 0 && food.length < 10) {
      if (avoids.indexOf(food) >= 0) return '⚠️ 你在忌口设置里标记了「' + food + '」，建议避免。如果特别想吃，可以偶尔少量，但当前「' + st.label + '」状态下不推荐。';
      if (st.avoidSpicy && food.match(/辣|火锅|麻辣/)) return '⚠️ 你当前「' + st.label + '」状态建议忌辣，「' + food + '」最好少吃。换成清淡的会更舒服。';
      if (st.avoidOily && food.match(/油炸|炸鸡|油/)) return '⚠️ 你当前「' + st.label + '」状态建议少油，「' + food + '」热量偏高。实在想吃可以搭配大量蔬菜。';
      return '✅ 可以适量吃「' + food + '」！注意控制分量，搭配蔬菜和主食更均衡。你当前「' + st.label + '」状态下没有特别需要避开的。';
    }
  }

  // 意图3: 高蛋白
  if (q.match(/高蛋白|蛋白质|增肌|蛋白/)) {
    var highProtein = [];
    FLAVORS.forEach(function (f) {
      f.dishes.forEach(function (d) {
        if (d.protein) highProtein.push(d.name + '（' + f.name + '）');
      });
    });
    return '💪 高蛋白推荐：' + highProtein.slice(0, 3).join('、') + '。你当前「' + st.label + '」状态' + (st.preferProtein ? '特别需要补充蛋白质' : '可以适量补充蛋白质') + '，建议每餐都有优质蛋白来源。';
  }

  // 意图4: 减脂/减肥
  if (q.match(/减脂|减肥|瘦|热量|卡路里|大卡/)) {
    return '🔥 你当前热量目标是 ' + (st.range ? st.range[0] + '-' + st.range[1] : '600-800') + ' kcal/餐。减脂关键是热量缺口+蛋白质充足。建议：少油少辣、主食减半、多吃蔬菜。点「一键推荐」我帮你精确搭配！';
  }

  // 意图5: 感冒/生病
  if (q.match(/感冒|生病|发烧|嗓子|咳嗽|不舒服/)) {
    return '🤒 生病期间建议：温热软烂好消化的食物，比如粥、蒸蛋、清汤面。避免生冷、辛辣、油腻。多喝水多休息。可以把状态切换到「疾病修养」，我会按养病标准给你配餐。';
  }

  // 意图6: 犯困/没精神
  if (q.match(/犯困|没精神|困|累|疲劳|下午.*困/)) {
    return '😴 饭后犯困通常是因为血糖波动大。建议：① 主食选粗粮（糙米/燕麦）② 七分饱别吃撑 ③ 蛋白质放前面吃 ④ 饭后散步10分钟。你当前「' + st.label + '」状态下更要注意！';
  }

  // 意图7: 经期
  if (q.match(/经期|大姨妈|生理期|月经/)) {
    return '🌸 生理期建议：温补暖身，喝红糖姜茶、吃红枣。避免生冷（沙拉/冰饮）、辛辣刺激。把状态切换到「生理期」，推荐会自动变成温热软食。';
  }

  // 意图8: 食堂/学校
  if (q.match(/食堂|学校|校区|公司/)) {
    var loc = context.location || {};
    if (loc.org) return '📍 你当前设置在「' + loc.org + ' ' + (loc.campus || '') + '」，推荐会自动混入食堂今日菜单。想换地方的话，点首页的「就餐位置」重新设置。';
    return '📍 你还没设置就餐位置！点首页的「就餐位置」，选你的学校和校区，推荐就会结合食堂菜单，更贴近你实际能吃到的东西。';
  }

  // 意图9: 你是谁/能做什么
  if (q.match(/你是谁|你能做什么|介绍|功能/)) {
    return '🤖 我是「每日时刻」的 AI 营养师。我能做的事：① 根据你的身心状态推荐三餐 ② 回答饮食健康问题 ③ 结合你的忌口和偏好给建议 ④ 结合学校食堂菜单给可落地的方案。试试问我"我今天该吃什么"？';
  }

  // 兜底
  var fallbacks = [
    '好问题！饮食健康最重要的是规律和均衡。你当前「' + st.label + '」状态下，' + (st.note || '细嚼慢咽') + '。还想了解什么？',
    '这个问题涉及个性化营养方案，我建议你用首页的「一键推荐」生成三餐，每一道都有推荐理由。或者换个角度问我，比如"减脂期能吃辣吗"？',
    '作为 AI 营养师，我最擅长的是结合你的状态给饮食建议。你当前是「' + st.label + '」状态，要试试针对这个状态的专属推荐吗？'
  ];
  return pick(fallbacks);
}

// 快捷问题建议
var SUGGESTIONS = [
  '我今天该吃什么？',
  '减脂期能吃辣吗？',
  '推荐一个高蛋白午餐',
  '感冒了什么不能吃？',
  '怎么吃才不犯困？'
];

module.exports = { answer, SUGGESTIONS };
