// utils/mealGenerator.js
// 本地规则推荐生成器：当 AI 云函数不可用（未开通云开发）时兜底使用。
// 根据【当前状态】+【偏好/忌口】生成 3 种不同风味的套餐，并给出能量估算。

const { FLAVORS } = require('./recipes.js');

// 状态配置：按使用频率从高到低排序（最常用的「正常」放第一个）
// note: 用餐小贴士（与具体菜的「理由」不重复，互补）
const STATUS = {
  normal: {
    key: 'normal', label: '正常', emoji: '😊', range: [600, 800],
    note: '细嚼慢咽，每口 20 下更易饱',
  },
  study: {
    key: 'study', label: '学习备考', emoji: '📚', range: [550, 700],
    note: '配杯温水，餐后适度活动更清醒',
    preferProtein: true, brainFood: true
  },
  fitness_cut: {
    key: 'fitness_cut', label: '运动减脂', emoji: '🏃', range: [480, 650],
    note: '餐前喝杯温水，七分饱即可',
    preferProtein: true, fruitLow: true
  },
  overtime: {
    key: 'overtime', label: '熬夜加班', emoji: '🌙', range: [550, 700],
    note: '吃完不立刻躺下，站一会更舒服',
    avoidSpicy: true, avoidOily: true
  },
  fitness_gain: {
    key: 'fitness_gain', label: '健身增肌', emoji: '💪', range: [700, 920],
    note: '训练后 30 分钟内吃完吸收最佳',
    preferProtein: true, extraDish: true, preferHighKcal: true
  },
  sugar: {
    key: 'sugar', label: '控糖控重', emoji: '⚖️', range: [450, 600],
    note: '餐后散步 10 分钟有助稳血糖',
    fruitLow: true, preferLowKcal: true
  },
  period: {
    key: 'period', label: '生理期', emoji: '🌸', range: [500, 650],
    note: '配杯红糖姜茶或热饮更暖身',
    soft: true, noRaw: true, fruitLow: true, warmFood: true
  },
  recover: {
    key: 'recover', label: '疾病修养', emoji: '🛌', range: [450, 600],
    note: '少食多餐更友好，餐后静坐 10 分钟',
    soft: true, noRaw: true, fruitLow: true, avoidSpicy: true, avoidOily: true
  },
  custom: {
    key: 'custom', label: '自定义', emoji: '✏️', range: [600, 800],
    note: '自由定义你的状态，按普通模式推荐',
  }
};

// 不同状态的推荐理由模板（每种状态 6 个，随机选其一避免同质化）
const STATUS_REASONS = {
  fitness_cut: ['低卡高蛋白，吃饱不胖','热量可控，减脂期不挨饿','少油多蛋白，吃出线条感','碳蛋脂配比合理','高蛋白撑饱腹感','吃得好才能减得好'],
  fitness_gain: ['热量给足，肌肉有料','蛋白碳水双双拉满','训练后黄金补充窗口','增肌不打折扣','大份量高密度营养','吃饱才有力练'],
  study: ['七分饱不犯困','蛋白质续航大脑','清淡不腻下午精神','营养足脑子灵光','温和一餐不趴桌','吃好才能学进去'],
  recover: ['温热软烂好消化','肠胃零负担','清淡温和养身体','软食慢补不着急','暖胃暖心恢复快','小口细品慢慢养'],
  normal: ['营养均衡吃得香','荤素搭配刚刚好','一餐不偏不倚','家常好味道','随心搭配不拘束','吃得开心最重要'],
  overtime: ['清淡不困撑得住','少油少辣护精力','温和一餐不倦怠','轻负担长续航','吃好不犯困','舒服撑到天亮'],
  period: ['温补暖身不刺激','忌生冷喝热汤','暖胃暖心好气色','补铁补血温柔吃','不寒不躁刚刚好','特殊日子要宠自己'],
  sugar: ['低GI不飙血糖','稳糖稳能不发胖','碳水聪明选','控糖也能吃好','血糖友好不犯困','吃稳不吃撑'],
  custom: ['按你设定的状态推荐','自定义模式灵活搭配','不拘一格随心吃饭','自由模式不设限','你定义的状态你做主','按需搭配活出自己']
};

