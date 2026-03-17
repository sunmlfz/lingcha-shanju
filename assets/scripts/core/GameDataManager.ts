/**
 * GameDataManager - 全局数据管理中心（单例）
 * 管理所有游戏状态，提供存读档接口
 */

import { _decorator, Component, director } from 'cc';
import { EventBus, GameEvent } from './EventBus';
import { SaveUtils } from '../utils/SaveUtils';

const { ccclass, property } = _decorator;

// ─────────────────── 数据接口定义 ───────────────────

/** 单个六识属性 */
export interface SenseAttribute {
  level: number;    // 当前等级（1-10）
  exp: number;      // 当前经验
}

/** 六识数据 */
export interface SixSensesData {
  vision:        SenseAttribute; // 视觉
  hearing:       SenseAttribute; // 听觉
  smell:         SenseAttribute; // 嗅觉
  taste:         SenseAttribute; // 味觉
  touch:         SenseAttribute; // 触觉
  consciousness: SenseAttribute; // 意识
}

export interface PlayerData {
  gold: number;            // 金叶数量
  enlightenment: number;   // 悟道值
  level: number;           // 玩家等级
  unlockedTeas: string[];  // 已解锁茶种
  totalBrewCount: number;  // 总炼茶次数
  totalDrinkCount: number; // 总品茶次数
  sixSenses: SixSensesData; // 六识属性（核心成长体系）
}

export interface PlotData {
  id: number;
  teaType: string | null;
  stage: number;           // 0=空 1=播种 2=生长 3=成熟
  plantedAt: number;       // 种植时间戳（ms）
  fertilized: boolean;
  waterCount: number;      // 已浇水次数
}

export interface GardenData {
  plots: PlotData[];
  unlockedPlots: number;   // 已解锁地块数
}

export interface BrewStationData {
  id: number;
  recipeId: string | null;
  startTime: number;
  duration: number;        // 炼制时长（秒）
  qualityBonus: number;    // 迷你游戏品质加成 0-1
  finished: boolean;
}

export interface BrewData {
  stations: BrewStationData[];
  unlockedStations: number;
}

export interface ItemData {
  id: string;
  type: string;            // 'tea_leaf' | 'brewed_tea' | 'tool' | 'special'
  name: string;
  amount: number;
  quality?: number;        // 0=普通 1=精品 2=极品
}

export interface StorageData {
  items: ItemData[];
  capacity: number;
}

export interface QuestData {
  dailyQuests: DailyQuestProgress[];
  mainProgress: number;    // 主线章节进度
  achievements: string[];  // 已完成成就ID
  lastDailyReset: number;  // 上次日常重置时间戳
}

export interface DailyQuestProgress {
  questId: string;
  current: number;
  required: number;
  completed: boolean;
  rewarded: boolean;
}

export interface SettingsData {
  bgmVolume: number;
  sfxVolume: number;
  notifyEnabled: boolean;
  language: string;
}

export interface GameData {
  player: PlayerData;
  garden: GardenData;
  brew: BrewData;
  storage: StorageData;
  quest: QuestData;
  settings: SettingsData;
}

// ─────────────────── 默认数据 ───────────────────

function createDefaultGameData(): GameData {
  const plots: PlotData[] = [];
  for (let i = 0; i < 16; i++) {
    plots.push({ id: i, teaType: null, stage: 0, plantedAt: 0, fertilized: false, waterCount: 0 });
  }
  return {
    player: {
      gold: 100,
      enlightenment: 0,
      level: 1,
      unlockedTeas: ['green_tea', 'white_tea'],
      totalBrewCount: 0,
      totalDrinkCount: 0,
      sixSenses: {
        vision:        { level: 1, exp: 0 },
        hearing:       { level: 1, exp: 0 },
        smell:         { level: 1, exp: 0 },
        taste:         { level: 1, exp: 0 },
        touch:         { level: 1, exp: 0 },
        consciousness: { level: 1, exp: 0 },
      },
    },
    garden: {
      plots,
      unlockedPlots: 4,
    },
    brew: {
      stations: [
        { id: 0, recipeId: null, startTime: 0, duration: 0, qualityBonus: 0, finished: false },
        { id: 1, recipeId: null, startTime: 0, duration: 0, qualityBonus: 0, finished: false },
        { id: 2, recipeId: null, startTime: 0, duration: 0, qualityBonus: 0, finished: false },
      ],
      unlockedStations: 1,
    },
    storage: {
      items: [],
      capacity: 30,
    },
    quest: {
      dailyQuests: [],
      mainProgress: 0,
      achievements: [],
      lastDailyReset: 0,
    },
    settings: {
      bgmVolume: 0.8,
      sfxVolume: 1.0,
      notifyEnabled: true,
      language: 'zh-CN',
    },
  };
}

// ─────────────────── GameDataManager ───────────────────

@ccclass('GameDataManager')
export class GameDataManager extends Component {
  private static _instance: GameDataManager | null = null;

