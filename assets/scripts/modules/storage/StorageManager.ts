/**
 * StorageManager - 仓库管理器
 * 管理背包容量、物品增删查、出售功能
 */

import { _decorator, Component, director } from 'cc';
import { EventBus, GameEvent } from '../../core/EventBus';
import { GameDataManager, ItemData } from '../../core/GameDataManager';

const { ccclass } = _decorator;

export interface SellResult {
  itemId: string;
  amount: number;
  goldEarned: number;
}

/** 物品出售价格配置（按物品 ID 前缀匹配） */
const SELL_PRICE_TABLE: Record<string, number> = {
  'green_tea':          8,
  'white_tea':          16,
  'black_tea':          12,
  'oolong_tea':         20,
  'longjing_tea':       70,
  'silver_needle':      80,
  'lapsang_souchong':   90,
  'spirit_bud':         180,
  'ancient_puer':       450,
  'brewed_green_normal':    20,
  'brewed_green_premium':   35,
  'brewed_green_supreme':   60,
  'brewed_white_normal':    30,
  'brewed_white_premium':   50,
  'brewed_white_supreme':   90,
  'brewed_black_normal':    25,
  'brewed_black_premium':   40,
  'brewed_black_supreme':   75,
  'brewed_oolong_normal':   40,
  'brewed_oolong_premium':  65,
  'brewed_oolong_supreme':  120,
  'brewed_longjing_normal': 100,
  'brewed_longjing_premium':180,
  'brewed_longjing_supreme':350,
  'brewed_spirit_elixir_normal':  300,
  'brewed_spirit_elixir_premium': 500,
  'brewed_spirit_elixir_supreme': 1000,
};

/** 仓库扩容方案 */
const STORAGE_EXPAND_OPTIONS = [
  { cost: 50,  addCapacity: 10 },
  { cost: 150, addCapacity: 20 },
  { cost: 400, addCapacity: 50 },
];

@ccclass('StorageManager')
export class StorageManager extends Component {
  private static _instance: StorageManager | null = null;

  static get instance(): StorageManager {
    return StorageManager._instance!;
  }

  onLoad() {
    if (StorageManager._instance && StorageManager._instance !== this) {
      this.destroy();
      return;
    }
    StorageManager._instance = this;
    director.addPersistRootNode(this.node);
  }

  onDestroy() {
    if (StorageManager._instance === this) {
      StorageManager._instance = null;
    }
  }

  // ─── 物品查询 ───

  /** 获取所有物品 */
  getItems(): ItemData[] {
    return GameDataManager.instance?.storage.items ?? [];
  }

  /** 按类型过滤物品 */
  getItemsByType(type: string): ItemData[] {
    return this.getItems().filter(i => i.type === type);
  }

  /** 获取某物品数量 */
  getItemCount(id: string, type?: string): number {
    const items = this.getItems();
    const item = type
      ? items.find(i => i.id === id && i.type === type)
      : items.find(i => i.id === id);
    return item?.amount ?? 0;
  }

