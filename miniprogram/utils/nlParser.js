// utils/nlParser.js — 自然语言偏好/忌口提取
// 与 preview.html 中的规则引擎保持一致

// 同义词归一表：口语说法 → 标准词
var NL_ALIASES = {
  '川菜': '川', '四川': '川', '川味': '川', '麻辣': '辣', '辣椒': '辣', '辛辣': '辣',
  '粤菜': '粤', '广东': '粤', '粤式': '粤', '清淡': '粤',
  '家常菜': '家常', '家里': '家常',
  '日料': '日式', '日本': '日式', '寿司': '日式', '日餐': '日式',
  '西餐': '西式', '牛排': '西式', '意面': '西式',
  '沙拉': '轻食', '健身餐': '轻食',
  '大米': '米饭', '白饭': '米饭',
  '面条': '面', '面食': '面', '拉面': '面', '拌面': '面',
  '粗粮': '杂粮', '糙米': '杂粮', '燕麦': '杂粮',
  '土豆': '薯类', '红薯': '薯类', '地瓜': '薯类', '马铃薯': '薯类',
  '芫荽': '香菜', '胡荽': '香菜',
  '蘑菇': '香菇', '冬菇': '香菇',
  '大葱': '葱', '小葱': '葱', '洋葱': '葱',
  '猪油': '油腻', '油炸': '油腻', '肥肉': '油腻',
  '糖': '甜', '甜食': '甜', '甜品': '甜',
  '盐': '咸', '重口': '咸', '咸口': '咸',
  '海鲜': '虾', '海产': '虾',
  '奇异果': '猕猴桃',
  '桔子': '橘子', '柑': '橘子'
};

// 忌口触发词模式
var NL_AVOID_PATTERNS = [
  /不吃([^，。,.\s]{1,6})/g,
  /讨厌([^，。,.\s]{1,6})/g,
  /忌口?([^，。,.\s]{1,6})/g,
  /对([^，。,.\s]{1,6})过敏/g,
  /不能?吃?([^，。,.\s]{1,6})/g,
  /不碰([^，。,.\s]{1,6})/g,
  /戒([^，。,.\s]{1,6})/g,
  /避开?([^，。,.\s]{1,6})/g,
  /反感([^，。,.\s]{1,6})/g
];

// 偏好触发词模式
var NL_PREFER_PATTERNS = [
  /喜欢([^，。,.\s]{1,6})/g,
  /爱吃([^，。,.\s]{1,6})/g,
  /爱([^，。,.\s]{1,6})/g,
  /偏好([^，。,.\s]{1,6})/g,
  /最爱([^，。,.\s]{1,6})/g,
  /钟爱([^，。,.\s]{1,6})/g,
  /常吃([^，。,.\s]{1,6})/g,
  /痴迷([^，。,.\s]{1,6})/g
];

function nlNormalize(word) {
  if (NL_ALIASES[word]) return NL_ALIASES[word];
  var std = ['川','粤','家常','日式','西式','轻食','米饭','面','杂粮','薯类','苹果','香蕉','橘子','猕猴桃','蓝莓','草莓','辣','油腻','甜','咸','香菇','香菜','芹菜','韭菜','葱','苦瓜','芒果','菠萝','榴莲','荔枝','桃子','虾'];
  for (var i = 0; i < std.length; i++) {
    if (word.indexOf(std[i]) >= 0 || std[i].indexOf(word) >= 0) return std[i];
  }
  // 预设表中无匹配时，返回原始词（作为动态 chip 使用）
  return word;
}

function nlExtract(text, patterns) {
  var found = [];
  patterns.forEach(function (re) {
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(text)) !== null) {
      var raw = m[1];
      // 先按并列连词拆分，再剥离填充字（顺序不能反）
      var parts = raw.split(/[和跟与及、还有]/);
      parts.forEach(function (p) {
        p = p.replace(/[的了呢吧啊哦呀嘛]/g, '');
        if (!p) return;
        var norm = nlNormalize(p);
        if (norm && found.indexOf(norm) < 0) found.push(norm);
      });
    }
  });
  return found;
}