  private _data: GameData = createDefaultGameData();
  private _autoSaveTimer: number = 0;
  private readonly AUTO_SAVE_INTERVAL = 30; // 秒

  /** 获取全局单例 */
  static get instance(): GameDataManager {
    return GameDataManager._instance!;
  }

  onLoad() {
    if (GameDataManager._instance && GameDataManager._instance !== this) {
      this.destroy();
      return;
    }
    GameDataManager._instance = this;
    director.addPersistRootNode(this.node);
    this.load();
  }

  onDestroy() {
    if (GameDataManager._instance === this) {
      GameDataManager._instance = null;
    }
  }

  update(dt: number) {
    this._autoSaveTimer += dt;
    if (this._autoSaveTimer >= this.AUTO_SAVE_INTERVAL) {
      this._autoSaveTimer = 0;
      this.save();
    }
  }

  // ─── 存读档 ───

  /** 保存存档 */
  save(): void {
    SaveUtils.save(this._data);
    EventBus.emit(GameEvent.GAME_SAVED);
  }

  /** 读取存档，失败时使用默认数据 */
  load(): void {
    const saved = SaveUtils.load();
    if (saved) {
      this._data = this.mergeWithDefault(saved, createDefaultGameData());
    } else {
      this._data = createDefaultGameData();
    }
    EventBus.emit(GameEvent.GAME_LOADED, this._data);
  }

  /** 深度合并存档与默认数据（新字段降级到默认值） */
  private mergeWithDefault(saved: any, defaults: any): any {
    const result: any = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (saved[key] !== undefined) {
        if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key]) && defaults[key] !== null) {
          result[key] = this.mergeWithDefault(saved[key], defaults[key]);
        } else {
          result[key] = saved[key];
        }
      }
    }
    return result;
  }

  // ─── 数据访问 ───

  /** 获取完整游戏数据 */
  get data(): GameData { return this._data; }

  /** 获取玩家数据 */
  get player(): PlayerData { return this._data.player; }

  /** 获取种植数据 */
  get garden(): GardenData { return this._data.garden; }

  /** 获取炼茶数据 */
  get brew(): BrewData { return this._data.brew; }

  /** 获取仓库数据 */
  get storage(): StorageData { return this._data.storage; }

  /** 获取任务数据 */
  get quest(): QuestData { return this._data.quest; }

  /** 获取设置数据 */
  get settings(): SettingsData { return this._data.settings; }

  // ─── 玩家资源操作 ───

  /**
   * 增加金叶
   * @param amount 数量（可为负，表示消耗）
   * @returns 操作是否成功
   */
  addGold(amount: number): boolean {
    if (amount < 0 && this._data.player.gold + amount < 0) return false;
    this._data.player.gold = Math.max(0, this._data.player.gold + amount);
    EventBus.emit(GameEvent.GOLD_CHANGED, { gold: this._data.player.gold, delta: amount });
    this.save();
    return true;
  }

  /**
   * 增加悟道值
   */
  addEnlightenment(amount: number): void {
    this._data.player.enlightenment += amount;
    EventBus.emit(GameEvent.ENLIGHTENMENT_UP, { enlightenment: this._data.player.enlightenment, delta: amount });
    this.save();
  }

  /**
   * 检查并升级
   */
  checkLevelUp(): boolean {
    const threshold = this._data.player.level * 100;
    if (this._data.player.enlightenment >= threshold) {
      this._data.player.level++;
      EventBus.emit(GameEvent.LEVEL_UP, { level: this._data.player.level });
      return true;
    }
    return false;
  }

  /**
   * 为某项六识增加经验，自动处理升级
   * @param senseKey 六识键名
   * @param expGain  获得的经验值
   * @returns 是否触发了升级
   */
  addSenseExp(senseKey: keyof SixSensesData, expGain: number): boolean {
    const sense = this._data.player.sixSenses[senseKey];
    if (sense.level >= 10) return false; // 满级封顶

    sense.exp += expGain;

    // 动态 import 避免循环依赖，直接内联升级公式
    const expToNext = Math.floor(20 * Math.pow(1.6, sense.level - 1));

    if (sense.exp >= expToNext) {
      sense.exp -= expToNext;
      sense.level = Math.min(10, sense.level + 1);
      EventBus.emit(GameEvent.SENSE_LEVEL_UP, { sense: senseKey, level: sense.level });
      return true;
    }
    return false;
  }

  /**
   * 获取六识总等级之和（用于 UI 展示）
   */
  getTotalSenseLevel(): number {
    const s = this._data.player.sixSenses;
    return s.vision.level + s.hearing.level + s.smell.level
         + s.taste.level + s.touch.level + s.consciousness.level;
  }

  /**
   * 解锁茶种
   */
  unlockTea(teaType: string): void {
    if (!this._data.player.unlockedTeas.includes(teaType)) {
      this._data.player.unlockedTeas.push(teaType);
      this.save();
    }
  }

  /**
   * 检查是否已解锁某茶种
   */
  isTeaUnlocked(teaType: string): boolean {
    return this._data.player.unlockedTeas.includes(teaType);
  }
}