// 状态特定的加分食材/关键词（命中则 dish 更匹配当前状态）
const STATUS_BOOST = {
  fitness_cut: { kws: ['鸡胸', '藜麦', '沙拉', '牛油果', '虾仁', '鱼', '西兰花'], reason: '高蛋白低脂' },
  fitness_gain: { kws: ['鸡腿', '牛肉', '三文鱼', '鸡蛋', '排骨', '牛排'], reason: '高蛋白高能量' },
  study: { kws: ['鱼', '蛋', '豆腐', '牛肉', '核桃', '猪肝'], reason: '补脑提神' },
  recover: { kws: ['粥', '汤', '羹', '豆腐', '蛋', '冬瓜', '薏米'], reason: '温和易消化' },
  overtime: { kws: ['蛋', '豆腐', '鸡胸', '鱼', '虾', '海带'], reason: '解乏不腻' },
  period: { kws: ['牛肉', '蛋', '红豆', '羊肉', '姜', '红糖', '汤'], reason: '温补暖身' },
  sugar: { kws: ['藜麦', '杂粮', '鸡胸', '鱼', '豆腐', '西兰花', '燕麦'], reason: '低GI稳糖' },
  normal: { kws: [], reason: '均衡搭配' }
};

// 菜品亮点：命中关键词则追加说明
const DISH_HIGHLIGHTS = [
  { kws: ['鸡胸'], h: '纯瘦肉高蛋白' },
  { kws: ['三文鱼'], h: 'Omega-3脂肪酸丰富' },
  { kws: ['鲈鱼', '青花鱼', '鱼片', '金枪鱼'], h: '优质鱼肉蛋白' },
  { kws: ['虾仁', '扇贝'], h: '低脂海鲜蛋白' },
  { kws: ['蛋', '蒸蛋'], h: '氨基酸均衡好吸收' },
  { kws: ['豆腐'], h: '植物蛋白易消化' },
  { kws: ['牛肉', '牛排'], h: '补铁补能量' },
  { kws: ['排骨'], h: '优质蛋白补钙' },
  { kws: ['藜麦'], h: '超级谷物全营养' },
  { kws: ['西兰花'], h: '高纤维维生素C' },
  { kws: ['牛油果'], h: '优质不饱和脂肪酸' },
  { kws: ['番茄'], h: '番茄红素抗氧化' },
  { kws: ['菠菜'], h: '补铁补叶酸' },
  { kws: ['木耳'], h: '清肠道促代谢' },
  { kws: ['汤', '羹', '粥'], h: '暖胃易消化' },
  { kws: ['沙拉'], h: '清爽低卡无负担' }
];
function dishHighlight(dishName) {
  for (var i = 0; i < DISH_HIGHLIGHTS.length; i++) {
    for (var j = 0; j < DISH_HIGHLIGHTS[i].kws.length; j++) {
      if (dishName.indexOf(DISH_HIGHLIGHTS[i].kws[j]) >= 0) return DISH_HIGHLIGHTS[i].h;
    }
  }
  return '营养均衡';
}

