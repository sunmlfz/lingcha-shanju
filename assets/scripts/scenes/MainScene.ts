/**
 * MainScene - 主场景控制器
 * 负责初始化所有管理器、UI 绑定、Tab 切换、离线补偿提示
 */

import { _decorator, Component, Node, Label, Button, director } from 'cc';
import { EventBus, GameEvent } from '../core/EventBus';
import { GameDataManager } from '../core/GameDataManager';
import { TimeManager } from '../core/TimeManager';
import { GardenManager } from '../modules/garden/GardenManager';
import { BrewManager } from '../modules/brew/BrewManager';
import { SenseManager } from '../modules/sense/SenseManager';
import { StorageManager } from '../modules/storage/StorageManager';
import { QuestManager } from '../modules/quest/QuestManager';
import { PlotController } from '../modules/garden/PlotController';

const { ccclass, property } = _decorator;

/** Tab 枚举 */
enum MainTab {
  GARDEN  = 0,
  BREW    = 1,
  SENSE   = 2,
  STORAGE = 3,
  QUEST   = 4,
}

@ccclass('MainScene')
export class MainScene extends Component {
  // ─── 顶部 HUD ───
  @property(Label)
  goldLabel: Label = null!;

  @property(Label)
  enlightenmentLabel: Label = null!;

  @property(Label)
  levelLabel: Label = null!;

  // ─── Tab 页面根节点 ───
  @property(Node)
  gardenPanel: Node = null!;

  @property(Node)
  brewPanel: Node = null!;

  @property(Node)
  sensePanel: Node = null!;

  @property(Node)
  storagePanel: Node = null!;

  @property(Node)
  questPanel: Node = null!;

  // ─── 底部 Tab 按钮 ───
  @property([Node])
  tabButtons: Node[] = [];

  // ─── 提示/弹窗 ───
  @property(Node)
  offlineRewardDialog: Node = null!;

  @property(Label)
  offlineRewardLabel: Label = null!;

  @property(Node)
  loadingOverlay: Node = null!;

  // ─── 茶圃地块 ───
  @property([Node])
  plotNodes: Node[] = [];

  private _currentTab: MainTab = MainTab.GARDEN;
  private _panels: Node[] = [];

  onLoad() {
    this._panels = [
      this.gardenPanel,
      this.brewPanel,
      this.sensePanel,
      this.storagePanel,
      this.questPanel,
    ];
  }

  start() {
    // 显示 loading
    if (this.loadingOverlay) this.loadingOverlay.active = true;

    // 注册事件
    EventBus.on(GameEvent.GOLD_CHANGED,      this.refreshHUD, this);
    EventBus.on(GameEvent.ENLIGHTENMENT_UP,  this.refreshHUD, this);
    EventBus.on(GameEvent.LEVEL_UP,          this.refreshHUD, this);
    EventBus.on(GameEvent.GAME_LOADED,       this.onGameLoaded, this);
    EventBus.on(GameEvent.BREW_COMPLETE,     this.onBrewComplete, this);
    EventBus.on('open_plant_panel',          this.onOpenPlantPanel, this);

    // 初始化地块控制器
    for (let i = 0; i < this.plotNodes.length; i++) {
      const ctrl = this.plotNodes[i].getComponent(PlotController);
      if (ctrl) ctrl.init(i);
    }

    // 默认显示茶圃 Tab
    this.switchTab(MainTab.GARDEN);
  }

  onDestroy() {
    EventBus.off(GameEvent.GOLD_CHANGED,      this.refreshHUD, this);
    EventBus.off(GameEvent.ENLIGHTENMENT_UP,  this.refreshHUD, this);
    EventBus.off(GameEvent.LEVEL_UP,          this.refreshHUD, this);
    EventBus.off(GameEvent.GAME_LOADED,       this.onGameLoaded, this);
    EventBus.off(GameEvent.BREW_COMPLETE,     this.onBrewComplete, this);
    EventBus.off('open_plant_panel',          this.onOpenPlantPanel, this);

    // 保存离线时间戳
    TimeManager.instance?.saveOnlineTime();
  }

