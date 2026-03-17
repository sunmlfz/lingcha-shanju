/**
 * PlotController - 单地块控制器
 * 挂载在地块节点上，负责单个茶圃地块的 UI 展示与交互
 */

import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame, resources, tween, Vec3, UIOpacity } from 'cc';
import { EventBus, GameEvent } from '../../core/EventBus';
import { GardenManager, GrowthStage } from './GardenManager';
import { getTeaConfig } from './TeaConfig';
import { GameDataManager, PlotData } from '../../core/GameDataManager';

const { ccclass, property } = _decorator;

@ccclass('PlotController')
export class PlotController extends Component {
  @property(Label)
  teaNameLabel: Label = null!;

  @property(Label)
  stageLabel: Label = null!;

  @property(Label)
  progressLabel: Label = null!;

  @property(Node)
  plantNode: Node = null!;

  @property(Node)
  emptyHint: Node = null!;

  @property(Node)
  harvestBtn: Node = null!;

  @property(Node)
  fertilizeBtn: Node = null!;

  @property(Node)
  lockedOverlay: Node = null!;

  private _plotId: number = -1;
  private _updateTimer: number = 0;
  private readonly UPDATE_INTERVAL = 5; // 每 5 秒刷新一次显示

  /** 初始化地块 ID */
  init(plotId: number): void {
    this._plotId = plotId;
    this.refreshDisplay();
  }

  onEnable() {
    EventBus.on(GameEvent.PLOT_UPDATED, this.onPlotUpdated, this);
    EventBus.on(GameEvent.GAME_LOADED, this.onGameLoaded, this);
  }

  onDisable() {
    EventBus.off(GameEvent.PLOT_UPDATED, this.onPlotUpdated, this);
    EventBus.off(GameEvent.GAME_LOADED, this.onGameLoaded, this);
  }

  update(dt: number) {
    this._updateTimer += dt;
    if (this._updateTimer >= this.UPDATE_INTERVAL) {
      this._updateTimer = 0;
      this.refreshDisplay();
    }
  }

  private onPlotUpdated(data: { plotId: number }): void {
    if (data.plotId === this._plotId) {
      this.refreshDisplay();
    }
  }

  private onGameLoaded(): void {
    this.refreshDisplay();
  }

  /** 刷新地块显示 */
  refreshDisplay(): void {
    if (this._plotId < 0) return;
    const gdm = GameDataManager.instance;
    if (!gdm) return;

    const gardenData = gdm.garden;
    const isUnlocked = this._plotId < gardenData.unlockedPlots;

    // 锁定遮罩
    if (this.lockedOverlay) {
      this.lockedOverlay.active = !isUnlocked;
    }
    if (!isUnlocked) return;

    const plot: PlotData = gardenData.plots[this._plotId];
    if (!plot) return;

    const isEmpty = plot.stage === GrowthStage.EMPTY;
    const isMature = plot.stage === GrowthStage.MATURE;

    if (this.emptyHint) this.emptyHint.active = isEmpty;
    if (this.plantNode) this.plantNode.active = !isEmpty;
    if (this.harvestBtn) this.harvestBtn.active = isMature;
    if (this.fertilizeBtn) this.fertilizeBtn.active = !isEmpty && !isMature && !plot.fertilized;

    if (!isEmpty && plot.teaType) {
      const config = getTeaConfig(plot.teaType);
      if (this.teaNameLabel) {
        this.teaNameLabel.string = config?.nameCN ?? plot.teaType;
      }
      if (this.stageLabel) {
        const stageNames = ['', '播种', '生长', '成熟'];
        this.stageLabel.string = stageNames[plot.stage] ?? '';
      }
      if (this.progressLabel && config) {
        const progress = GardenManager.getPlotProgress(plot, config.growthTimeSeconds);
        this.progressLabel.string = isMature ? '可采摘' : `${Math.floor(progress * 100)}%`;
      }
    }
  }

  // ─── 按钮回调 ───

  /** 点击地块（空地弹出种植选择） */
  onPlotClick(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const plot = gdm.garden.plots[this._plotId];
    if (!plot || plot.stage !== GrowthStage.EMPTY) return;
    // 通知主场景打开种植选择面板
    EventBus.emit('open_plant_panel', { plotId: this._plotId });
  }

  /** 采摘 */
  onHarvestClick(): void {
    const result = GardenManager.instance?.harvest(this._plotId);
    if (result && result.length > 0) {
      this.playHarvestEffect();
    }
  }

  /** 施肥 */
  onFertilizeClick(): void {
    GardenManager.instance?.fertilize(this._plotId);
  }

  /** 播放收获特效 */
  private playHarvestEffect(): void {
    if (!this.plantNode) return;
    tween(this.plantNode)
      .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
      .to(0.1, { scale: new Vec3(1, 1, 1) })
      .start();
  }
}