// 每道菜对应的吃法小贴士（与状态无关，仅取决于菜品本身）
// 关键：匹配顺序重要——先匹配食物形态（汤粥面等），再匹配食材类型
const DISH_TIPS = [
  { kws: ['豆腐汤','瘦肉汤','汤','粥','羹','泡馍','味噌','罗宋','大酱','海带','薏米','酸汤'], tip: '先喝汤再吃饭，暖胃又控量' },
  { kws: ['牛肉面','面','意面','拉面','刀削','面食','肠粉','饺子','馕','凉皮','鸡蛋面'], tip: '先喝口汤/水再吃面，不易胀气' },
  { kws: ['沙拉','凉拌'], tip: '酱汁提前拌匀，静置 2 分钟更入味' },
  { kws: ['石锅','拌饭','波奇'], tip: '拌匀了吃，每一口都有料' },
  { kws: ['三文鱼'], tip: '挤几滴柠檬汁，解腻提鲜' },
  { kws: ['鲈鱼'], tip: '蘸姜丝蒸鱼酱油最经典' },
  { kws: ['青花鱼'], tip: '配萝卜泥去腥更清爽' },
  { kws: ['虾仁','扇贝'], tip: '蘸一点蒜蓉酱油，鲜上加鲜' },
  { kws: ['鸡胸','鸡胸肉'], tip: '蘸低脂酱油或黑胡椒，入味不增卡' },
  { kws: ['鸡腿','照烧','炸鸡'], tip: '把皮去掉再吃，减油不减香' },
  { kws: ['牛肉','牛排','牛肉丼','烤牛肉'], tip: '切小块细嚼，配一口米饭更香' },
  { kws: ['排骨'], tip: '剔骨慢嚼，骨髓营养别浪费' },
  { kws: ['羊肉'], tip: '趁热吃最香，凉了膻味会重' },
  { kws: ['猪排','猪肉','五花肉','回锅肉','肉丝'], tip: '先吃瘦肉再肥瘦搭配，不腻口' },
  { kws: ['蛋','蒸蛋','滑蛋','炒蛋'], tip: '嫩滑口感趁热最佳，放凉会腥' },
  { kws: ['豆腐','麻婆'], tip: '配一勺酱汁拌饭，植物蛋白拉满' },
  { kws: ['番茄炒蛋','番茄','西红柿'], tip: '酸甜口配碳水最佳，拌饭或蘸馒头都绝' },
  { kws: ['西兰花','菜心','莴笋','生菜','秋葵','黄瓜'], tip: '水煮后过凉水，颜色更翠口感更脆' },
  { kws: ['土豆','薯'], tip: '替代主食吃，饱腹又低GI' },
  { kws: ['藜麦','燕麦','杂粮'], tip: '细嚼感受谷物香，饱腹感来得更快' },
  { kws: ['鱼香','宫保','辣炒'], tip: '拨掉表面多余的油再吃，减负担' },
  { kws: ['牛油果'], tip: '压成泥抹开，口感绵密更好入口' },
  { kws: ['剁椒','鱼头'], tip: '蘸一点醋，去腥解辣更鲜' },
  { kws: ['酸菜','白肉'], tip: '蘸蒜酱一口打开，酸爽解腻' },
  { kws: ['锅包肉'], tip: '趁热脆吃最香，凉了口感差一半' },
  { kws: ['冬阴功','咖喱'], tip: '先喝汤再吃料，酸辣开胃' },
  { kws: ['春卷'], tip: '蘸鱼露或泰式甜辣酱吃' },
  { kws: ['河粉'], tip: '挤几滴青柠汁，清爽倍增' },
  { kws: ['空心菜'], tip: '大火快炒出锅就吃，脆嫩不软' },
];
function dishTip(dishName) {
  // 取匹配到的最长关键词对应的 tip（避免"豆腐汤"被"豆腐"匹配走）
  var best = null, bestLen = 0;
  for (var i = 0; i < DISH_TIPS.length; i++) {
    for (var j = 0; j < DISH_TIPS[i].kws.length; j++) {
      var kw = DISH_TIPS[i].kws[j];
      if (dishName.indexOf(kw) >= 0 && kw.length > bestLen) {
        best = DISH_TIPS[i].tip;
        bestLen = kw.length;
      }
    }
  }
  return best || '细嚼慢咽，每口多嚼几下更健康';
}

