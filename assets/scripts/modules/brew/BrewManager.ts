/**
 * BrewManager - 炼茶管理器
 * 管理炼茶台和制茶流程、迷你游戏结果处理
 */

import { _decorator, Component, director } from 'cc';
import { EventBus, GameEvent } from '../../core/EventBus';
import { GameDataManager, BrewStationData, ItemData } from '../../core/GameDataManager';
import { TimeManager } from '../../core/TimeManager';
import { getRecipe, calcQualityTier, QUALITY_NAMES } from './BrewRecipe';

const { ccclass, property } = _decorator;

export interface BrewResult {
  stationId: number;
  outputId: string;
  outputName: string;
  qualityScore: number;
  qualityTier: 'normal' | 'premium' | 'supreme';
  goldValue: number;
  enlightenmentValue: number;
}

@ccclass('BrewManager')
export class BrewManager extends Component {
  private static _instance: BrewManager | null = null;

  static get instance(): BrewManager {
    return BrewManager._instance!;
  }

  onLoad() {
    if (BrewManager._instance && BrewManager._instance !== this) {
      this.destroy();
      return;
    }
    BrewManager._instance = this;
    director.addPersistRootNode(this.node);
  }

  onDestroy() {
    if (BrewManager._instance === this) {
      BrewManager._instance = null;
    }
  }

  onEnable() {
    EventBus.on(GameEvent.GAME_LOADED, this.onGameLoaded, this);
  }

  onDisable() {
    EventBus.off(GameEvent.GAME_LOADED, this.onGameLoaded, this);
  }

  private onGameLoaded(): void {
    // 检查是否有已完成的炼茶台
    this.checkFinishedStations();
    // 注册炼茶状态检查（每 10 秒）
    TimeManager.instance?.registerTimer('brew_check', 10, () => this.checkFinishedStations());
  }

  // ─── 开始炼制 ───

  /**
   * 开始炼茶
   * @param stationId 炼茶台 ID
   * @param recipeId 配方 ID
   * @returns 是否成功开始
   */
  startBrew(stationId: number, recipeId: string): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;

    const brewData = gdm.brew;
    if (stationId >= brewData.unlockedStations) {
      console.warn(`[BrewManager] 炼茶台 ${stationId} 未解锁`);
      return false;
    }

    const station = brewData.stations[stationId];
    if (!station) return false;
    if (station.recipeId !== null && !station.finished) {
      console.warn(`[BrewManager] 炼茶台 ${stationId} 正在使用中`);
      return false;
    }

    const recipe = getRecipe(recipeId);
    if (!recipe) {
      console.warn(`[BrewManager] 找不到配方: ${recipeId}`);
      return false;
    }

    // 检查并消耗材料
    if (!this.consumeMaterials(gdm, recipe.materials)) {
      console.warn(`[BrewManager] 材料不足，无法开始炼制`);
      return false;
    }

    // 开始炼制
    station.recipeId = recipeId;
    station.startTime = Date.now();
    station.duration = recipe.durationSeconds;
    station.qualityBonus = 0;
    station.finished = false;

