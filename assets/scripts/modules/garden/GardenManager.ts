/**
 * GardenManager - 茶圃管理器
 * 管理所有茶圃地块的生长状态、种植、采摘、施肥逻辑
 */

import { _decorator, Component, director } from 'cc';
import { EventBus, GameEvent } from '../../core/EventBus';
import { GameDataManager, PlotData, ItemData } from '../../core/GameDataManager';
import { TimeManager } from '../../core/TimeManager';
import { getTeaConfig, TeaTypeConfig } from './TeaConfig';

const { ccclass, property } = _decorator;

export enum GrowthStage {
  EMPTY    = 0,
  SEEDLING = 1,
  GROWING  = 2,
  MATURE   = 3,
}

export interface HarvestResult {
  teaType: string;
  amount: number;
  plotId: number;
}

@ccclass('GardenManager')
export class GardenManager extends Component {
  private static _instance: GardenManager | null = null;

  /** 施肥加速比例 */
  private readonly FERTILIZE_BONUS = 0.25; // 缩短 25% 生长时间
  /** 浇水加速比例 */
  private readonly WATER_BONUS = 0.10;     // 缩短 10%
  /** 浇水上限次数 */
  private readonly MAX_WATER_COUNT = 3;

  static get instance(): GardenManager {
    return GardenManager._instance!;
  }

  onLoad() {
    if (GardenManager._instance && GardenManager._instance !== this) {
      this.destroy();
      return;
    }
    GardenManager._instance = this;
    director.addPersistRootNode(this.node);
  }

  onDestroy() {
    if (GardenManager._instance === this) {
      GardenManager._instance = null;
    }
  }

  onEnable() {
    EventBus.on(GameEvent.GAME_LOADED, this.onGameLoaded, this);
  }

  onDisable() {
    EventBus.off(GameEvent.GAME_LOADED, this.onGameLoaded, this);
  }

  private onGameLoaded(): void {
    const offline = TimeManager.instance?.getOfflineDuration() ?? 0;
    if (offline > 0) {
      this.applyOfflineProgress(offline);
    }
    // 注册生长检查定时器（每 5 秒）
    TimeManager.instance?.registerTimer('garden_growth', 5, () => this.tickAllPlots());
  }

  // ─── 种植 ───

  /**
   * 在指定地块种植茶叶
   * @param plotId 地块 ID
   * @param teaType 茶种 ID
   */
  plant(plotId: number, teaType: string): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;

    const plot = gdm.garden.plots[plotId];
    if (!plot) {
      console.warn(`[GardenManager] 无效地块 ID: ${plotId}`);
      return false;
    }
    if (plot.stage !== GrowthStage.EMPTY) {
      console.warn(`[GardenManager] 地块 ${plotId} 已有种植`);
      return false;
    }
    if (!gdm.isTeaUnlocked(teaType)) {
      console.warn(`[GardenManager] 茶种 ${teaType} 未解锁`);
      return false;
    }
    const config = getTeaConfig(teaType);
    if (!config) {
      console.warn(`[GardenManager] 找不到茶种配置: ${teaType}`);
      return false;
    }

    plot.teaType = teaType;
    plot.stage = GrowthStage.SEEDLING;
    plot.plantedAt = Date.now();
    plot.fertilized = false;
    plot.waterCount = 0;