// 自由文本关键词规则（本地兜底用；AI 模式由模型理解，无需此规则）
const FREE_AVOID_RULES = [
  { kws: ['辣', '麻辣', '辛辣'], match: function (d) { return d.taste.indexOf('辣') >= 0 || d.name.indexOf('辣') >= 0; } },
  { kws: ['香菇', '蘑菇'], match: function (d) { return d.name.indexOf('蘑菇') >= 0 || d.name.indexOf('香菇') >= 0 || d.veg.indexOf('蘑菇') >= 0; } },
  { kws: ['牛肉', '牛'], match: function (d) { return d.name.indexOf('牛') >= 0 && d.name.indexOf('牛油果') < 0; } },
  { kws: ['羊肉', '羊'], match: function (d) { return d.name.indexOf('羊') >= 0; } },
  { kws: ['猪肉', '猪'], match: function (d) { return d.name.indexOf('猪') >= 0; } },
  { kws: ['鸡肉', '鸡'], match: function (d) { return d.name.indexOf('鸡') >= 0 && d.name.indexOf('牛油果') < 0; } },
  { kws: ['鱼', '海鲜'], match: function (d) { return /鱼|虾|蟹|贝|海鲜/.test(d.name + d.veg.join('')); } },
  { kws: ['虾'], match: function (d) { return d.name.indexOf('虾') >= 0; } },
  { kws: ['蛋', '鸡蛋'], match: function (d) { return d.name.indexOf('蛋') >= 0 || d.veg.indexOf('蛋') >= 0; } },
  { kws: ['花生'], match: function (d) { return d.name.indexOf('花生') >= 0 || d.veg.indexOf('花生') >= 0; } },
  { kws: ['香菜'], match: function (d) { return d.name.indexOf('香菜') >= 0 || d.veg.indexOf('香菜') >= 0; } },
  { kws: ['葱'], match: function (d) { return d.name.indexOf('葱') >= 0 || d.veg.indexOf('葱') >= 0; } },
  { kws: ['芹菜'], match: function (d) { return d.name.indexOf('芹菜') >= 0 || d.veg.indexOf('芹菜') >= 0; } },
  { kws: ['韭菜'], match: function (d) { return d.name.indexOf('韭菜') >= 0 || d.veg.indexOf('韭菜') >= 0; } },
  { kws: ['西兰花'], match: function (d) { return d.name.indexOf('西兰花') >= 0 || d.veg.indexOf('西兰花') >= 0; } },
  { kws: ['青椒'], match: function (d) { return d.name.indexOf('青椒') >= 0 || d.veg.indexOf('青椒') >= 0; } },
  { kws: ['芒果'], match: function (d) { return d.name.indexOf('芒果') >= 0; } },
  { kws: ['菠萝'], match: function (d) { return d.name.indexOf('菠萝') >= 0; } }
];

// 自由偏好里可识别的食材词（命中则提升权重）
const PREFER_FOODS = ['鸡胸', '三文鱼', '牛肉', '羊肉', '猪肉', '虾', '豆腐', '西兰花', '鸡蛋', '燕麦', '藜麦', '牛油果', '番茄', '菠菜', '鱼', '海鲜'];

function extractPreferHits(profile) {
  var t = profile && profile.customPrefer ? String(profile.customPrefer) : '';
  if (!t) return [];
  return PREFER_FOODS.filter(function (w) { return t.indexOf(w) >= 0; });
}

function dishBlockedByFreeText(d, text) {
  if (!text) return false;
  for (var i = 0; i < FREE_AVOID_RULES.length; i++) {
    var rule = FREE_AVOID_RULES[i];
    var hit = false;
    for (var j = 0; j < rule.kws.length; j++) { if (text.indexOf(rule.kws[j]) >= 0) { hit = true; break; } }
    if (hit && rule.match(d)) return true;
  }
  return false;
}

const STAPLE_KW = { '米饭': '米', '面': '面', '杂粮': '杂粮', '薯类': '薯' };