    gdm.save();
    return true;
  }

  /**
   * 迷你游戏完成后应用品质加成
   * @param stationId 炼茶台 ID
   * @param score 迷你游戏得分（0-100）
   */
  applyMiniGameBonus(stationId: number, score: number): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const station = gdm.brew.stations[stationId];
    if (!station || !station.recipeId) return;

    const recipe = getRecipe(station.recipeId);
    if (!recipe) return;

    let bonus = 0;
    if (score >= 90) bonus = recipe.qualityBonus.perfect;
    else if (score >= 60) bonus = recipe.qualityBonus.good;
    else bonus = recipe.qualityBonus.miss;

    station.qualityBonus = Math.max(-50, Math.min(50, bonus));
    gdm.save();
  }

  // ─── 收取成品 ───

  /**
   * 收取炼茶结果
   * @param stationId 炼茶台 ID
   * @returns 炼茶结果，失败返回 null
   */
  collectResult(stationId: number): BrewResult | null {
    const gdm = GameDataManager.instance;
    if (!gdm) return null;

    const station = gdm.brew.stations[stationId];
    if (!station || !station.recipeId) return null;
    if (!station.finished) {
      console.warn(`[BrewManager] 炼茶台 ${stationId} 尚未完成`);
      return null;
    }

    const recipe = getRecipe(station.recipeId);
    if (!recipe) return null;

    // 计算最终品质
    const qualityScore = Math.min(100, Math.max(0, recipe.baseQuality + station.qualityBonus));
    const qualityTier = calcQualityTier(qualityScore);

    // 品质倍率
    const qualityMultiplier = { normal: 1.0, premium: 1.5, supreme: 3.0 }[qualityTier];
    const goldValue = Math.floor(recipe.durationSeconds / 10 * qualityMultiplier);
    const enlightenmentValue = Math.floor(recipe.durationSeconds / 30 * qualityMultiplier);

    // 加入仓库
    this.addBrewedTeaToStorage(gdm, {
      id: `${recipe.outputId}_${qualityTier}`,
      type: 'brewed_tea',
      name: `${recipe.outputName}（${QUALITY_NAMES[qualityTier]}）`,
      amount: 1,
      quality: ['normal', 'premium', 'supreme'].indexOf(qualityTier),
    });

    // 更新炼茶次数
    gdm.player.totalBrewCount++;

    // 重置炼茶台
    station.recipeId = null;
    station.startTime = 0;
    station.duration = 0;
    station.qualityBonus = 0;
    station.finished = false;

    const result: BrewResult = {
      stationId,
      outputId: recipe.outputId,
      outputName: recipe.outputName,
      qualityScore,
      qualityTier,
      goldValue,
      enlightenmentValue,
    };

    EventBus.emit(GameEvent.BREW_COMPLETE, result);
    gdm.save();
    return result;
  }

  // ─── 状态查询 ───

  /** 获取炼茶台剩余时间（秒），-1 表示已完成或空闲 */
  getRemainingTime(stationId: number): number {
    const gdm = GameDataManager.instance;
    if (!gdm) return -1;
    const station = gdm.brew.stations[stationId];
    if (!station || !station.recipeId || station.finished) return -1;
    const elapsed = (Date.now() - station.startTime) / 1000;
    return Math.max(0, station.duration - elapsed);
  }

  /** 获取炼茶台进度 0-1 */
  getProgress(stationId: number): number {
    const gdm = GameDataManager.instance;
    if (!gdm) return 0;
    const station = gdm.brew.stations[stationId];
    if (!station || !station.recipeId) return 0;
    if (station.finished) return 1;
    const elapsed = (Date.now() - station.startTime) / 1000;
    return Math.min(1, elapsed / station.duration);
  }

  // ─── 解锁炼茶台 ───

  unlockStation(cost: number): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const brew = gdm.brew;
    if (brew.unlockedStations >= brew.stations.length) return false;
    if (!gdm.addGold(-cost)) return false;
    brew.unlockedStations++;
    gdm.save();
    return true;
  }

  // ─── 内部方法 ───

  private checkFinishedStations(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    let anyFinished = false;
    for (const station of gdm.brew.stations) {
      if (!station.recipeId || station.finished) continue;
      const elapsed = (Date.now() - station.startTime) / 1000;
      if (elapsed >= station.duration) {
        station.finished = true;
        anyFinished = true;
        console.log(`[BrewManager] 炼茶台 ${station.id} 炼制完成`);
      }
    }
    if (anyFinished) gdm.save();
  }

  private consumeMaterials(
    gdm: GameDataManager,
    materials: { teaType: string; amount: number }[],
  ): boolean {
    const storage = gdm.storage;
    // 先检查是否足够
    for (const mat of materials) {
      const item = storage.items.find(i => i.id === mat.teaType && i.type === 'tea_leaf');
      if (!item || item.amount < mat.amount) return false;
    }
    // 再扣除
    for (const mat of materials) {
      const item = storage.items.find(i => i.id === mat.teaType && i.type === 'tea_leaf');
      if (item) {
        item.amount -= mat.amount;
        if (item.amount <= 0) {
          storage.items.splice(storage.items.indexOf(item), 1);
        }
      }
    }
    EventBus.emit(GameEvent.STORAGE_CHANGED);
    return true;
  }

  private addBrewedTeaToStorage(gdm: GameDataManager, item: ItemData): void {
    const storage = gdm.storage;
    const existing = storage.items.find(i => i.id === item.id && i.quality === item.quality);
    if (existing) {
      existing.amount++;
    } else {
      if (storage.items.length >= storage.capacity) {
        console.warn('[BrewManager] 仓库已满');
        return;
      }
      storage.items.push({ ...item });
    }
    EventBus.emit(GameEvent.STORAGE_CHANGED);
  }
}
