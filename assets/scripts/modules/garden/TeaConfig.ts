/**
 * TeaConfig - 茶种配置数据
 * 所有茶叶品种的属性定义
 */

export interface TeaTypeConfig {
  id: string;
  name: string;
  nameCN: string;
  tier: 'normal' | 'spirit' | 'immortal'; // 普通/灵品/仙品
  growthTimeSeconds: number;  // 从播种到成熟（秒）
  baseGold: number;           // 基础金叶价值（每单位）
  baseEnlightenment: number;  // 基础悟道值
  unlockCondition: string;    // 解锁条件描述
  unlockEnlightenment?: number; // 需要的悟道值
  description: string;
  harvestAmount: [number, number]; // 收获数量范围 [min, max]
  poems: string[];            // 品茶意境诗句池
}

export const TEA_CONFIGS: Record<string, TeaTypeConfig> = {
  green_tea: {
    id: 'green_tea',
    name: 'Green Tea',
    nameCN: '绿茶',
    tier: 'normal',
    growthTimeSeconds: 300,   // 5 分钟
    baseGold: 10,
    baseEnlightenment: 5,
    unlockCondition: '初始解锁',
    description: '清香淡雅，回甘悠长，最基础的灵茶入门之选。',
    harvestAmount: [2, 4],
    poems: [
      '一盏绿茗，万里云烟散。',
      '清风入怀，茶香绕指间。',
      '碧水映青山，茶韵自悠然。',
    ],
  },

  white_tea: {
    id: 'white_tea',
    name: 'White Tea',
    nameCN: '白茶',
    tier: 'normal',
    growthTimeSeconds: 600,   // 10 分钟
    baseGold: 20,
    baseEnlightenment: 10,
    unlockCondition: '初始解锁',
    description: '毫香蜜韵，滋味清淡，性寒而润，最宜静思。',
    harvestAmount: [2, 3],
    poems: [
      '白毫如雪，静待心清。',
      '无声处听茶，恍若得道。',
      '素雅一盏，洗去尘嚣。',
    ],
  },

  black_tea: {
    id: 'black_tea',
    name: 'Black Tea',
    nameCN: '红茶',
    tier: 'normal',
    growthTimeSeconds: 480,   // 8 分钟
    baseGold: 15,
    baseEnlightenment: 8,
    unlockCondition: '达到 2 级',
    description: '浓郁醇厚，色泽红艳，暖心暖胃，驱散山间寒意。',
    harvestAmount: [2, 4],
    poems: [
      '红汤入喉，如秋日暖阳。',
      '醇厚绵长，心旷神怡时。',
      '一盏红茶，尽是人间烟火。',
    ],
  },

  oolong_tea: {
    id: 'oolong_tea',
    name: 'Oolong Tea',
    nameCN: '乌龙',
    tier: 'normal',
    growthTimeSeconds: 720,   // 12 分钟
    baseGold: 25,
    baseEnlightenment: 12,
    unlockCondition: '达到 3 级',
    description: '半发酵之茶，兼具绿茶清香与红茶醇厚，变化无穷。',
    harvestAmount: [1, 3],
    poems: [
      '乌龙一泡，七变其味。',
      '青峰烟雨里，独饮无言处。',
      '千回百转，方得真味。',
    ],
  },

  longjing_tea: {
    id: 'longjing_tea',
    name: 'Longjing Tea',
    nameCN: '雨前龙井',
    tier: 'spirit',
    growthTimeSeconds: 1800,  // 30 分钟
    baseGold: 80,
    baseEnlightenment: 40,
    unlockCondition: '悟道值达 100',
    unlockEnlightenment: 100,
    description: '明前采摘，扁平光滑，色翠香郁，乃灵品茶中之上品。',
    harvestAmount: [1, 2],
    poems: [
      '雨前一叶，含尽春色。',
      '龙井清韵，悟道之始。',
      '品此一盏，胜读万卷书。',
    ],
  },

  silver_needle: {
    id: 'silver_needle',
    name: 'Silver Needle',
    nameCN: '白毫银针',
    tier: 'spirit',
    growthTimeSeconds: 1800,
    baseGold: 90,
    baseEnlightenment: 45,
    unlockCondition: '悟道值达 150',
    unlockEnlightenment: 150,
    description: '白毫满披，形如银针，香气清鲜，是白茶中的极品。',
    harvestAmount: [1, 2],
    poems: [
      '针针白毫，如月华落世间。',
      '银针入杯，道心渐明。',
      '一白胜三清，此茶通仙境。',
    ],
  },

  lapsang_souchong: {
    id: 'lapsang_souchong',
    name: 'Lapsang Souchong',
    nameCN: '正山小种',
    tier: 'spirit',
    growthTimeSeconds: 2400,
    baseGold: 100,
    baseEnlightenment: 50,
    unlockCondition: '悟道值达 200',
    unlockEnlightenment: 200,
    description: '松烟香气独特，汤色橙红，口感醇滑，令人神清气爽。',
    harvestAmount: [1, 2],
    poems: [
      '松烟缭绕，此茶有神。',
      '远山烟火气，尽在一盏中。',
      '正山之茶，感天地灵气。',
    ],
  },

  spirit_bud: {
    id: 'spirit_bud',
    name: 'Spirit Bud Tea',
    nameCN: '灵芽仙露',
    tier: 'immortal',
    growthTimeSeconds: 3600,  // 60 分钟
    baseGold: 200,
    baseEnlightenment: 100,
    unlockCondition: '完成主线第 10 章',
    description: '仙山灵气凝聚而成，饮一口可感悟天地大道，极为珍贵。',
    harvestAmount: [1, 1],
    poems: [
      '一滴仙露，悟尽三千大道。',
      '灵芽入喉，如登九天云端。',
      '此茶非人间物，饮之可得长生之意。',
    ],
  },

  ancient_puer: {
    id: 'ancient_puer',
    name: 'Ancient Tree Pu-er',
    nameCN: '千年古树普洱',
    tier: 'immortal',
    growthTimeSeconds: 7200,  // 120 分钟（需施肥缩短）
    baseGold: 500,
    baseEnlightenment: 200,
    unlockCondition: '完成成就「茶道宗师」',
    description: '千年古树之叶，历经岁月沉淀，一饮通晓古今，悟道之最。',
    harvestAmount: [1, 1],
    poems: [
      '千年古树，一叶知秋。',
      '岁月沉香，皆在此盏。',
      '古今往来，唯此茶不变。',
    ],
  },
};

/** 获取所有已排序的茶种列表（按等级和生长时间） */
export function getAllTeaTypes(): TeaTypeConfig[] {
  const tierOrder = { normal: 0, spirit: 1, immortal: 2 };
  return Object.values(TEA_CONFIGS).sort((a, b) => {
    if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier];
    return a.growthTimeSeconds - b.growthTimeSeconds;
  });
}

/** 根据 ID 获取茶种配置 */
export function getTeaConfig(id: string): TeaTypeConfig | null {
  return TEA_CONFIGS[id] ?? null;
}

/** 获取某等级所有茶种 */
export function getTeasByTier(tier: TeaTypeConfig['tier']): TeaTypeConfig[] {
  return Object.values(TEA_CONFIGS).filter(t => t.tier === tier);
}