function filterDishes(flavor, profile, cfg) {
  var avoidText = (profile && profile.customAvoid) ? String(profile.customAvoid) : '';
  var avoidTaste = profile.avoidTaste || [];
  var avoidVeg = profile.avoidVeg || [];
  var avoidFruit = profile.avoidFruit || [];
  let pool = flavor.dishes.filter(function (d) {
    if (d.taste.some(function (t) { return avoidTaste.indexOf(t) >= 0; })) return false;
    if (d.veg.some(function (v) { return avoidVeg.indexOf(v) >= 0; })) return false;
    if (cfg.noRaw && d.name.indexOf('沙拉') >= 0) return false;
    if (avoidText && dishBlockedByFreeText(d, avoidText)) return false;
    // 早餐：只保留适合早上的菜（蛋/粥/面/汤/面包/沙拉/三明治/燕麦/蒸品/肠粉/凉菜/馕），且单菜不超过 250kcal
    if (cfg.breakfastFilter) {
      var isBreakfast = /蛋|粥|面|汤|面包|沙拉|三明治|燕麦|蒸|肠粉|凉|馕|豆腐/.test(d.name);
      if (!isBreakfast || d.kcal > 250) return false;
    }
    return true;
  });
  if (!pool.length) pool = flavor.dishes.slice(); // 兜底：忌口太多吃空了，回退全部
  return pool;
}

function pickStaple(flavor, profile, cfg) {
  const list = flavor.staples;
  const pref = profile.staple || [];
  for (let i = 0; i < pref.length; i++) {
    const kw = STAPLE_KW[pref[i]];
    if (!kw) continue;
    const hit = list.find(function (x) { return x.name.indexOf(kw) >= 0; });
    if (hit) return hit;
  }
  // 早餐/控糖状态：选低 kcal 主食；增肌状态：选高 kcal 主食
  if (cfg && (cfg.preferLowKcal || cfg.breakfastFilter)) {
    const low = list.slice().sort(function (a, b) { return a.kcal - b.kcal; });
    return low[0] || list[0];
  }
  // 增肌状态：选高碳水主食
  if (cfg && cfg.preferHighKcal) {
    const high = list.slice().sort(function (a, b) { return b.kcal - a.kcal; });
    return high[0] || list[0];
  }
  return list[0];
}

function pickFruit(flavor, profile, cfg) {
  var avoidFruit = profile.avoidFruit || [];
  const list = flavor.fruits.filter(function (f) { return avoidFruit.indexOf(f.name) < 0; });
  if (!list.length) return null;
  const pref = profile.fruit || [];
  for (let i = 0; i < pref.length; i++) {
    const hit = list.find(function (x) { return x.name.indexOf(pref[i]) >= 0 || pref[i].indexOf(x.name) >= 0; });
    if (hit) return hit;
  }
  if (cfg.fruitLow) return list.slice().sort(function (a, b) { return a.kcal - b.kcal; })[0];
  return list[0];
}

// 按状态给 dish 打分（越高越匹配当前状态）
function scoreDish(d, cfg) {
  let s = 0;
  // 高蛋白偏好
  if (cfg.preferProtein && d.protein) s += 8;
  // 增肌需要高热量主菜
  if (cfg.preferHighKcal) s += d.kcal > 200 ? 8 : d.kcal > 140 ? 4 : 0;
  // 控糖需要低热量
  if (cfg.preferLowKcal) s += d.kcal < 120 ? 8 : d.kcal < 180 ? 4 : 0;
  // 避免辣
  if (cfg.avoidSpicy && d.taste && d.taste.indexOf('辣') >= 0) s -= 20;
  // 避免油腻
  if (cfg.avoidOily && d.taste && d.taste.indexOf('油腻') >= 0) s -= 20;
  // 避免生冷（沙拉）
  if (cfg.noRaw && d.name.indexOf('沙拉') >= 0) s -= 20;
  // 温食偏好（生理期/修养）
  if (cfg.warmFood) {
    if (d.name.indexOf('沙拉') >= 0 || d.name.indexOf('凉拌') >= 0) s -= 20;
    if (d.name.indexOf('汤') >= 0 || d.name.indexOf('羹') >= 0 || d.name.indexOf('炖') >= 0) s += 10;
  }
  // 状态特定加分关键词
  const boost = STATUS_BOOST[cfg.key];
  if (boost && boost.kws.length) {
    for (var i = 0; i < boost.kws.length; i++) {
      if (d.name.indexOf(boost.kws[i]) >= 0) { s += 12; break; }
    }
  }
  return s;
}

