/**
 * QuestManager - 任务管理器
 * 管理日常任务、主线进度、成就系统
 */

import { _decorator, Component, director } from 'cc';
import { EventBus, GameEvent } from '../../core/EventBus';
import { GameDataManager, DailyQuestProgress, QuestData } from '../../core/GameDataManager';
import {
  generateDailyQuests,
  DAILY_QUEST_POOL,
  MAIN_QUESTS,
  ACHIEVEMENTS,
  DailyQuestConfig,
  AchievementConfig,
} from './QuestConfig';

const { ccclass } = _decorator;

@ccclass('QuestManager')
export class QuestManager extends Component {
  private static _instance: QuestManager | null = null;

  static get instance(): QuestManager {
    return QuestManager._instance!;
  }

  onLoad() {
    if (QuestManager._instance && QuestManager._instance !== this) {
      this.destroy();
      return;
    }
    QuestManager._instance = this;
    director.addPersistRootNode(this.node);
  }

  onDestroy() {
    if (QuestManager._instance === this) {
      QuestManager._instance = null;
    }
  }

  onEnable() {
    EventBus.on(GameEvent.GAME_LOADED,    this.onGameLoaded,    this);
    EventBus.on(GameEvent.TEA_HARVESTED,  this.onTeaHarvested,  this);
    EventBus.on(GameEvent.BREW_COMPLETE,  this.onBrewComplete,  this);
    EventBus.on(GameEvent.SENSE_RESULT,   this.onSenseResult,   this);
    EventBus.on(GameEvent.GOLD_CHANGED,   this.onGoldChanged,   this);
    EventBus.on(GameEvent.PLOT_UPDATED,   this.onPlotUpdated,   this);
  }

  onDisable() {
    EventBus.off(GameEvent.GAME_LOADED,    this.onGameLoaded,    this);
    EventBus.off(GameEvent.TEA_HARVESTED,  this.onTeaHarvested,  this);
    EventBus.off(GameEvent.BREW_COMPLETE,  this.onBrewComplete,  this);
    EventBus.off(GameEvent.SENSE_RESULT,   this.onSenseResult,   this);
    EventBus.off(GameEvent.GOLD_CHANGED,   this.onGoldChanged,   this);
    EventBus.off(GameEvent.PLOT_UPDATED,   this.onPlotUpdated,   this);
  }

  // ─── 初始化 ───

  private onGameLoaded(): void {
    this.checkDailyReset();
    this.checkAllAchievements();
  }

  /** 检查并重置每日任务（新的一天） */
  private checkDailyReset(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const quest = gdm.quest;
    const today = this.getTodayTimestamp();

    if (quest.lastDailyReset < today) {
      this.resetDailyQuests(quest);
      quest.lastDailyReset = today;
      gdm.save();
    }
    // 如果没有每日任务，生成
    if (quest.dailyQuests.length === 0) {
      this.resetDailyQuests(quest);
      gdm.save();
    }
  }

  private resetDailyQuests(quest: QuestData): void {
    const configs = generateDailyQuests();
    quest.dailyQuests = configs.map(c => ({
      questId: c.id,
      current: 0,
      required: c.targetValue,
      completed: false,
      rewarded: false,
    }));
  }

  // ─── 进度推进 ───

  private onTeaHarvested(data: { teaType: string; amount: number }): void {
    this.advanceDailyProgress('harvest', data.amount, data.teaType);
    this.advanceAchievements('harvest', data.amount, data.teaType);
    // 累计采摘
    this.checkMainQuestProgress('harvest');
  }

  private onBrewComplete(data: { qualityTier: string }): void {
    this.advanceDailyProgress('brew', 1);
    this.advanceAchievements('brew', 1);
    if (data.qualityTier === 'supreme') {
      this.advanceAchievements('brew', 1, 'supreme');
    }
    this.checkMainQuestProgress('brew');
  }

  private onSenseResult(): void {
    this.advanceDailyProgress('drink', 1);
    this.advanceAchievements('drink', 1);
    this.checkMainQuestProgress('drink');
  }

  private onGoldChanged(data: { gold: number; delta: number }): void {
    if (data.delta > 0) {
      this.advanceDailyProgress('sell', data.delta);
    }
  }

  private onPlotUpdated(data: { plotId: number }): void {
    // 检查是否刚刚种植（通过地块状态推断）
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const plot = gdm.garden.plots[data.plotId];
    if (plot && plot.stage === 1 && plot.plantedAt > Date.now() - 3000) {
      this.advanceDailyProgress('plant', 1, plot.teaType ?? undefined);
      this.advanceAchievements('plant', 1, plot.teaType ?? undefined);
    }
  }

  // ─── 日常任务 ───

  /**
   * 推进日常任务进度
   */
  private advanceDailyProgress(type: string, amount: number, teaType?: string): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const quest = gdm.quest;
    let changed = false;

