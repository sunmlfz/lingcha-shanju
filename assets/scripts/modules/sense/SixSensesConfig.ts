/**
 * SixSensesConfig - 六识系统配置
 * 定义六识属性、茶种与六识的关联关系、以及成长公式
 *
 * 六识：视觉 / 听觉 / 嗅觉 / 味觉 / 触觉 / 意识
 * 每识等级 1-10，等级越高对品茶悟道收益加成越大
 */

/** 六识属性键名 */
export type SenseKey = 'vision' | 'hearing' | 'smell' | 'taste' | 'touch' | 'consciousness';

/** 六识中文名 */
export const SENSE_NAMES: Record<SenseKey, string> = {
  vision:        '视觉',
  hearing:       '听觉',
  smell:         '嗅觉',
  taste:         '味觉',
  touch:         '触觉',
  consciousness: '意识',
};

/** 每级升级所需经验（指数增长） */
export function expToNextLevel(currentLevel: number): number {
  return Math.floor(20 * Math.pow(1.6, currentLevel - 1));
}

/**
 * 茶种 → 关联六识映射
 * 每次品茶，关联六识获得经验，并对悟道值提供加成
 * weight 表示该茶对此识的敏感度（0.0-1.0），影响经验获取量
 */
export interface SenseAffinity {
  sense: SenseKey;
  weight: number; // 0.0-1.0，影响经验获取量
}

export const TEA_SENSE_AFFINITY: Record<string, SenseAffinity[]> = {
  // 普通茶
  green_tea:         [{ sense: 'vision', weight: 0.6 }, { sense: 'smell', weight: 0.4 }],
  white_tea:         [{ sense: 'hearing', weight: 0.5 }, { sense: 'smell', weight: 0.5 }],
  black_tea:         [{ sense: 'taste', weight: 0.6 }, { sense: 'touch', weight: 0.4 }],
  oolong_tea:        [{ sense: 'smell', weight: 0.5 }, { sense: 'taste', weight: 0.5 }],

  // 灵品茶
  longjing_tea:      [{ sense: 'vision', weight: 0.4 }, { sense: 'smell', weight: 0.4 }, { sense: 'consciousness', weight: 0.2 }],
  silver_needle:     [{ sense: 'hearing', weight: 0.5 }, { sense: 'vision', weight: 0.5 }],
  lapsang_souchong:  [{ sense: 'touch', weight: 0.5 }, { sense: 'taste', weight: 0.5 }],

  // 仙品茶
  spirit_bud:        [
    { sense: 'consciousness', weight: 0.4 },
    { sense: 'vision', weight: 0.15 },
    { sense: 'hearing', weight: 0.15 },
    { sense: 'smell', weight: 0.1 },
    { sense: 'taste', weight: 0.1 },
    { sense: 'touch', weight: 0.1 },
  ],
  ancient_puer:      [{ sense: 'consciousness', weight: 0.4 }, { sense: 'touch', weight: 0.35 }, { sense: 'taste', weight: 0.25 }],
};

/** 从炼制品 itemId 中解析茶种 */
export function extractTeaTypeFromItemId(itemId: string): string {
  // itemId 格式示例: brewed_green_tea_normal / brewed_longjing_tea_premium
  const match = itemId.replace(/^brewed_/, '').replace(/_(normal|premium|supreme)$/, '');
  return match || itemId;
}

/**
 * 计算六识对悟道收益的加成系数
 *
 * 公式：bonus = sum(relevantSenseLevels * weight * 0.05)
 * 即：每识每级提供 5% × weight 的额外加成
 * 最大加成（全满级）约 +250%，使顶级玩家收益显著提升
 *
 * @param affinities  该茶种关联的六识列表
 * @param senseLevels 当前六识等级 Record<SenseKey, number>
 */
export function calcSenseBonus(
  affinities: SenseAffinity[],
  senseLevels: Record<SenseKey, number>,
): number {
  let bonus = 0;
  for (const { sense, weight } of affinities) {
    const level = senseLevels[sense] ?? 1;
    bonus += (level - 1) * weight * 0.05; // level 1 无加成，每升一级 +5%*weight
  }
  return bonus;
}

/**
 * 计算品茶后各六识获得的经验值
 *
 * @param affinities      该茶种关联的六识列表
 * @param baseExp         品茶基础经验（与悟道基础值挂钩）
 * @param qualityBonus    品质加成系数（普通=1, 精品=1.5, 极品=3）
 */
export function calcSenseExpGain(
  affinities: SenseAffinity[],
  baseExp: number,
  qualityBonus: number,
): Partial<Record<SenseKey, number>> {
  const result: Partial<Record<SenseKey, number>> = {};
  for (const { sense, weight } of affinities) {
    result[sense] = Math.max(1, Math.round(baseExp * qualityBonus * weight));
  }
  return result;
}