  /** 检查仓库是否已满 */
  isFull(): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const storage = gdm.storage;
    return storage.items.length >= storage.capacity;
  }

  /** 剩余容量 */
  getRemainingCapacity(): number {
    const gdm = GameDataManager.instance;
    if (!gdm) return 0;
    return gdm.storage.capacity - gdm.storage.items.length;
  }

  // ─── 物品增减 ───

  /**
   * 添加物品到仓库
   * @returns 是否成功（仓库满则失败）
   */
  addItem(item: Omit<ItemData, 'amount'>, amount: number = 1): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const storage = gdm.storage;

    const existing = storage.items.find(i => i.id === item.id && i.type === item.type && i.quality === item.quality);
    if (existing) {
      existing.amount += amount;
    } else {
      if (storage.items.length >= storage.capacity) {
        console.warn('[StorageManager] 仓库已满');
        return false;
      }
      storage.items.push({ ...item, amount });
    }

    EventBus.emit(GameEvent.STORAGE_CHANGED);
    gdm.save();
    return true;
  }

  /**
   * 消耗物品
   * @returns 是否成功
   */
  consumeItem(id: string, amount: number = 1, type?: string): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const storage = gdm.storage;

    const item = type
      ? storage.items.find(i => i.id === id && i.type === type)
      : storage.items.find(i => i.id === id);

    if (!item || item.amount < amount) return false;

    item.amount -= amount;
    if (item.amount <= 0) {
      storage.items.splice(storage.items.indexOf(item), 1);
    }

    EventBus.emit(GameEvent.STORAGE_CHANGED);
    gdm.save();
    return true;
  }

  // ─── 出售 ───

  /**
   * 向过路商人出售物品
   * @param itemId 物品 ID
   * @param amount 出售数量（0 = 全部）
   * @returns 出售结果，失败返回 null
   */
  sellItem(itemId: string, amount: number = 0): SellResult | null {
    const gdm = GameDataManager.instance;
    if (!gdm) return null;
    const storage = gdm.storage;

    const item = storage.items.find(i => i.id === itemId);
    if (!item) return null;

    const actualAmount = amount > 0 ? Math.min(amount, item.amount) : item.amount;
    if (actualAmount <= 0) return null;

    const unitPrice = this.getSellPrice(itemId, item.quality);
    const goldEarned = unitPrice * actualAmount;

    item.amount -= actualAmount;
    if (item.amount <= 0) {
      storage.items.splice(storage.items.indexOf(item), 1);
    }

    gdm.addGold(goldEarned);
    EventBus.emit(GameEvent.STORAGE_CHANGED);
    gdm.save();

    return { itemId, amount: actualAmount, goldEarned };
  }

  /**
   * 一键出售所有原料茶叶
   */
  sellAllTeaLeaves(): SellResult[] {
    const leaves = this.getItemsByType('tea_leaf').map(i => i.id);
    return leaves.map(id => this.sellItem(id)).filter(Boolean) as SellResult[];
  }

  /** 获取物品出售单价 */
  getSellPrice(itemId: string, quality?: number): number {
    // 精确匹配
    const qualitySuffix = quality !== undefined ? ['_normal', '_premium', '_supreme'][quality] : '';
    const exactKey = `${itemId}${qualitySuffix}`;
    if (SELL_PRICE_TABLE[exactKey]) return SELL_PRICE_TABLE[exactKey];
    if (SELL_PRICE_TABLE[itemId]) return SELL_PRICE_TABLE[itemId];
    // 前缀匹配
    for (const key of Object.keys(SELL_PRICE_TABLE)) {
      if (itemId.startsWith(key)) return SELL_PRICE_TABLE[key];
    }
    return 1; // 默认 1 金叶
  }

  // ─── 扩容 ───

  /** 获取可用的扩容方案 */
  getExpandOptions() {
    return STORAGE_EXPAND_OPTIONS;
  }

  /**
   * 扩充仓库容量
   * @param optionIndex 扩容方案索引
   */
  expandCapacity(optionIndex: number): boolean {
    const gdm = GameDataManager.instance;
    if (!gdm) return false;
    const option = STORAGE_EXPAND_OPTIONS[optionIndex];
    if (!option) return false;
    if (!gdm.addGold(-option.cost)) return false;
    gdm.storage.capacity += option.addCapacity;
    gdm.save();
    return true;
  }

  // ─── 物品整理 ───

  /** 整理仓库（合并相同物品，移除数量为 0 的条目） */
  organize(): void {
    const gdm = GameDataManager.instance;
    if (!gdm) return;
    const storage = gdm.storage;
    const merged: Map<string, ItemData> = new Map();

    for (const item of storage.items) {
      const key = `${item.id}_${item.type}_${item.quality ?? 0}`;
      if (merged.has(key)) {
        merged.get(key)!.amount += item.amount;
      } else {
        merged.set(key, { ...item });
      }
    }

    storage.items = Array.from(merged.values()).filter(i => i.amount > 0);
    EventBus.emit(GameEvent.STORAGE_CHANGED);
    gdm.save();
  }
}
