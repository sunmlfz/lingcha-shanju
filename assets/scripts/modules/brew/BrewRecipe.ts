/**
 * BrewRecipe - 炼茶配方数据
 */

export interface RecipeMaterial {
  teaType: string;   // 茶叶原料 ID
  amount: number;    // 需要数量
}

export interface BrewRecipeConfig {
  id: string;
  name: string;
  nameCN: string;
  materials: RecipeMaterial[];
  durationSeconds: number;    // 炼制时长（秒）
  outputId: string;           // 产出成品 ID
  outputName: string;
  baseQuality: number;        // 基础品质分（0-100）
  unlockCondition: string;
  requiredEnlightenment?: number;
  description: string;
  qualityBonus: {             // 迷你游戏品质加成配置
    perfect: number;          // 完美操作加成
    good: number;
    miss: number;             // 失误惩罚
  };
}

export const BREW_RECIPES: Record<string, BrewRecipeConfig> = {
  basic_green: {
    id: 'basic_green',
    name: 'Basic Green Tea',
    nameCN: '手工绿茶',
    materials: [{ teaType: 'green_tea', amount: 3 }],
    durationSeconds: 120,     // 2 分钟
    outputId: 'brewed_green',
    outputName: '手工绿茶（成品）',
    baseQuality: 50,
    unlockCondition: '初始解锁',
    description: '以绿茶为原料，简单炒制而成，清香宜人。',
    qualityBonus: { perfect: 20, good: 10, miss: -15 },
  },

  basic_white: {
    id: 'basic_white',
    name: 'Basic White Tea',
    nameCN: '萎凋白茶',
    materials: [{ teaType: 'white_tea', amount: 2 }],
    durationSeconds: 180,
    outputId: 'brewed_white',
    outputName: '萎凋白茶（成品）',
    baseQuality: 55,
    unlockCondition: '悟道值达 30',
    requiredEnlightenment: 30,
    description: '白茶萎凋工艺，保留最多天然成分，滋味清淡。',
    qualityBonus: { perfect: 22, good: 12, miss: -12 },
  },

  basic_black: {
    id: 'basic_black',
    name: 'Basic Black Tea',
    nameCN: '揉捻红茶',
    materials: [{ teaType: 'black_tea', amount: 3 }],
    durationSeconds: 150,
    outputId: 'brewed_black',
    outputName: '揉捻红茶（成品）',
    baseQuality: 52,
    unlockCondition: '悟道值达 20',
    requiredEnlightenment: 20,
    description: '全发酵工艺，经揉捻塑形，汤色红亮，滋味浓郁。',
    qualityBonus: { perfect: 20, good: 10, miss: -15 },
  },

  basic_oolong: {
    id: 'basic_oolong',
    name: 'Basic Oolong Tea',
    nameCN: '半发酵乌龙',
    materials: [{ teaType: 'oolong_tea', amount: 2 }, { teaType: 'green_tea', amount: 1 }],
    durationSeconds: 200,
    outputId: 'brewed_oolong',
    outputName: '半发酵乌龙（成品）',
    baseQuality: 60,
    unlockCondition: '悟道值达 50',
    requiredEnlightenment: 50,
    description: '介于绿红之间，兼具两者之长，工艺最为繁琐。',
    qualityBonus: { perfect: 25, good: 12, miss: -18 },
  },

  longjing_premium: {
    id: 'longjing_premium',
    name: 'Premium Longjing',
    nameCN: '极品龙井',
    materials: [{ teaType: 'longjing_tea', amount: 2 }],
    durationSeconds: 600,
    outputId: 'brewed_longjing',
    outputName: '极品龙井（成品）',
    baseQuality: 75,
    unlockCondition: '悟道值达 120',
    requiredEnlightenment: 120,
    description: '手工炒制雨前龙井，火候分秒必争，成则极品。',
    qualityBonus: { perfect: 30, good: 15, miss: -25 },
  },

  blended_spring: {
    id: 'blended_spring',
    name: 'Spring Blend',
    nameCN: '春日拼配茶',
    materials: [
      { teaType: 'green_tea', amount: 2 },
      { teaType: 'white_tea', amount: 1 },
      { teaType: 'longjing_tea', amount: 1 },
    ],
    durationSeconds: 480,
    outputId: 'brewed_spring_blend',
    outputName: '春日拼配茶（成品）',
    baseQuality: 80,
    unlockCondition: '完成任务「春日茶会」',
    description: '三种灵茶精心拼配，层次丰富，香气悠长。',
    qualityBonus: { perfect: 35, good: 18, miss: -20 },
  },

  spirit_elixir: {
    id: 'spirit_elixir',
    name: 'Spirit Elixir',
    nameCN: '灵露仙酿',
    materials: [
      { teaType: 'spirit_bud', amount: 1 },
      { teaType: 'silver_needle', amount: 1 },
    ],
    durationSeconds: 1800,
    outputId: 'brewed_spirit_elixir',
    outputName: '灵露仙酿（成品）',
    baseQuality: 95,
    unlockCondition: '完成主线第 15 章',
    description: '仙品茶之极致，饮之有飘然欲仙之感，悟道值大增。',
    qualityBonus: { perfect: 50, good: 25, miss: -30 },
  },
};

/** 获取所有配方列表 */
export function getAllRecipes(): BrewRecipeConfig[] {
  return Object.values(BREW_RECIPES);
}

/** 根据 ID 获取配方 */
export function getRecipe(id: string): BrewRecipeConfig | null {
  return BREW_RECIPES[id] ?? null;
}

/** 获取已解锁配方（根据悟道值） */
export function getUnlockedRecipes(enlightenment: number): BrewRecipeConfig[] {
  return Object.values(BREW_RECIPES).filter(r => {
    return !r.requiredEnlightenment || enlightenment >= r.requiredEnlightenment;
  });
}

/** 计算最终品质等级 */
export function calcQualityTier(qualityScore: number): 'normal' | 'premium' | 'supreme' {
  if (qualityScore >= 90) return 'supreme';
  if (qualityScore >= 70) return 'premium';
  return 'normal';
}

/** 品质等级中文名 */
export const QUALITY_NAMES: Record<string, string> = {
  normal: '普通',
  premium: '精品',
  supreme: '极品',
};