function pickDishes(pool, cfg, preferHits) {
  preferHits = preferHits || [];
  // 主菜：按状态分数降序 + 自由偏好加权 + 蛋白兜底
  var sorted = pool.slice().sort(function (a, b) {
    var as = scoreDish(a, cfg);
    var bs = scoreDish(b, cfg);
    // 自由偏好食材加分
    if (preferHits.length) {
      var ah = preferHits.some(function (w) { return a.name.indexOf(w) >= 0; }) ? 15 : 0;
      var bh = preferHits.some(function (w) { return b.name.indexOf(w) >= 0; }) ? 15 : 0;
      as += ah; bs += bh;
    }
    if (as !== bs) return bs - as;
    // 同分用蛋白兜底
    return b.protein - a.protein;
  });
  var main = sorted[0];
  var rest = pool.filter(function (d) { return d.name !== main.name; })
    .sort(function (a, b) { return scoreDish(b, cfg) - scoreDish(a, cfg); });
  var dishes = [main];
  if (rest[0]) dishes.push(rest[0]);
  if (cfg.extraDish && rest[1]) dishes.push(rest[1]);
  return dishes;
}

function buildMeal(flavor, cfg, profile, reasonIdx) {
  const preferHits = extractPreferHits(profile);
  const pool = filterDishes(flavor, profile, cfg);
  const staple = pickStaple(flavor, profile, cfg);
  const dishes = pickDishes(pool, cfg, preferHits);
  const main = dishes[0];
  const fruit = pickFruit(flavor, profile, cfg);
  let total = staple.kcal;
  dishes.forEach(function (d) { total += d.kcal; });
  if (fruit) total += fruit.kcal;
  // 能量微调：在不破忌口前提下，尽量把总能量拉回状态区间
  if (cfg.range) {
    let guard = 0;
    while (total > cfg.range[1] && guard++ < 6) {
      const nonMain = dishes.filter(function (d) { return d !== main; })
        .sort(function (a, b) { return b.kcal - a.kcal; });
      if (!nonMain.length) break;
      const rm = nonMain[0];
      dishes.splice(dishes.indexOf(rm), 1);
      total -= rm.kcal;
    }
    while (total < cfg.range[0] && guard++ < 6) {
      const add = pool.find(function (d) {
        return dishes.indexOf(d) < 0 && total + d.kcal <= cfg.range[1];
      });
      if (!add) break;
      dishes.push(add);
      total += add.kcal;
    }
  }
  // 为这道菜选一句理由：菜品亮点 + 状态适配说明 + 可选关键词补充
  var reasons = STATUS_REASONS[cfg.key] || STATUS_REASONS.normal;
  var reason = reasons[reasonIdx !== undefined ? reasonIdx % reasons.length : 0];
  var hl = main ? dishHighlight(main.name) : ''; if (hl) reason = hl + ' · ' + reason;
  var boost = STATUS_BOOST[cfg.key];
  if (boost && boost.kws.length && main) {
    for (var i = 0; i < boost.kws.length; i++) {
      if (main.name.indexOf(boost.kws[i]) >= 0 && reason.indexOf(boost.reason) < 0) {
        reason = reason + ' · ' + boost.reason;
        break;
      }
    }
  }
  // 可解释性打分链（为什么推荐这道菜）
  var explain = [];
  explain.push({ step: '状态匹配', desc: '当前状态「' + cfg.label + '」，热量目标 ' + (cfg.range ? cfg.range[0] + '-' + cfg.range[1] : '600-800') + ' kcal' });
  var filteredCount = flavor.dishes.length - pool.length;
  if (filteredCount > 0) explain.push({ step: '忌口过滤', desc: '按你的忌口设置过滤掉 ' + filteredCount + ' 道候选菜' });
  if (cfg.avoidSpicy) explain.push({ step: '忌口过滤', desc: '当前状态忌辣，已排除辣味菜品' });
  if (cfg.avoidOily) explain.push({ step: '忌口过滤', desc: '当前状态忌油腻，已排除油腻菜品' });
  if (profile.cuisine && profile.cuisine.length) explain.push({ step: '偏好加权', desc: '你偏好的「' + profile.cuisine.join('、') + '」菜系抽中概率提升' });
  if (cfg.preferProtein && main && main.protein) explain.push({ step: '营养加权', desc: '「' + main.name + '」富含蛋白质，符合当前状态需求' });
  if (cfg.fruitLow && fruit) explain.push({ step: '控糖选择', desc: '选择低糖水果「' + fruit.name + '」（' + fruit.kcal + ' kcal）' });
  explain.push({ step: '最终选定', desc: '从 ' + pool.length + ' 道候选中按打分选出「' + (main ? main.name : '') + '」' });
  return {
    flavorKey: flavor.key,
    title: flavor.name,        // 所属菜系（详情里展示）
    cuisine: flavor.name,      // 所属菜系
    dishName: main.name,       // 餐食名称（列表主显示，取招牌主菜名）
    staple: staple,
    dishes: dishes,
    fruit: fruit,
    totalKcal: total,
    note: dishTip(main.name),
    reason: reason,
    mealType: cfg.mealType || 'lunch',
    explain: explain           // 推荐解释打分链
  };
}

