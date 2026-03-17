/**
 * SenseManager - 品茶/悟道管理器
 * 处理品茶体验、悟道值积累、意境诗句展示、茶友拜访
 */

import { _decorator, Component, director } from 'cc';
import { EventBus, GameEvent } from '../../core/EventBus';
import { GameDataManager, SixSensesData } from '../../core/GameDataManager';
import { getTeaConfig } from '../garden/TeaConfig';
import {
  TEA_SENSE_AFFINITY,
  extractTeaTypeFromItemId,
  calcSenseBonus,
  calcSenseExpGain,
  SENSE_NAMES,
  SenseKey,
} from './SixSensesConfig';

const { ccclass, property } = _decorator;

export interface SenseLevelUpInfo {
  sense: SenseKey;
  senseName: string;
  newLevel: number;
}

export interface SenseResult {
  enlightenmentGain: number;     // 最终悟道值（含六识加成）
  baseEnlightenment: number;     // 品质加成后的基础悟道值（未含六识）
  senseBonus: number;            // 六识加成系数（例：0.3 = +30%）
  senseExpGains: Partial<Record<SenseKey, number>>; // 各六识经验获取情况
  senseLevelUps: SenseLevelUpInfo[];  // 本次品茶触发的六识升级列表
  poem: string;
  teaName: string;
  qualityTier: string;
  specialEffect?: string;        // 'inspiration_fragment' | 'npc_visit' | null
  inspirationGained?: boolean;
}

export interface Enlightenment {
  level: number;
  name: string;
  description: string;
  reward: string;
}

const ENLIGHTENMENT_MILESTONES: Enlightenment[] = [
  { level: 50,   name: '初识茶香',   description: '你已初窥茶道之门。',        reward: '解锁白茶种植' },
  { level: 100,  name: '茶心澄明',   description: '心如止水，茶道渐悟。',      reward: '解锁龙井配方' },
  { level: 200,  name: '灵台清净',   description: '万虑皆空，只余茶香。',      reward: '解锁第二炼茶台' },
  { level: 500,  name: '茶道入微',   description: '一叶知秋，洞察茶韵。',      reward: '解锁仙品茶' },
  { level: 1000, name: '灵茶宗师',   description: '悟透茶道，已至化境。',      reward: '解锁千年古树普洱' },
  { level: 2000, name: '茶仙',       description: '与天地共呼吸，茶即道也。',  reward: '解锁隐藏结局' },
];

/** 茶友 NPC 配置 */
interface TeaFriend {
  id: string;
  name: string;
  description: string;
  giftOptions: string[];    // 可能带来的礼物
  likedTeas: string[];      // 偏好的茶
}

const TEA_FRIENDS: TeaFriend[] = [
  { id: 'old_monk',  name: '云游老僧',   description: '行脚天下的苦行僧，见多识广。', giftOptions: ['rare_seed', 'fertilizer'],         likedTeas: ['white_tea', 'silver_needle'] },
  { id: 'tea_poet',  name: '采茶诗人',   description: '以茶入诗，以诗颂茶的文人。',   giftOptions: ['poem_scroll', 'water_crystal'],    likedTeas: ['longjing_tea', 'green_tea'] },
  { id: 'herb_girl', name: '山野药姑',   description: '采药为生，精通草木之性。',     giftOptions: ['herb_bundle', 'growth_boost'],     likedTeas: ['oolong_tea', 'black_tea'] },
  { id: 'old_farmer',name: '茶农老伯',   description: '种茶数十年的老茶农，经验丰富。', giftOptions: ['fertilizer', 'rare_seed'],       likedTeas: ['black_tea', 'green_tea'] },
  { id: 'immortal',  name: '过路仙人',   description: '偶尔下凡尝鲜的仙人，神秘莫测。', giftOptions: ['spirit_crystal', 'elixir'],     likedTeas: ['spirit_bud', 'ancient_puer'] },
];

@ccclass('SenseManager')
export class SenseManager extends Component {
  private static _instance: SenseManager | null = null;

  /** 灵感碎片（凑齐 5 片触发特殊事件） */
  private _inspirationFragments: number = 0;
  private readonly INSPIRATION_THRESHOLD = 5;

  /** 今日茶友拜访次数 */
  private _todayNpcVisits: number = 0;
  private readonly MAX_DAILY_NPC_VISITS = 3;

  static get instance(): SenseManager {
    return SenseManager._instance!;
  }

  onLoad() {
    if (SenseManager._instance && SenseManager._instance !== this) {
      this.destroy();
      return;
    }
    SenseManager._instance = this;
    director.addPersistRootNode(this.node);
  }

  onDestroy() {
    if (SenseManager._instance === this) {
      SenseManager._instance = null;
    }
  }

  // ─── 品茶核心逻辑 ───