  // ─── 初始化回调 ───

  private onGameLoaded(): void {
    if (this.loadingOverlay) this.loadingOverlay.active = false;
    this.refreshHUD();
    this.checkOfflineReward();
  }

  /** 检查离线奖励并弹出提示 */
  private checkOfflineReward(): void {
    const tm = TimeManager.instance;
    if (!tm) return;
    const offlineSecs = tm.getOfflineDuration();
    if (offlineSecs < 60) return; // 少于 1 分钟不提示

    const hours = Math.floor(offlineSecs / 3600);
    const mins  = Math.floor((offlineSecs % 3600) / 60);
    const timeStr = hours > 0 ? `${hours} 小时 ${mins} 分钟` : `${mins} 分钟`;

    if (this.offlineRewardDialog && this.offlineRewardLabel) {
      this.offlineRewardLabel.string = `您离开了 ${timeStr}，茶圃已自动生长，请查看！`;
      this.offlineRewardDialog.active = true;
    }

    // 更新离线时间戳
    tm.saveOnlineTime();
  }

  // ─── HUD 刷新 ───

  private refreshHUD(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const player = gdm.player;

    if (this.goldLabel) {
      this.goldLabel.string = `💰 ${player.gold}`;
    }
    if (this.enlightenmentLabel) {
      const threshold = player.level * 100;
      this.enlightenmentLabel.string = `☯ ${player.enlightenment}/${threshold}`;
    }
    if (this.levelLabel) {
      this.levelLabel.string = `Lv.${player.level}`;
    }
  }

  // ─── Tab 切换 ───

  /**
   * 切换底部 Tab
   * @param tab Tab 枚举值（或按钮 index）
   */
  switchTab(tab: MainTab | number): void {
    this._currentTab = tab as MainTab;
    for (let i = 0; i < this._panels.length; i++) {
      if (this._panels[i]) {
        this._panels[i].active = (i === tab);
      }
    }
    // 更新 Tab 按钮选中状态
    for (let i = 0; i < this.tabButtons.length; i++) {
      if (this.tabButtons[i]) {
        // 实际应切换选中/非选中样式，此处用 opacity 简化
        const opacity = this.tabButtons[i].getComponent('UIOpacity');
        // opacity?.node.setScale(i === tab ? 1.1 : 1);
      }
    }
  }

  // ─── 底部 Tab 按钮点击回调 ───

  onTabGarden():  void { this.switchTab(MainTab.GARDEN);  }
  onTabBrew():    void { this.switchTab(MainTab.BREW);    }
  onTabSense():   void { this.switchTab(MainTab.SENSE);   }
  onTabStorage(): void { this.switchTab(MainTab.STORAGE); }
  onTabQuest():   void { this.switchTab(MainTab.QUEST);   }

  // ─── 离线奖励弹窗 ───

  onOfflineRewardConfirm(): void {
    if (this.offlineRewardDialog) this.offlineRewardDialog.active = false;
  }

  // ─── 炼茶完成通知 ───

  private onBrewComplete(result: any): void {
    console.log(`[MainScene] 炼茶完成: ${result.outputName} (${result.qualityTier})`);
    // TODO: 播放通知特效、显示 Toast
  }

  // ─── 种植面板回调 ───

  private onOpenPlantPanel(data: { plotId: number }): void {
    // TODO: 显示种植选择弹窗
    console.log(`[MainScene] 打开种植面板，地块: ${data.plotId}`);
  }

  // ─── 公开工具方法（供 UI 按钮调用） ───

  /**
   * 快速种植（调试用）
   */
  debugPlant(plotId: number, teaType: string): void {
    GardenManager.instance?.plant(plotId, teaType);
  }

  /**
   * 快速采摘（调试用）
   */
  debugHarvest(plotId: number): void {
    GardenManager.instance?.harvest(plotId);
  }
}
