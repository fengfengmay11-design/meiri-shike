// utils/recipes.js
// 内置菜谱库：按风味组织。本地规则生成器（AI 不可用时的兜底）会用到这里的数据。
// 字段说明：
//   dishes[].taste  -> 口味标签，命中"忌口-口味"则排除
//   dishes[].veg    -> 含的蔬菜/食材，命中"忌口-蔬菜"则排除；也用于自由文本匹配
//   dishes[].protein-> 1 表示高蛋白主菜，健身/增肌状态优先选
//   dishes[].type   -> 'main'|'side'|'soup' 菜品类型（可选）

const FLAVORS = [
  // ========== 1. 川味 ==========
  {
    key: 'chuan',
    name: '川味',
    cuisine: '川',
    dishes: [
      { name: '水煮鸡胸肉片', kcal: 230, taste: ['辣'], veg: ['豆芽', '莴笋'], protein: 1 },
      { name: '鱼香肉丝', kcal: 280, taste: [], veg: ['木耳', '胡萝卜', '青椒'], protein: 1 },
      { name: '回锅肉', kcal: 340, taste: ['油腻'], veg: ['蒜苗', '洋葱'], protein: 1 },
      { name: '宫保鸡丁', kcal: 260, taste: [], veg: ['花生', '黄瓜', '胡萝卜'], protein: 1 },
      { name: '麻婆豆腐', kcal: 190, taste: ['辣', '油腻'], veg: ['豆腐'], protein: 1 },
      { name: '清炒莴笋片', kcal: 90, taste: [], veg: ['莴笋'], protein: 0 },
      { name: '酸辣土豆丝', kcal: 130, taste: ['辣'], veg: ['土豆'], protein: 0 },
      { name: '紫菜蛋花汤', kcal: 60, taste: [], veg: ['紫菜', '蛋'], protein: 0 }
    ],
    staples: [
      { name: '糙米饭', kcal: 200 },
      { name: '白米饭', kcal: 230 },
      { name: '南瓜饭', kcal: 180 }
    ],
    fruits: [
      { name: '苹果', kcal: 95 },
      { name: '猕猴桃', kcal: 60 },
      { name: '橙子', kcal: 70 }
    ]
  },
  // ========== 2. 粤式 ==========
  {
    key: 'yue',
    name: '粤式清淡',
    cuisine: '粤',
    dishes: [
      { name: '清蒸鲈鱼', kcal: 210, taste: [], veg: ['葱', '姜'], protein: 1 },
      { name: '白切鸡', kcal: 250, taste: [], veg: ['鸡肉'], protein: 1 },
      { name: '虾仁滑蛋', kcal: 160, taste: [], veg: ['虾仁', '蛋'], protein: 1 },
      { name: '豉汁蒸排骨', kcal: 300, taste: [], veg: ['排骨'], protein: 1 },
      { name: '白灼菜心', kcal: 75, taste: [], veg: ['菜心'], protein: 0 },
      { name: '蒜蓉粉丝蒸扇贝', kcal: 180, taste: [], veg: ['粉丝', '扇贝'], protein: 1 },
      { name: '冬瓜薏米汤', kcal: 50, taste: [], veg: ['冬瓜'], protein: 0 },
      { name: '蚝油生菜', kcal: 60, taste: [], veg: ['生菜'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '小米粥', kcal: 120 },
      { name: '蒸肠粉', kcal: 180 }
    ],
    fruits: [
      { name: '雪梨', kcal: 80 },
      { name: '柚子', kcal: 70 },
      { name: '芒果', kcal: 100 }
    ]
  },
  // ========== 3. 家常 ==========
  {
    key: 'jiachang',
    name: '家常',
    cuisine: '家常',
    dishes: [
      { name: '番茄炒蛋', kcal: 170, taste: [], veg: ['番茄', '蛋'], protein: 1 },
      { name: '红烧排骨', kcal: 350, taste: ['甜'], veg: ['排骨'], protein: 1 },
      { name: '青椒炒肉丝', kcal: 220, taste: [], veg: ['青椒', '猪肉'], protein: 1 },
      { name: '土豆烧牛肉', kcal: 320, taste: [], veg: ['土豆', '牛肉', '胡萝卜'], protein: 1 },
      { name: '蒜蓉西兰花', kcal: 85, taste: [], veg: ['西兰花'], protein: 0 },
      { name: '凉拌黄瓜', kcal: 60, taste: [], veg: ['黄瓜'], protein: 0 },
      { name: '可乐鸡翅', kcal: 260, taste: ['甜'], veg: ['鸡翅'], protein: 1 },
      { name: '菠菜豆腐汤', kcal: 70, taste: [], veg: ['菠菜', '豆腐'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '馒头', kcal: 220 },
      { name: '花卷', kcal: 200 }
    ],
    fruits: [
      { name: '香蕉', kcal: 105 },
      { name: '橘子', kcal: 62 },
      { name: '西瓜', kcal: 50 }
    ]
  },
  // ========== 4. 日式 ==========
  {
    key: 'japanese',
    name: '日式',
    cuisine: '日式',
    dishes: [
      { name: '照烧鸡腿（去皮）', kcal: 250, taste: ['甜'], veg: ['鸡肉'], protein: 1 },
      { name: '盐烤青花鱼', kcal: 200, taste: [], veg: ['青花鱼'], protein: 1 },
      { name: '牛肉丼', kcal: 380, taste: ['甜'], veg: ['牛肉', '洋葱'], protein: 1 },
      { name: '味噌汤', kcal: 65, taste: [], veg: ['豆腐', '海带'], protein: 0 },
      { name: '日式炸猪排', kcal: 350, taste: ['油腻'], veg: ['猪肉'], protein: 1 },
      { name: '清炒秋葵', kcal: 80, taste: [], veg: ['秋葵'], protein: 0 },
      { name: '亲子丼（鸡肉蛋）', kcal: 290, taste: ['甜'], veg: ['鸡肉', '蛋', '洋葱'], protein: 1 },
      { name: '纳豆拌饭', kcal: 180, taste: [], veg: ['纳豆'], protein: 1 }
    ],
    staples: [
      { name: '杂粮饭', kcal: 210 },
      { name: '白米饭', kcal: 230 },
      { name: '荞麦面', kcal: 160 }
    ],
    fruits: [
      { name: '草莓', kcal: 50 },
      { name: '蓝莓', kcal: 85 },
      { name: '蜜瓜', kcal: 65 }
    ]
  },
  // ========== 5. 西式 ==========
  {
    key: 'western',
    name: '西式',
    cuisine: '西式',
    dishes: [
      { name: '香煎三文鱼', kcal: 290, taste: [], veg: ['三文鱼'], protein: 1 },
      { name: '烤鸡胸沙拉', kcal: 200, taste: [], veg: ['生菜', '黄瓜', '番茄'], protein: 1 },
      { name: '奶油蘑菇汤', kcal: 140, taste: ['油腻'], veg: ['蘑菇'], protein: 0 },
      { name: '黑椒牛排', kcal: 380, taste: [], veg: ['牛肉', '西兰花'], protein: 1 },
      { name: '番茄肉酱意面', kcal: 420, taste: [], veg: ['番茄', '牛肉'], protein: 1 },
      { name: '罗宋汤', kcal: 120, taste: [], veg: ['番茄', '土豆', '牛肉'], protein: 0 },
      { name: '凯撒沙拉', kcal: 170, taste: [], veg: ['生菜', '面包丁'], protein: 0 },
      { name: '金枪鱼三明治', kcal: 310, taste: [], veg: ['生菜', '番茄'], protein: 1 }
    ],
    staples: [
      { name: '全麦意面', kcal: 250 },
      { name: '烤土豆', kcal: 160 },
      { name: '全麦面包', kcal: 180 }
    ],
    fruits: [
      { name: '蓝莓', kcal: 85 },
      { name: '苹果', kcal: 95 },
      { name: '葡萄柚', kcal: 50 }
    ]
  },
  // ========== 6. 轻食 ==========
  {
    key: 'light',
    name: '轻食',
    cuisine: '轻食',
    dishes: [
      { name: '鸡胸藜麦碗', kcal: 240, taste: [], veg: ['藜麦', '菠菜', '玉米'], protein: 1 },
      { name: '牛油果鸡蛋沙拉', kcal: 210, taste: [], veg: ['蛋', '牛油果', '番茄'], protein: 1 },
      { name: '凉拌秋耳', kcal: 70, taste: [], veg: ['木耳', '黄瓜'], protein: 0 },
      { name: '虾仁藜麦沙拉', kcal: 180, taste: [], veg: ['虾仁', '藜麦', '生菜'], protein: 1 },
      { name: '金枪鱼波奇饭', kcal: 350, taste: [], veg: ['金枪鱼', '牛油果', '玉米'], protein: 1 },
      { name: '水煮西兰花', kcal: 50, taste: [], veg: ['西兰花'], protein: 0 },
      { name: '燕麦粥配蓝莓', kcal: 160, taste: [], veg: ['燕麦', '蓝莓'], protein: 0 },
      { name: '日式冷豆腐', kcal: 100, taste: [], veg: ['豆腐', '葱花'], protein: 0 }
    ],
    staples: [
      { name: '藜麦饭', kcal: 190 },
      { name: '红薯', kcal: 160 },
      { name: '燕麦饭', kcal: 170 }
    ],
    fruits: [
      { name: '圣女果', kcal: 30 },
      { name: '猕猴桃', kcal: 60 },
      { name: '火龙果', kcal: 55 }
    ]
  },
  // ========== 7. 韩式 ==========
  {
    key: 'korean',
    name: '韩式',
    cuisine: '韩式',
    dishes: [
      { name: '韩式烤牛肉', kcal: 320, taste: ['甜'], veg: ['牛肉', '洋葱'], protein: 1 },
      { name: '石锅拌饭', kcal: 380, taste: [], veg: ['菠菜', '豆芽', '胡萝卜', '蛋'], protein: 1 },
      { name: '大酱汤', kcal: 120, taste: [], veg: ['豆腐', '西葫芦', '蛤蜊'], protein: 0 },
      { name: '韩式辣炒年糕', kcal: 280, taste: ['辣'], veg: ['年糕', '鱼饼'], protein: 0 },
      { name: '泡菜炒五花肉', kcal: 310, taste: ['辣', '油腻'], veg: ['泡菜', '五花肉'], protein: 1 },
      { name: '韩式煎饼', kcal: 220, taste: [], veg: ['韭菜', '虾仁'], protein: 0 },
      { name: '海带汤', kcal: 40, taste: [], veg: ['海带'], protein: 0 },
      { name: '韩式炸鸡（去皮）', kcal: 300, taste: ['甜', '油腻'], veg: ['鸡肉'], protein: 1 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '杂粮饭', kcal: 210 }
    ],
    fruits: [
      { name: '苹果', kcal: 95 },
      { name: '梨', kcal: 80 }
    ]
  },
  // ========== 8. 西北面食 ==========
  {
    key: 'xibei',
    name: '西北面食',
    cuisine: '西北',
    dishes: [
      { name: '兰州牛肉面', kcal: 380, taste: [], veg: ['牛肉', '白萝卜'], protein: 1 },
      { name: '大盘鸡', kcal: 420, taste: ['辣'], veg: ['鸡肉', '土豆', '青椒'], protein: 1 },
      { name: '手抓羊肉', kcal: 350, taste: [], veg: ['羊肉'], protein: 1 },
      { name: '陕西凉皮', kcal: 200, taste: ['辣'], veg: ['面筋', '黄瓜'], protein: 0 },
      { name: '孜然羊肉', kcal: 300, taste: [], veg: ['羊肉', '洋葱'], protein: 1 },
      { name: '西红柿鸡蛋面', kcal: 280, taste: [], veg: ['番茄', '蛋'], protein: 1 },
      { name: '羊肉泡馍', kcal: 450, taste: [], veg: ['羊肉', '粉丝'], protein: 1 },
      { name: '酸汤水饺', kcal: 320, taste: [], veg: ['猪肉', '韭菜'], protein: 1 }
    ],
    staples: [
      { name: '拉面', kcal: 280 },
      { name: '白面馍', kcal: 240 },
      { name: '刀削面', kcal: 260 }
    ],
    fruits: [
      { name: '苹果', kcal: 95 },
      { name: '哈密瓜', kcal: 55 }
    ]
  },
  // ========== 9. 湘味 ==========
  {
    key: 'xiang',
    name: '湘味',
    cuisine: '湘',
    dishes: [
      { name: '剁椒鱼头', kcal: 280, taste: ['辣'], veg: ['鱼头'], protein: 1 },
      { name: '小炒黄牛肉', kcal: 250, taste: ['辣'], veg: ['牛肉', '青椒', '蒜苗'], protein: 1 },
      { name: '辣椒炒肉', kcal: 230, taste: ['辣', '油腻'], veg: ['猪肉', '青椒'], protein: 1 },
      { name: '酸豆角炒肉末', kcal: 160, taste: ['辣'], veg: ['酸豆角', '猪肉'], protein: 0 },
      { name: '手撕包菜', kcal: 100, taste: ['辣'], veg: ['包菜'], protein: 0 },
      { name: '剁椒蒸排骨', kcal: 300, taste: ['辣'], veg: ['排骨', '剁椒'], protein: 1 },
      { name: '农家小炒千张', kcal: 180, taste: ['辣'], veg: ['千张', '青椒'], protein: 1 },
      { name: '紫苏黄瓜', kcal: 70, taste: [], veg: ['黄瓜', '紫苏'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '杂粮饭', kcal: 210 }
    ],
    fruits: [
      { name: '橘子', kcal: 62 },
      { name: '苹果', kcal: 95 }
    ]
  },
  // ========== 10. 东北家常 ==========
  {
    key: 'dongbei',
    name: '东北家常',
    cuisine: '东北',
    dishes: [
      { name: '锅包肉', kcal: 320, taste: ['甜', '油腻'], veg: ['猪肉'], protein: 1 },
      { name: '地三鲜', kcal: 200, taste: ['油腻'], veg: ['土豆', '茄子', '青椒'], protein: 0 },
      { name: '小鸡炖蘑菇', kcal: 280, taste: [], veg: ['鸡肉', '蘑菇', '粉条'], protein: 1 },
      { name: '猪肉炖粉条', kcal: 310, taste: [], veg: ['猪肉', '白菜', '粉条'], protein: 1 },
      { name: '尖椒干豆腐', kcal: 150, taste: [], veg: ['干豆腐', '青椒'], protein: 1 },
      { name: '东北拉皮', kcal: 170, taste: [], veg: ['拉皮', '黄瓜', '胡萝卜'], protein: 0 },
      { name: '酸菜白肉', kcal: 260, taste: [], veg: ['酸菜', '猪肉'], protein: 1 },
      { name: '酱骨架', kcal: 340, taste: [], veg: ['排骨'], protein: 1 }
    ],
    staples: [
      { name: '大米饭', kcal: 230 },
      { name: '杂粮饭', kcal: 210 },
      { name: '馒头', kcal: 220 }
    ],
    fruits: [
      { name: '苹果', kcal: 95 },
      { name: '西瓜', kcal: 50 }
    ]
  },
  // ========== 11. 东南亚风味 ==========
  {
    key: 'seasian',
    name: '东南亚',
    cuisine: '东南亚',
    dishes: [
      { name: '泰式冬阴功汤', kcal: 140, taste: ['辣'], veg: ['虾仁', '蘑菇', '番茄'], protein: 0 },
      { name: '越式春卷', kcal: 180, taste: [], veg: ['虾仁', '生菜', '米粉'], protein: 0 },
      { name: '海南鸡饭', kcal: 280, taste: [], veg: ['鸡肉'], protein: 1 },
      { name: '泰式绿咖喱鸡', kcal: 260, taste: ['辣'], veg: ['鸡肉', '茄子', '青椒'], protein: 1 },
      { name: '越式牛肉河粉', kcal: 300, taste: [], veg: ['牛肉', '河粉', '豆芽'], protein: 1 },
      { name: '马来椰浆饭', kcal: 340, taste: [], veg: ['鸡肉', '蛋'], protein: 1 },
      { name: '泰式青木瓜沙拉', kcal: 120, taste: ['辣'], veg: ['青木瓜', '番茄'], protein: 0 },
      { name: '虾酱空心菜', kcal: 90, taste: [], veg: ['空心菜'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '米粉', kcal: 180 },
      { name: '棕米饭', kcal: 200 }
    ],
    fruits: [
      { name: '芒果', kcal: 100 },
      { name: '椰子水', kcal: 40 }
    ]
  },
  // ========== 12. 闽台风味 ==========
  {
    key: 'mintai',
    name: '闽台风味',
    cuisine: '闽台',
    dishes: [
      { name: '卤肉饭', kcal: 350, taste: [], veg: ['猪肉', '卤蛋'], protein: 1 },
      { name: '沙茶面', kcal: 330, taste: [], veg: ['面条', '豆芽', '虾仁'], protein: 0 },
      { name: '蚵仔煎', kcal: 250, taste: [], veg: ['生蚝', '蛋', '生菜'], protein: 1 },
      { name: '三杯鸡', kcal: 290, taste: ['甜'], veg: ['鸡肉', '蒜'], protein: 1 },
      { name: '担仔面', kcal: 280, taste: [], veg: ['肉臊', '虾仁', '面条'], protein: 0 },
      { name: '姜母鸭', kcal: 320, taste: [], veg: ['鸭肉', '姜'], protein: 1 },
      { name: '客家小炒', kcal: 240, taste: [], veg: ['猪肉', '豆腐干', '芹菜'], protein: 1 },
      { name: '地瓜粥', kcal: 160, taste: [], veg: ['地瓜', '米'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '米粉', kcal: 180 },
      { name: '粥底', kcal: 100 }
    ],
    fruits: [
      { name: '芒果', kcal: 100 },
      { name: '芭乐', kcal: 55 }
    ]
  },
  // ========== 13. 烧腊卤味 ==========
  {
    key: 'shaola',
    name: '烧腊卤味',
    cuisine: '烧腊',
    dishes: [
      { name: '蜜汁叉烧', kcal: 290, taste: ['甜'], veg: ['猪肉'], protein: 1 },
      { name: '脆皮烧鸭', kcal: 320, taste: ['油腻'], veg: ['鸭肉'], protein: 1 },
      { name: '豉油鸡', kcal: 260, taste: [], veg: ['鸡肉'], protein: 1 },
      { name: '卤水拼盘', kcal: 230, taste: [], veg: ['豆腐', '蛋', '牛腱'], protein: 1 },
      { name: '烧肉', kcal: 340, taste: ['油腻'], veg: ['猪肉'], protein: 1 },
      { name: '卤鸡爪', kcal: 150, taste: [], veg: ['鸡爪'], protein: 0 },
      { name: '蒜蓉白肉', kcal: 220, taste: [], veg: ['猪肉', '蒜'], protein: 1 },
      { name: '盐水鸭胗', kcal: 130, taste: [], veg: ['鸭胗'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '杂粮饭', kcal: 210 },
      { name: '馒头', kcal: 220 }
    ],
    fruits: [
      { name: '苹果', kcal: 95 },
      { name: '柚子', kcal: 70 }
    ]
  },
  // ========== 14. 蒸炖汤品 ==========
  {
    key: 'zhengdun',
    name: '蒸炖汤品',
    cuisine: '蒸炖',
    dishes: [
      { name: '花胶炖鸡汤', kcal: 180, taste: [], veg: ['鸡', '花胶'], protein: 1 },
      { name: '炖盅排骨汤', kcal: 200, taste: [], veg: ['排骨', '玉米', '胡萝卜'], protein: 1 },
      { name: '蒸水蛋', kcal: 120, taste: [], veg: ['蛋'], protein: 1 },
      { name: '粉蒸肉', kcal: 310, taste: [], veg: ['猪肉', '米粉'], protein: 1 },
      { name: '清蒸鲈鱼（蒸）', kcal: 200, taste: [], veg: ['鲈鱼', '葱', '姜'], protein: 1 },
      { name: '木瓜炖雪蛤', kcal: 130, taste: [], veg: ['木瓜'], protein: 0 },
      { name: '莲藕排骨汤', kcal: 190, taste: [], veg: ['莲藕', '排骨'], protein: 1 },
      { name: '玉竹沙参汤', kcal: 100, taste: [], veg: ['玉竹', '沙参', '鸡'], protein: 0 }
    ],
    staples: [
      { name: '白米饭', kcal: 230 },
      { name: '小米粥', kcal: 120 },
      { name: '蒸红薯', kcal: 100 }
    ],
    fruits: [
      { name: '雪梨', kcal: 80 },
      { name: '苹果', kcal: 95 }
    ]
  }
];

module.exports = { FLAVORS };
