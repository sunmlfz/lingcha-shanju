/**
 * QuestConfig - 任务配置数据
 */

export type QuestType = 'plant' | 'harvest' | 'brew' | 'drink' | 'sell' | 'level';

export interface DailyQuestConfig {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  targetValue: number;        // 目标数量
  targetTea?: string;         // 特定茶种（可选）
  rewards: QuestReward;
}

export interface MainQuestConfig {
  chapter: number;
  title: string;
  story: string;              // 剧情文本
  tasks: MainQuestTask[];
  reward: QuestReward;
  unlocks?: string[];         // 解锁内容
}

export interface MainQuestTask {
  id: string;
  description: string;
  type: QuestType;
  targetValue: number;
  targetTea?: string;
}

export interface QuestReward {
  gold?: number;
  enlightenment?: number;
  items?: { id: string; name: string; amount: number }[];
  unlockTea?: string;
}

export interface AchievementConfig {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  targetValue: number;
  targetTea?: string;
  reward: QuestReward;
  hidden?: boolean;           // 隐藏成就
}

// ─── 日常任务池 ───

export const DAILY_QUEST_POOL: DailyQuestConfig[] = [
  {
    id: 'daily_plant_3',
    name: '晨间播种',
    description: '今日种植 3 株茶苗',
    type: 'plant',
    targetValue: 3,
    rewards: { gold: 20, enlightenment: 5 },
  },
  {
    id: 'daily_harvest_2',
    name: '秋日采摘',
    description: '采摘 2 块地的茶叶',
    type: 'harvest',
    targetValue: 2,
    rewards: { gold: 30, enlightenment: 8 },
  },
  {
    id: 'daily_brew_1',
    name: '一炉新茶',
    description: '完成 1 次炼茶',
    type: 'brew',
    targetValue: 1,
    rewards: { gold: 40, enlightenment: 10 },
  },
  {
    id: 'daily_drink_2',
    name: '晚课品茗',
    description: '品茶 2 次',
    type: 'drink',
    targetValue: 2,
    rewards: { gold: 25, enlightenment: 15 },
  },
  {
    id: 'daily_plant_green_2',
    name: '绿茶小径',
    description: '种植 2 株绿茶',
    type: 'plant',
    targetTea: 'green_tea',
    targetValue: 2,
    rewards: { gold: 15, enlightenment: 5 },
  },
  {
    id: 'daily_sell_10',
    name: '换茶买米',
    description: '出售获得至少 50 金叶',
    type: 'sell',
    targetValue: 50,
    rewards: { gold: 20, items: [{ id: 'fertilizer', name: '灵肥', amount: 1 }] },
  },
  {
    id: 'daily_harvest_longjing',
    name: '采摘龙井',
    description: '采摘 1 批龙井茶叶',
    type: 'harvest',
    targetTea: 'longjing_tea',
    targetValue: 1,
    rewards: { gold: 60, enlightenment: 20 },
  },
  {
    id: 'daily_brew_premium',
    name: '炼制精品',
    description: '炼制 1 份精品或极品茶',
    type: 'brew',
    targetValue: 1,
    rewards: { gold: 80, enlightenment: 25 },
  },
];

// ─── 主线任务（20 章） ───

