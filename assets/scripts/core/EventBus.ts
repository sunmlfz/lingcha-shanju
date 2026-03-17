/**
 * EventBus - 全局事件总线
 * 用于模块间解耦通信
 */

/** 游戏全局事件枚举 */
export enum GameEvent {
  GOLD_CHANGED       = 'gold_changed',
  TEA_HARVESTED      = 'tea_harvested',
  BREW_COMPLETE      = 'brew_complete',
  ENLIGHTENMENT_UP   = 'enlightenment_up',
  QUEST_COMPLETE     = 'quest_complete',
  LEVEL_UP           = 'level_up',
  PLOT_UPDATED       = 'plot_updated',
  STORAGE_CHANGED    = 'storage_changed',
  SENSE_RESULT       = 'sense_result',
  OFFLINE_APPLIED    = 'offline_applied',
  GAME_SAVED         = 'game_saved',
  GAME_LOADED        = 'game_loaded',
}

type EventCallback = (data?: any) => void;

interface ListenerEntry {
  callback: EventCallback;
  context: any;
}

/**
 * 全局事件总线单例
 */
export class EventBus {
  private static _instance: EventBus | null = null;
  private _listeners: Map<string, ListenerEntry[]> = new Map();

  private constructor() {}

  /** 获取单例实例 */
  static get instance(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * 注册事件监听
   * @param event 事件名称
   * @param callback 回调函数
   * @param context 回调上下文（this）
   */
  static on(event: GameEvent | string, callback: EventCallback, context?: any): void {
    const bus = EventBus.instance;
    if (!bus._listeners.has(event)) {
      bus._listeners.set(event, []);
    }
    const list = bus._listeners.get(event)!;
    // 防止重复注册
    const exists = list.some(e => e.callback === callback && e.context === context);
    if (!exists) {
      list.push({ callback, context });
    }
  }

  /**
   * 注销事件监听
   * @param event 事件名称
   * @param callback 回调函数
   * @param context 回调上下文
   */
  static off(event: GameEvent | string, callback: EventCallback, context?: any): void {
    const bus = EventBus.instance;
    if (!bus._listeners.has(event)) return;
    const list = bus._listeners.get(event)!;
    const index = list.findIndex(e => e.callback === callback && e.context === context);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param data 携带数据
   */
  static emit(event: GameEvent | string, data?: any): void {
    const bus = EventBus.instance;
    if (!bus._listeners.has(event)) return;
    const list = [...bus._listeners.get(event)!];
    for (const entry of list) {
      try {
        entry.callback.call(entry.context, data);
      } catch (e) {
        console.error(`[EventBus] Error in listener for event "${event}":`, e);
      }
    }
  }

  /**
   * 注册一次性监听（触发一次后自动注销）
   */
  static once(event: GameEvent | string, callback: EventCallback, context?: any): void {
    const wrapper: EventCallback = (data) => {
      callback.call(context, data);
      EventBus.off(event, wrapper, context);
    };
    EventBus.on(event, wrapper, context);
  }

  /**
   * 清除某事件的所有监听
   */
  static clear(event: GameEvent | string): void {
    EventBus.instance._listeners.delete(event);
  }

  /**
   * 清除所有监听
   */
  static clearAll(): void {
    EventBus.instance._listeners.clear();
  }
}