  /**
   * 品茶
   * @param itemId 成品茶 ID（格式：outputId_qualityTier）
   * @returns 品茶结果
   */
  drinkTea(itemId: string): SenseResult | null {
    const gdm = GameDataManager.instance;
    if (!gdm) return null;

    const storage = gdm.storage;
    const item = storage.items.find(i => i.id === itemId && i.type === 'brewed_tea');
    if (!item || item.amount <= 0) {
      console.warn(`[SenseManager] 找不到成品茶: ${itemId}`);
      return null;
    }

    // 消耗一份成品茶
    item.amount--;
    if (item.amount <= 0) {
      storage.items.splice(storage.items.indexOf(item), 1);
    }

    // ── 1. 品质倍率 ──
    const quality = item.quality ?? 0;
    const qualityMultipliers = [1, 1.5, 3.0];
    const qualityMultiplier = qualityMultipliers[quality] ?? 1;

    // ── 2. 基础悟道值（品质倍率已乘） ──
    const rawBase = this.getBaseEnlightenmentFromItem(item.name);
    const baseEnlightenment = Math.round(rawBase * qualityMultiplier);

    // ── 3. 六识加成 ──
    const teaType = extractTeaTypeFromItemId(itemId);
    const affinities = TEA_SENSE_AFFINITY[teaType] ?? [];

    // 构建当前六识等级 map
    const sixSenses = gdm.player.sixSenses;
    const senseLevels = {
      vision:        sixSenses.vision.level,
      hearing:       sixSenses.hearing.level,
      smell:         sixSenses.smell.level,
      taste:         sixSenses.taste.level,
      touch:         sixSenses.touch.level,
      consciousness: sixSenses.consciousness.level,
    } as Record<SenseKey, number>;

    const senseBonus = calcSenseBonus(affinities, senseLevels);
    const enlightenmentGain = Math.round(baseEnlightenment * (1 + senseBonus));

    // ── 4. 六识经验成长 ──
    const senseExpGains = calcSenseExpGain(affinities, rawBase, qualityMultiplier);
    const senseLevelUps: SenseLevelUpInfo[] = [];
    for (const [key, exp] of Object.entries(senseExpGains) as [SenseKey, number][]) {
      const leveledUp = gdm.addSenseExp(key, exp);
      if (leveledUp) {
        senseLevelUps.push({
          sense: key,
          senseName: SENSE_NAMES[key],
          newLevel: gdm.player.sixSenses[key].level,
        });
      }
    }

    // ── 5. 意境诗句 ──
    const poem = this.getTeaPoem(itemId);

    // ── 6. 特殊效果 ──
    const specialEffect = this.rollSpecialEffect(quality);
    let inspirationGained = false;
    if (specialEffect === 'inspiration_fragment') {
      inspirationGained = this.addInspirationFragment();
    }

    // ── 7. 更新悟道值 ──
    gdm.addEnlightenment(enlightenmentGain);
    gdm.player.totalDrinkCount++;
    gdm.checkLevelUp();

    const qualityNames = ['普通', '精品', '极品'];

    const result: SenseResult = {
      enlightenmentGain,
      baseEnlightenment,
      senseBonus,
      senseExpGains,
      senseLevelUps,
      poem,
      teaName: item.name,
      qualityTier: qualityNames[quality] ?? '普通',
      specialEffect: specialEffect ?? undefined,
      inspirationGained,
    };

    EventBus.emit(GameEvent.SENSE_RESULT, result);
    EventBus.emit(GameEvent.STORAGE_CHANGED);
    gdm.save();

    return result;
  }

  /**
   * 获取茶的意境描述（随机从配置池中选取）
   */
  getTeaPoem(teaOrItemId: string): string {
    // 尝试从茶种 ID 匹配
    const teaId = teaOrItemId.split('_brewed')[0].replace('brewed_', '');
    const config = getTeaConfig(teaId);
    if (config && config.poems.length > 0) {
      return config.poems[Math.floor(Math.random() * config.poems.length)];
    }
    // 默认诗句
    const defaultPoems = [
      '一盏清茶，万念俱灰，只余此刻宁静。',
      '茶香袅袅，不知今夕是何年。',
      '品茶如悟道，皆在一心。',
      '山高水长，不如一盏好茶。',
      '茶是人间清醒剂，一饮忘尘嚣。',
    ];
    return defaultPoems[Math.floor(Math.random() * defaultPoems.length)];
  }

  /**
   * 检查是否达到新的悟道里程碑
   */
  checkEnlightenmentMilestone(current: number): Enlightenment | null {
    const prev = current - 1;
    for (const milestone of ENLIGHTENMENT_MILESTONES) {
      if (prev < milestone.level && current >= milestone.level) {
        return milestone;
      }
    }
    return null;
  }

  /**
   * 触发茶友拜访（每日最多 3 次）
   */
  triggerNpcVisit(): TeaFriend | null {
    if (this._todayNpcVisits >= this.MAX_DAILY_NPC_VISITS) return null;
    this._todayNpcVisits++;
    const friend = TEA_FRIENDS[Math.floor(Math.random() * TEA_FRIENDS.length)];
    return friend;
  }

  /** 重置每日茶友拜访次数 */
  resetDailyVisits(): void {
    this._todayNpcVisits = 0;
  }

  // ─── 灵感碎片 ───

  private addInspirationFragment(): boolean {
    this._inspirationFragments++;
    if (this._inspirationFragments >= this.INSPIRATION_THRESHOLD) {
      this._inspirationFragments = 0;
      // 触发特殊剧情事件
      EventBus.emit('inspiration_complete');
      return true;
    }
    return false;
  }

  get inspirationFragments(): number {
    return this._inspirationFragments;
  }

  // ─── 内部工具 ───

  private rollSpecialEffect(quality: number): string | null {
    // 极品茶有 20% 概率触发特殊效果，精品 10%，普通 3%
    const chance = [0.03, 0.10, 0.20][quality] ?? 0.03;
    if (Math.random() < chance) {
      return Math.random() < 0.5 ? 'inspiration_fragment' : 'npc_visit';
    }
    return null;
  }

  private getBaseEnlightenmentFromItem(itemName: string): number {
    // 简单根据名称中的关键词估算悟道值
    if (itemName.includes('仙')) return 100;
    if (itemName.includes('极品') || itemName.includes('龙井') || itemName.includes('灵')) return 60;
    if (itemName.includes('精品') || itemName.includes('银针') || itemName.includes('正山')) return 35;
    if (itemName.includes('乌龙') || itemName.includes('红茶')) return 15;
    return 10;
  }
}