export const MAIN_QUESTS: MainQuestConfig[] = [
  {
    chapter: 1,
    title: '初入灵茶山',
    story: '你踏入云雾缭绕的灵茶山，山中茶气弥漫，令人心旷神怡。\n老茶农留下了几块荒废的茶圃，或许可以从这里开始...',
    tasks: [
      { id: 'ch1_plant', description: '种植第一株绿茶', type: 'plant', targetTea: 'green_tea', targetValue: 1 },
    ],
    reward: { gold: 50, enlightenment: 10, items: [{ id: 'fertilizer', name: '灵肥', amount: 2 }] },
    unlocks: ['white_tea'],
  },
  {
    chapter: 2,
    title: '第一炉茶',
    story: '茶叶已初具规模，是时候学习炼茶之术了。\n山中有一座古老的炼茶台，等待着有缘人将其重启...',
    tasks: [
      { id: 'ch2_brew', description: '完成第一次炼茶', type: 'brew', targetValue: 1 },
    ],
    reward: { gold: 80, enlightenment: 20 },
  },
  {
    chapter: 3,
    title: '品茗悟道',
    story: '茶已炼成，却不知其味。\n坐在山间石台上，静心品饮，方知茶中有乾坤...',
    tasks: [
      { id: 'ch3_drink', description: '品茶 3 次', type: 'drink', targetValue: 3 },
    ],
    reward: { gold: 60, enlightenment: 30, unlockTea: 'black_tea' },
    unlocks: ['black_tea'],
  },
  {
    chapter: 4,
    title: '扩建茶圃',
    story: '茶圃渐渐不够用了，山地广阔，可以开垦新的地块。\n但山石坚硬，需要足够的金叶购置农具...',
    tasks: [
      { id: 'ch4_gold', description: '积攒 200 金叶', type: 'sell', targetValue: 200 },
    ],
    reward: { gold: 100, enlightenment: 15 },
  },
  {
    chapter: 5,
    title: '四季茶香',
    story: '春绿、夏红、秋乌、冬白，四季各有其茶。\n将四种茶叶一一种下，感受不同时节的茶韵...',
    tasks: [
      { id: 'ch5_plant_4', description: '种植四种不同茶叶各一次', type: 'plant', targetValue: 4 },
    ],
    reward: { gold: 150, enlightenment: 40, unlockTea: 'oolong_tea' },
    unlocks: ['oolong_tea'],
  },
];

// ─── 成就配置 ───

export const ACHIEVEMENTS: AchievementConfig[] = [
  {
    id: 'first_harvest',
    name: '初次收获',
    description: '首次采摘茶叶',
    type: 'harvest',
    targetValue: 1,
    reward: { gold: 10, enlightenment: 5 },
  },
  {
    id: 'harvest_100',
    name: '丰收之年',
    description: '累计采摘 100 次',
    type: 'harvest',
    targetValue: 100,
    reward: { gold: 200, enlightenment: 50 },
  },
  {
    id: 'brew_10',
    name: '初入茶道',
    description: '累计炼茶 10 次',
    type: 'brew',
    targetValue: 10,
    reward: { gold: 100, enlightenment: 30 },
  },
  {
    id: 'brew_100',
    name: '炼茶大师',
    description: '累计炼茶 100 次',
    type: 'brew',
    targetValue: 100,
    reward: { gold: 500, enlightenment: 100 },
  },
  {
    id: 'drink_50',
    name: '嗜茶如命',
    description: '累计品茶 50 次',
    type: 'drink',
    targetValue: 50,
    reward: { gold: 150, enlightenment: 80 },
  },
  {
    id: 'enlightenment_1000',
    name: '茶道宗师',
    description: '悟道值达到 1000',
    type: 'level',
    targetValue: 1000,
    reward: { gold: 1000, enlightenment: 0, unlockTea: 'ancient_puer' },
  },
  {
    id: 'all_teas',
    name: '茶圃百科',
    description: '解锁所有茶种',
    type: 'plant',
    targetValue: 9,
    reward: { gold: 500, items: [{ id: 'master_teacup', name: '宗师茶杯', amount: 1 }] },
  },
  {
    id: 'secret_supreme',
    name: '极品茶仙',
    description: '炼制 10 份极品茶',
    type: 'brew',
    targetValue: 10,
    reward: { gold: 300, enlightenment: 200 },
    hidden: true,
  },
];

/** 随机生成每日任务（从任务池中选 3 个） */
export function generateDailyQuests(): DailyQuestConfig[] {
  const pool = [...DAILY_QUEST_POOL];
  const selected: DailyQuestConfig[] = [];
  while (selected.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}