    for (const progress of quest.dailyQuests) {
      if (progress.completed) continue;
      const config = DAILY_QUEST_POOL.find(c => c.id === progress.questId);
      if (!config || config.type !== type) continue;
      if (config.targetTea && config.targetTea !== teaType) continue;

      progress.current = Math.min(progress.required, progress.current + amount);
      if (progress.current >= progress.required && !progress.completed) {
        progress.completed = true;
        console.log(`[QuestManager] 日常任务完成: ${config.name}`);
      }
      changed = true;
    }
    if (changed) gdm.save();
  }

  /**
   * 领取日常任务奖励
   * @param questId 任务 ID
   */
  claimDailyReward(questId: string): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const quest = gdm.quest;
    const progress = quest.dailyQuests.find(p => p.questId === questId);
    if (!progress || !progress.completed || progress.rewarded) return false;

    const config = DAILY_QUEST_POOL.find(c => c.id === questId);
    if (!config) return false;

    // 发放奖励
    if (config.rewards.gold) gdm.addGold(config.rewards.gold);
    if (config.rewards.enlightenment) gdm.addEnlightenment(config.rewards.enlightenment);

    progress.rewarded = true;
    EventBus.emit(GameEvent.QUEST_COMPLETE, { questId, rewards: config.rewards });
    gdm.save();
    return true;
  }

  // ─── 主线任务 ───

  /** 获取当前主线章节 */
  getCurrentChapter(): number {
    return GameDataManager.instance?.quest.mainProgress ?? 0;
  }

  /** 获取当前主线任务配置 */
  getCurrentMainQuest() {
    const chapter = this.getCurrentChapter();
    return MAIN_QUESTS.find(q => q.chapter === chapter + 1) ?? null;
  }

  private checkMainQuestProgress(type: string): void {
    const current = this.getCurrentMainQuest();
    if (!current) return;
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    // 简单检查：主线任务完成判断逻辑（根据累计值判断）
    // 实际项目中应有更复杂的进度跟踪，这里作为框架示例
  }

  /**
   * 完成当前主线章节
   */
  completeMainChapter(): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const quest = gdm.quest;
    const current = MAIN_QUESTS.find(q => q.chapter === quest.mainProgress + 1);
    if (!current) return false;

    quest.mainProgress++;

    // 发放奖励
    if (current.reward.gold) gdm.addGold(current.reward.gold);
    if (current.reward.enlightenment) gdm.addEnlightenment(current.reward.enlightenment);
    if (current.reward.unlockTea) gdm.unlockTea(current.reward.unlockTea);
    if (current.unlocks) {
      for (const u of current.unlocks) gdm.unlockTea(u);
    }

    EventBus.emit(GameEvent.QUEST_COMPLETE, { chapter: quest.mainProgress, reward: current.reward });
    gdm.save();
    return true;
  }

  // ─── 成就系统 ───

  /**
   * 推进成就进度并检查是否完成
   */
  private advanceAchievements(type: string, amount: number, qualifier?: string): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const quest = gdm.quest;

    for (const ach of ACHIEVEMENTS) {
      if (quest.achievements.includes(ach.id)) continue;
      if (ach.type !== type) continue;
      if (ach.targetTea && ach.targetTea !== qualifier) continue;
      // 成就统计（依赖玩家累计数据）
      const progress = this.getAchievementProgress(ach, gdm);
      if (progress >= ach.targetValue) {
        this.unlockAchievement(ach, gdm);
      }
    }
  }

  private getAchievementProgress(ach: AchievementConfig, gdm: GameDataManager): number {
    switch (ach.type) {
      case 'harvest': return gdm.player.totalBrewCount; // 暂用炼茶次数代替（完整实现需更多字段）
      case 'brew':    return gdm.player.totalBrewCount;
      case 'drink':   return gdm.player.totalDrinkCount;
      case 'level':   return gdm.player.enlightenment;
      case 'plant':   return gdm.player.unlockedTeas.length;
      default:        return 0;
    }
  }

  private unlockAchievement(ach: AchievementConfig, gdm: GameDataManager): void {
    gdm.quest.achievements.push(ach.id);
    if (ach.reward.gold) gdm.addGold(ach.reward.gold);
    if (ach.reward.enlightenment) gdm.addEnlightenment(ach.reward.enlightenment);
    if (ach.reward.unlockTea) gdm.unlockTea(ach.reward.unlockTea);
    EventBus.emit(GameEvent.QUEST_COMPLETE, { achievementId: ach.id, reward: ach.reward });
    console.log(`[QuestManager] 成就解锁: ${ach.name}`);
  }

  private checkAllAchievements(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    for (const ach of ACHIEVEMENTS) {
      this.advanceAchievements(ach.type, 0);
    }
  }

  // ─── 查询接口 ───

  /** 获取今日日常任务列表（含进度） */
  getDailyQuests(): Array<{ config: DailyQuestConfig; progress: DailyQuestProgress }> {
    const gdm = GameDataManager.instance;
    if (!gdm) return [];
    return gdm.quest.dailyQuests.map(p => ({
      config: DAILY_QUEST_POOL.find(c => c.id === p.questId)!,
      progress: p,
    })).filter(item => !!item.config);
  }

  /** 获取所有成就（含完成状态） */
  getAchievements(): Array<{ config: AchievementConfig; completed: boolean }> {
    const gdm = GameDataManager.instance;
    if (!gdm) return [];
    const completed = gdm.quest.achievements;
    return ACHIEVEMENTS
      .filter(a => !a.hidden || completed.includes(a.id))
      .map(a => ({ config: a, completed: completed.includes(a.id) }));
  }

  // ─── 工具 ───

  private getTodayTimestamp(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
}