    EventBus.emit(GameEvent.PLOT_UPDATED, { plotId });
    gdm.save();
    return true;
  }

  // ─── 采摘 ───

  /**
   * 采摘成熟地块
   * @param plotId 地块 ID
   * @returns 收获的物品列表
   */
  harvest(plotId: number): HarvestResult[] {
    const gdm = GameDataManager.instance;
    if (!gdm) return [];

    const plot = gdm.garden.plots[plotId];
    if (!plot || plot.stage !== GrowthStage.MATURE || !plot.teaType) return [];

    const config = getTeaConfig(plot.teaType);
    if (!config) return [];

    const [min, max] = config.harvestAmount;
    const amount = min + Math.floor(Math.random() * (max - min + 1));

    // 加入仓库
    this.addTeaToStorage(gdm, plot.teaType, amount);

    // 通知任务系统
    EventBus.emit(GameEvent.TEA_HARVESTED, { teaType: plot.teaType, amount, plotId });

    // 重置地块
    plot.teaType = null;
    plot.stage = GrowthStage.EMPTY;
    plot.plantedAt = 0;
    plot.fertilized = false;
    plot.waterCount = 0;

    EventBus.emit(GameEvent.PLOT_UPDATED, { plotId });
    gdm.save();

    return [{ teaType: config.id, amount, plotId }];
  }

  // ─── 施肥/浇水 ───

  /**
   * 施肥（一次性，缩短 25% 生长时间）
   */
  fertilize(plotId: number): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;

    const plot = gdm.garden.plots[plotId];
    if (!plot || plot.stage === GrowthStage.EMPTY || plot.fertilized) return false;

    // 消耗 1 个肥料道具（暂时直接扣除，后续接 StorageManager）
    plot.fertilized = true;

    EventBus.emit(GameEvent.PLOT_UPDATED, { plotId });
    gdm.save();
    return true;
  }

  /**
   * 浇水（最多 3 次，每次缩短 10%）
   */
  water(plotId: number): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;

    const plot = gdm.garden.plots[plotId];
    if (!plot || plot.stage === GrowthStage.EMPTY || plot.waterCount >= this.MAX_WATER_COUNT) return false;

    plot.waterCount++;
    EventBus.emit(GameEvent.PLOT_UPDATED, { plotId });
    gdm.save();
    return true;
  }

  // ─── 生长计算 ───

  /** 推进所有地块生长状态 */
  private tickAllPlots(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;

    let anyUpdated = false;
    for (const plot of gdm.garden.plots) {
      if (plot.stage === GrowthStage.EMPTY || plot.stage === GrowthStage.MATURE) continue;
      if (!plot.teaType) continue;
      const config = getTeaConfig(plot.teaType);
      if (!config) continue;

      const newStage = this.calcStage(plot, config.growthTimeSeconds);
      if (newStage !== plot.stage) {
        plot.stage = newStage;
        anyUpdated = true;
        EventBus.emit(GameEvent.PLOT_UPDATED, { plotId: plot.id });
      }
    }
    if (anyUpdated) gdm.save();
  }

  /**
   * 根据时间计算地块当前阶段
   */
  private calcStage(plot: PlotData, baseDuration: number): GrowthStage {
    const effectiveDuration = this.getEffectiveDuration(plot, baseDuration);
    const elapsed = (Date.now() - plot.plantedAt) / 1000;
    const progress = elapsed / effectiveDuration;

    if (progress >= 1.0) return GrowthStage.MATURE;
    if (progress >= 0.5) return GrowthStage.GROWING;
    return GrowthStage.SEEDLING;
  }

  /**
   * 计算考虑施肥/浇水后的有效生长时长（秒）
   */
  private getEffectiveDuration(plot: PlotData, baseDuration: number): number {
    let reduction = 0;
    if (plot.fertilized) reduction += this.FERTILIZE_BONUS;
    reduction += plot.waterCount * this.WATER_BONUS;
    return baseDuration * Math.max(0.3, 1 - reduction);
  }

  /**
   * 获取地块生长进度 0-1（供 UI 使用）
   */
  static getPlotProgress(plot: PlotData, baseDuration: number): number {
    if (plot.stage === GrowthStage.EMPTY) return 0;
    if (plot.stage === GrowthStage.MATURE) return 1;
    const elapsed = (Date.now() - plot.plantedAt) / 1000;
    return Math.min(1, elapsed / baseDuration);
  }

  // ─── 离线补偿 ───

  /**
   * 根据离线时长更新所有地块状态
   * @param offlineSecs 离线时长（秒）
   */
  applyOfflineProgress(offlineSecs: number): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;

    const harvestResults: HarvestResult[] = [];
    for (const plot of gdm.garden.plots) {
      if (plot.stage === GrowthStage.EMPTY || plot.stage === GrowthStage.MATURE) continue;
      if (!plot.teaType) continue;
      const config = getTeaConfig(plot.teaType);
      if (!config) continue;

      // 将离线时间加到 plantedAt（等效于时间快进）
      const effectiveDuration = this.getEffectiveDuration(plot, config.growthTimeSeconds);
      const currentElapsed = (Date.now() - plot.plantedAt) / 1000;
      const newElapsed = Math.min(currentElapsed + offlineSecs, effectiveDuration);

      // 调整 plantedAt 使 elapsed = newElapsed
      plot.plantedAt = Date.now() - newElapsed * 1000;

      const newStage = this.calcStage(plot, config.growthTimeSeconds);
      plot.stage = newStage;
    }

    EventBus.emit(GameEvent.OFFLINE_APPLIED, { offlineSecs });
    gdm.save();
  }

  // ─── 工具方法 ───

  /** 向仓库添加茶叶（原料） */
  private addTeaToStorage(gdm: GameDataManager, teaType: string, amount: number): void {
    const config = getTeaConfig(teaType);
    if (!config) return;
    const storage = gdm.storage;
    const existing = storage.items.find(i => i.id === teaType && i.type === 'tea_leaf');
    if (existing) {
      existing.amount += amount;
    } else {
      if (storage.items.length >= storage.capacity) {
        console.warn('[GardenManager] 仓库已满，无法添加茶叶');
        return;
      }
      storage.items.push({
        id: teaType,
        type: 'tea_leaf',
        name: config.nameCN,
        amount,
      });
    }
    EventBus.emit(GameEvent.STORAGE_CHANGED);
  }

  /** 解锁更多地块 */
  unlockPlot(cost: number): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const garden = gdm.garden;
    if (garden.unlockedPlots >= garden.plots.length) return false;
    if (!gdm.addGold(-cost)) return false;
    garden.unlockedPlots++;
    gdm.save();
    return true;
  }
}
