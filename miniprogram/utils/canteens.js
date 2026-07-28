// utils/canteens.js
// 全国高校数据来自 CollegesChat/university-information 开源项目
// 食堂菜单：部分学校有详细数据，其余自动从模板池生成
// 结构：schools[].name/ campuses[].name/ canteens[].name.menus{breakfast/lunch/dinner}

const SCHOOLS_DATA = require('./schools_data.json');

// 有详细食堂菜单的学校（手动维护）
const DETAILED_SCHOOLS = {
  '清华大学': {
    '校本部': [
      { name: '紫荆园食堂', region: '北区', menus: {
        breakfast: ['豆浆油条', '小米粥', '茶叶蛋', '肉包子', '煎饼果子', '豆腐脑', '葱花饼'],
        lunch: ['红烧肉', '宫保鸡丁', '清炒时蔬', '番茄炒蛋', '麻辣香锅', '糖醋排骨', '酸菜鱼', '地三鲜', '麻婆豆腐', '京酱肉丝'],
        dinner: ['清蒸鱼', '蒜蓉西兰花', '口水鸡', '炒合菜', '紫菜蛋花汤', '京酱肉丝', '素炒豆芽']
      }},
      { name: '桃李园食堂', region: '南区', menus: {
        breakfast: ['鸡蛋灌饼', '八宝粥', '煎饺', '馒头', '豆浆', '葱花饼', '小笼包'],
        lunch: ['水煮肉片', '鱼香肉丝', '蒜蓉西兰花', '土豆烧牛肉', '回锅肉', '红烧鸡块', '清炒豆苗'],
        dinner: ['糖醋里脊', '家常豆腐', '香菇青菜', '玉米排骨汤', '干煸豆角', '清炒藕片']
      }},
      { name: '听涛园食堂', region: '东区', menus: {
        breakfast: ['肉夹馍', '燕麦粥', '煮鸡蛋', '花卷', '南瓜小米粥', '酱香饼'],
        lunch: ['红烧牛肉面', '大盘鸡', '手撕包菜', '青椒炒肉', '酸菜鱼', '干锅花菜', '孜然羊肉'],
        dinner: ['清炖羊肉', '炒三丝', '番茄蛋汤', '蒜蓉生菜', '土豆炖豆角']
      }}
    ],
    '深圳国际校区': [
      { name: '荔园食堂', region: '一期', menus: {
        breakfast: ['肠粉', '皮蛋瘦肉粥', '蒸饺', '白粥', '咸鸭蛋', '马拉糕'],
        lunch: ['白切鸡', '清蒸鲈鱼', '蚝油生菜', '豉汁蒸排骨', '蒜蓉粉丝蒸扇贝', '冬瓜薏米汤'],
        dinner: ['虾仁滑蛋', '白灼菜心', '豉油鸡', '紫菜蛋花汤', '清炒莴笋']
      }}
    ]
  },
  '北京大学': {
    '燕园校区': [
      { name: '农园食堂', region: '中关村', menus: {
        breakfast: ['小笼包', '绿豆粥', '煎蛋', '烧饼', '豆浆', '紫薯', '油条'],
        lunch: ['黄焖鸡米饭', '红烧排骨', '清炒菜心', '鱼香茄子', '糖醋鱼块', '香菇滑鸡', '麻酱拌面'],
        dinner: ['干煸四季豆', '清蒸鲈鱼', '素炒西兰花', '冬瓜丸子汤', '家常豆腐', '蒜泥白肉']
      }},
      { name: '燕南食堂', region: '燕南园', menus: {
        breakfast: ['牛肉饼', '南瓜粥', '煮蛋', '馒头', '红豆薏米粥', '手抓饼'],
        lunch: ['红烧狮子头', '尖椒炒蛋', '上汤娃娃菜', '京酱肉丝', '酸汤肥牛', '清炒藕片', '孜然土豆片'],
        dinner: ['清蒸鱼块', '蒜蓉油麦菜', '西红柿蛋汤', '麻辣豆腐', '蒸南瓜']
      }}
    ],
    '医学部': [
      { name: '跃进厅食堂', region: '医学部', menus: {
        breakfast: ['全麦面包', '牛奶燕麦', '水煮蛋', '水果沙拉', '豆浆', '蒸玉米'],
        lunch: ['鸡胸藜麦碗', '清蒸鱼', '水煮西兰花', '番茄牛肉汤', '杂粮饭', '凉拌黄瓜', '牛油果沙拉'],
        dinner: ['炖鸡汤', '清炒菠菜', '蒸红薯', '豆腐菌菇汤', '虾仁西兰花']
      }}
    ]
  },
  '浙江大学': {
    '紫金港校区': [
      { name: '大食堂', region: '东区', menus: {
        breakfast: ['葱油拌面', '白粥', '煎蛋', '肉包', '豆浆', '蒸饺', '糯米饭团'],
        lunch: ['东坡肉', '西湖醋鱼', '龙井虾仁', '蒜蓉空心菜', '干锅包菜', '清炒莴笋', '笋干老鸭煲'],
        dinner: ['宋嫂鱼羹', '清炒豆苗', '红烧素鸡', '番茄蛋汤', '狮子头', '蚝油生菜']
      }},
      { name: '风味餐厅', region: '西区', menus: {
        breakfast: ['手抓饼', '小米粥', '茶叶蛋', '烧麦', '豆花', '南瓜饼', '杂粮煎饼'],
        lunch: ['回锅肉', '水煮鱼片', '地三鲜', '鱼香肉丝', '干煸豆角', '麻辣香锅', '酱爆茄子'],
        dinner: ['酸辣粉', '清炒时蔬', '紫菜汤', '素烧茄子', '蒸水蛋', '凉拌木耳']
      }}
    ],
    '玉泉校区': [
      { name: '第一食堂', region: '老校区', menus: {
        breakfast: ['包子', '稀饭', '咸菜', '煮鸡蛋', '豆浆', '炒河粉'],
        lunch: ['杭椒牛柳', '糖醋排骨', '清炒菜心', '剁椒鱼头', '酸辣土豆丝', '炒三丝'],
        dinner: ['清蒸鱼', '蒜蓉生菜', '紫菜蛋花汤', '红烧豆腐', '西芹百合']
      }}
    ]
  }
};