// 加权随机选 3 个不同风味；偏好菜系加权；尽量与 excludeTitles 不同（换一批）
function pickThreeFlavors(profile, excludeTitles, preferHits) {
  preferHits = preferHits || [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const weighted = FLAVORS.map(function (f) {
      let w = 1;
      if (profile.cuisine && profile.cuisine.length && profile.cuisine.indexOf(f.cuisine) >= 0) w += 2;
      if (preferHits.length && f.dishes.some(function (d) { return preferHits.some(function (x) { return d.name.indexOf(x) >= 0; }); })) w += 1;
      return { f: f, w: w };
    });
    const chosen = [];
    const bag = weighted.slice();
    while (chosen.length < 3 && bag.length) {
      let total = bag.reduce(function (s, x) { return s + x.w; }, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (let i = 0; i < bag.length; i++) {
        r -= bag[i].w;
        if (r <= 0) { idx = i; break; }
      }
      chosen.push(bag[idx].f);
      bag.splice(idx, 1);
    }
    const titles = chosen.map(function (x) { return x.name; });
    if (attempt === 3 || !(excludeTitles && excludeTitles.length === 3 &&
        titles[0] === excludeTitles[0] && titles[1] === excludeTitles[1] && titles[2] === excludeTitles[2])) {
      return chosen;
    }
  }
  return FLAVORS.slice(0, 3);
}

// 主入口：3 道菜分别对应早餐、午餐、晚餐
// 早餐偏清淡、午餐正常推荐、晚餐偏轻量
function generate(opts) {
  opts = opts || {};
  const status = opts.status || 'normal';
  const profile = opts.profile || {};
  const baseCfg = STATUS[status] || STATUS.normal;
  const preferHits = extractPreferHits(profile);
  const flavors = pickThreeFlavors(profile, opts.excludeTitles, preferHits);

  // 早餐配置：低卡、适宜早上的菜（蛋/粥/面/汤/面包/沙拉/三明治/燕麦/蒸品）
  const breakfastCfg = Object.assign({}, baseCfg, {
    mealType: 'breakfast',
    range: [250, 420],
    avoidSpicy: true, avoidOily: true, fruitLow: false,
    breakfastFilter: true  // 标记为早餐过滤
  });

  // 午餐配置：正常推荐
  const lunchCfg = Object.assign({}, baseCfg, {
    mealType: 'lunch'
  });

  // 晚餐配置：偏轻，少油少辣
  const dinnerCfg = Object.assign({}, baseCfg, {
    mealType: 'dinner',
    range: [400, Math.min(baseCfg.range ? baseCfg.range[1] : 600, 600)],
    avoidSpicy: true, avoidOily: true, fruitLow: true,
    preferLowKcal: true
  });

  return [
    buildMeal(flavors[0], breakfastCfg, profile, 0),
    buildMeal(flavors[1], lunchCfg, profile, 1),
    buildMeal(flavors[2], dinnerCfg, profile, 2)
  ];
}

module.exports = { generate, STATUS, STATUS_REASONS, FLAVORS };