// 偏好词 → profile 组（含 fallback 启发式）
function nlKeyOfPrefer(item) {
  var map = {
    '川': 'cuisine', '粤': 'cuisine', '家常': 'cuisine', '日式': 'cuisine', '西式': 'cuisine', '轻食': 'cuisine',
    '米饭': 'staple', '面': 'staple', '杂粮': 'staple', '薯类': 'staple',
    '苹果': 'fruit', '香蕉': 'fruit', '橘子': 'fruit', '猕猴桃': 'fruit', '蓝莓': 'fruit', '草莓': 'fruit'
  };
  if (map[item]) return map[item];
  // fallback: 含"菜/餐/食/汤/面/饭/粥/粉/包/饺/锅/鱼/肉/鸡/鸭/牛/羊"等字 → 归入菜系
  if (/菜|餐|食|汤|面|饭|粥|粉|包|饺|锅|鱼|肉|鸡|鸭|牛|羊|猪|虾|蟹|蚝|蛏|贝|肠|排|煲|烧|烤|炖|蒸|卤|腌|酿|酥|饼/.test(item)) return 'cuisine';
  // 含"果/莓/桃/梨/瓜/蕉/柑/橙/柚/柠|葡|柿" → 水果
  if (/果|莓|桃|梨|瓜|蕉|柑|橙|柚|柠|葡|柿/.test(item)) return 'fruit';
  // 其余 → 归入菜系（最宽泛的默认分组）
  return 'cuisine';
}

// 忌口词 → profile 组（含 fallback 启发式）
function nlKeyOfAvoid(item) {
  var map = {
    '辣': 'avoidTaste', '油腻': 'avoidTaste', '甜': 'avoidTaste', '咸': 'avoidTaste',
    '香菇': 'avoidVeg', '香菜': 'avoidVeg', '芹菜': 'avoidVeg', '韭菜': 'avoidVeg', '葱': 'avoidVeg', '苦瓜': 'avoidVeg',
    '芒果': 'avoidFruit', '菠萝': 'avoidFruit', '榴莲': 'avoidFruit', '荔枝': 'avoidFruit', '桃子': 'avoidFruit',
    '虾': 'avoidVeg'
  };
  if (map[item]) return map[item];
  // fallback: 含口味相关字 → avoidTaste; 含植物字 → avoidVeg; 含水果字 → avoidFruit
  if (/辣|甜|咸|酸|苦|涩|腥|膻|腻|油|糖|盐|酒|咖啡|浓|淡|冷|热|烫/.test(item)) return 'avoidTaste';
  if (/菜|葱|姜|蒜|芹|韭|芫|菇|笋|藻|芽|苔|草|茶|豆|腐|果|核|壳|仁/.test(item)) return 'avoidVeg';
  return 'avoidTaste'; // 默认归入口味忌口
}

// 主入口：分析文本，返回 { prefer: [...], avoid: [...], applied: [...] }
function analyze(text, profile) {
  var avoidItems = nlExtract(text, NL_AVOID_PATTERNS);
  var preferItems = nlExtract(text, NL_PREFER_PATTERNS);
  var applied = [];
  preferItems.forEach(function (item) {
    var key = nlKeyOfPrefer(item);
    if (key && profile[key] && profile[key].indexOf(item) < 0) {
      profile[key].push(item);
      applied.push('偏好[' + item + ']');
    }
  });
  avoidItems.forEach(function (item) {
    var key = nlKeyOfAvoid(item);
    if (key && profile[key] && profile[key].indexOf(item) < 0) {
      profile[key].push(item);
      applied.push('忌口[' + item + ']');
    }
  });
  return { prefer: preferItems, avoid: avoidItems, applied: applied };
}

module.exports = { analyze, NL_ALIASES };
