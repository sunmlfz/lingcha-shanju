/**
 * TimeManager - 时间管理器
 * 负责游戏时间、离线补偿、计时器管理
 */

import { _decorator, Component, director } from 'cc';
import { SaveUtils } from '../utils/SaveUtils';

const { ccclass, property } = _decorator;

const SAVE_KEY_LAST_ONLINE = 'lingcha_last_online';
const MAX_OFFLINE_HOURS = 8;
const MAX_OFFLINE_SECONDS = MAX_OFFLINE_HOURS * 3600;

export interface Timer {
  id: string;
  interval: number;       // 间隔（秒）
  elapsed: number;        // 已经过时间
  callback: () => void;
  repeat: boolean;
  active: boolean;
}

@ccclass('TimeManager')
export class TimeManager extends Component {
  private static _instance: TimeManager | null = null;

  @property
  private speedMultiplier: number = 1.0;
  private _speedBoostEndTime: number = 0;

  private _timers: Map<string, Timer> = new Map();
  private _lastSaveTime: number = 0;

  static get instance(): TimeManager {
    return TimeManager._instance!;
  }

  onLoad() {
    if (TimeManager._instance && TimeManager._instance !== this) {
      this.destroy();
      return;
    }
    TimeManager._instance = this;
    director.addPersistRootNode(this.node);
    this._lastSaveTime = Date.now();
  }

  onDestroy() {
    if (TimeManager._instance === this) {
      // 保存下线时间戳
      SaveUtils.setItem(SAVE_KEY_LAST_ONLINE, Date.now().toString());
      TimeManager._instance = null;
    }
  }

  update(dt: number) {
    const effectiveDt = dt * this.currentSpeed;

    // 检查加速是否到期
    if (this.speedMultiplier > 1.0 && Date.now() >= this._speedBoostEndTime) {
      this.speedMultiplier = 1.0;
    }

    // 推进所有计时器
    for (const timer of this._timers.values()) {
      if (!timer.active) continue;
      timer.elapsed += effectiveDt;
      if (timer.elapsed >= timer.interval) {
        timer.elapsed -= timer.interval;
        try {
          timer.callback();
        } catch (e) {
          console.error(`[TimeManager] Timer "${timer.id}" callback error:`, e);
        }
        if (!timer.repeat) {
          timer.active = false;
        }
      }
    }
  }

  // ─── 离线补偿 ───

  /**
   * 计算并返回离线时长（秒），上限 MAX_OFFLINE_SECONDS
   */
  getOfflineDuration(): number {
    const lastOnlineStr = SaveUtils.getItem(SAVE_KEY_LAST_ONLINE);
    if (!lastOnlineStr) return 0;
    const lastOnline = parseInt(lastOnlineStr, 10);
    if (isNaN(lastOnline)) return 0;
    const elapsed = Math.floor((Date.now() - lastOnline) / 1000);
    return Math.min(elapsed, MAX_OFFLINE_SECONDS);
  }

  /**
   * 记录当前时间为最后在线时间
   */
  saveOnlineTime(): void {
    SaveUtils.setItem(SAVE_KEY_LAST_ONLINE, Date.now().toString());
  }

  // ─── 计时器管理 ───

  /**
   * 注册全局计时器
   * @param id 唯一ID
   * @param interval 间隔（秒）
   * @param callback 回调
   * @param repeat 是否重复，默认 true
   */
  registerTimer(id: string, interval: number, callback: () => void, repeat: boolean = true): void {
    this._timers.set(id, { id, interval, elapsed: 0, callback, repeat, active: true });
  }

  /**
   * 移除计时器
   */
  removeTimer(id: string): void {
    this._timers.delete(id);
  }

  /**
   * 暂停计时器
   */
  pauseTimer(id: string): void {
    const t = this._timers.get(id);
    if (t) t.active = false;
  }

  /**
   * 恢复计时器
   */
  resumeTimer(id: string): void {
    const t = this._timers.get(id);
    if (t) t.active = true;
  }

  // ─── 游戏加速（道具效果） ───

  /**
   * 设置游戏速度倍率
   * @param multiplier 倍率（如 2.0 表示 2 倍速）
   * @param durationSeconds 持续时长（秒）
   */
  setSpeedMultiplier(multiplier: number, durationSeconds: number): void {
    this.speedMultiplier = Math.max(1.0, multiplier);
    this._speedBoostEndTime = Date.now() + durationSeconds * 1000;
  }

  /** 当前有效速度倍率 */
  get currentSpeed(): number {
    return this.speedMultiplier;
  }

  /** 获取当前游戏时间戳（考虑倍速加成后的虚拟时间偏移忽略，直接用真实时间） */
  get now(): number {
    return Date.now();
  }

  /** 最大离线补偿小时数 */
  get maxOfflineHours(): number {
    return MAX_OFFLINE_HOURS;
  }
}