// 通用食堂菜单模板池（用于没有详细数据的学校）
const TEMPLATE_POOL = {
  breakfast: [
    ['豆浆油条', '小米粥', '茶叶蛋', '肉包子', '煎饼果子', '葱花饼'],
    ['鸡蛋灌饼', '八宝粥', '煎饺', '馒头', '豆浆', '小笼包'],
    ['葱油拌面', '白粥', '煎蛋', '蒸饺', '糯米饭团', '酱香饼'],
    ['牛奶燕麦', '煮蛋', '全麦面包', '蒸玉米', '水果沙拉', '酸奶'],
    ['皮蛋瘦肉粥', '肠粉', '蒸排骨', '马拉糕', '咸鸭蛋', '炒河粉'],
    ['南瓜小米粥', '手抓饼', '花卷', '豆腐脑', '杂粮煎饼', '豆沙包'],
    ['三明治', '煮蛋', '豆浆', '肉松面包', '蒸红薯', '水果']
  ],
  lunch: [
    ['红烧肉', '宫保鸡丁', '番茄炒蛋', '清炒时蔬', '麻婆豆腐', '紫菜蛋花汤'],
    ['糖醋排骨', '鱼香肉丝', '蒜蓉西兰花', '酸菜鱼', '地三鲜', '冬瓜汤'],
    ['红烧鸡块', '青椒炒肉', '干煸豆角', '回锅肉', '清炒莴笋', '番茄蛋汤'],
    ['白切鸡', '清蒸鲈鱼', '蚝油生菜', '豉汁蒸排骨', '虾仁滑蛋', '玉米排骨汤'],
    ['小炒黄牛肉', '水煮鱼', '干锅花菜', '土豆烧牛肉', '麻辣香锅', '青菜豆腐汤'],
    ['红烧排骨', '香菇滑鸡', '上汤娃娃菜', '京酱肉丝', '清炒豆苗', '冬瓜薏米汤'],
    ['孜然羊肉', '大盘鸡', '手撕包菜', '酸菜粉丝汤', '蒜蓉空心菜', '蛋花汤']
  ],
  dinner: [
    ['清蒸鱼', '蒜蓉西兰花', '紫菜蛋花汤', '炒合菜', '素炒豆芽'],
    ['糖醋里脊', '家常豆腐', '香菇青菜', '玉米排骨汤', '干煸豆角'],
    ['清炖鸡', '炒三丝', '番茄蛋汤', '蒜蓉生菜', '土豆炖豆角'],
    ['蒸水蛋', '清炒时蔬', '白灼菜心', '紫菜汤', '麻婆豆腐'],
    ['狮子头', '蚝油生菜', '番茄蛋汤', '清炒藕片', '红烧素鸡'],
    ['清蒸鱼块', '蒜蓉油麦菜', '西芹百合', '冬瓜丸子汤', '凉拌木耳'],
    ['鸡蛋羹', '素烧茄子', '青菜豆腐汤', '蒸南瓜', '清炒菠菜']
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCanteens(campusName) {
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 canteens per campus
  const names = ['第一食堂', '第二食堂', '风味餐厅', '民族食堂', '教工餐厅', '学生食堂', '美食广场'];
  const regions = ['一楼', '二楼', '东区', '西区', '南区', '北区'];
  const canteens = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let name;
    do { name = pickRandom(names); } while (used.has(name) && used.size < names.length);
    used.add(name);
    const b = pickRandom(TEMPLATE_POOL.breakfast);
    const l = pickRandom(TEMPLATE_POOL.lunch);
    const d = pickRandom(TEMPLATE_POOL.dinner);
    canteens.push({
      name, region: pickRandom(regions),
      menus: { breakfast: b, lunch: l, dinner: d }
    });
  }
  return canteens;
}

function getCampusCanteens(schoolName, campusName) {
  const detail = DETAILED_SCHOOLS[schoolName];
  if (detail && detail[campusName]) {
    return detail[campusName];
  }
  return generateCanteens(campusName);
}

function getSchoolsList() {
  return SCHOOLS_DATA;
}

function findCanteenMenu(schoolName, campusName, canteenName, mealType) {
  const canteens = getCampusCanteens(schoolName, campusName);
  const ctn = canteens.find(c => c.name === canteenName);
  if (!ctn || !ctn.menus) return [];
  return ctn.menus[mealType || 'lunch'] || ctn.menus.lunch || [];
}

// 周边餐饮（通用）
const NEARBY_RESTAURANTS = [
  { name: '老乡鸡', cuisine: '中式快餐', avgPrice: 25, rating: 4.5, tags: ['经济实惠', '营养均衡'] },
  { name: '杨国福麻辣烫', cuisine: '麻辣烫', avgPrice: 22, rating: 4.3, tags: ['自选食材', '热乎管饱'] },
  { name: '沙县小吃', cuisine: '闽菜', avgPrice: 18, rating: 4.2, tags: ['经典平价', '蒸饺炖罐'] },
  { name: '黄焖鸡米饭', cuisine: '鲁菜', avgPrice: 20, rating: 4.4, tags: ['下饭神器', '一锅出'] },
  { name: '轻食沙拉店', cuisine: '轻食', avgPrice: 32, rating: 4.6, tags: ['健康低卡', '新鲜食材'] }
];

module.exports = {
  getSchoolsList,
  getCampusCanteens,
  findCanteenMenu,
  NEARBY_RESTAURANTS
};
