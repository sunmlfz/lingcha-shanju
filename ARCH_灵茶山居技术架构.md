# 技术架构文档 - 灵茶山居

## 技术选型

| 方向 | 选型 | 版本 |
|------|------|------|
| 游戏引擎 | Cocos Creator | 3.8.x |
| 开发语言 | TypeScript | 5.x |
| 包管理 | npm | 10.x |
| UI 框架 | Cocos 内置 UI | - |
| 数据存储 | localStorage (JSON) | - |
| 资源管理 | Cocos 资源管理系统 | - |

---

## 项目目录结构

```
lingcha-shanju/
├── assets/
│   ├── scripts/
│   │   ├── core/
│   │   │   ├── GameDataManager.ts     # 全局数据管理
│   │   │   ├── TimeManager.ts         # 时间/离线管理
│   │   │   └── EventBus.ts            # 事件总线
│   │   ├── modules/
│   │   │   ├── garden/
│   │   │   │   ├── GardenManager.ts   # 茶圃管理
│   │   │   │   ├── PlotController.ts  # 单地块控制器
│   │   │   │   └── TeaConfig.ts       # 茶种配置数据
│   │   │   ├── brew/
│   │   │   │   ├── BrewManager.ts     # 炼茶管理
│   │   │   │   └── BrewRecipe.ts      # 配方数据
│   │   │   ├── sense/
│   │   │   │   ├── SenseManager.ts    # 品茶/悟道管理
│   │   │   │   └── TeaEffect.ts       # 茶效果配置
│   │   │   ├── storage/
│   │   │   │   └── StorageManager.ts  # 仓库管理
│   │   │   └── quest/
│   │   │       ├── QuestManager.ts    # 任务管理
│   │   │       └── QuestConfig.ts     # 任务配置
│   │   ├── scenes/
│   │   │   ├── MainScene.ts           # 主场景控制器
│   │   │   ├── GardenScene.ts         # 茶圃场景
│   │   │   └── BrewScene.ts           # 炼茶场景
│   │   └── utils/
│   │       ├── SaveUtils.ts           # 存档工具
│   │       └── MathUtils.ts           # 数学工具函数
│   ├── scenes/
│   │   ├── MainScene.scene
│   │   └── LoadingScene.scene
│   ├── prefabs/
│   │   ├── garden/
│   │   │   ├── PlotPrefab.prefab
│   │   │   └── TeaPlantPrefab.prefab
│   │   └── ui/
│   │       ├── ToastPrefab.prefab
│   │       └── DialogPrefab.prefab
│   ├── textures/
│   │   ├── tea/          # 茶叶图片
│   │   ├── ui/           # UI 元素
│   │   └── backgrounds/  # 背景图
│   └── sounds/
│       ├── bgm/          # 背景音乐
│       └── sfx/          # 音效
├── packages.json
└── tsconfig.json
```

---

## 核心模块设计

### GameDataManager（全局数据管理）

```typescript
// 职责：单例数据中心，管理所有游戏状态
interface GameData {
  player: PlayerData;
  garden: GardenData;
  storage: StorageData;
  quest: QuestData;
  settings: SettingsData;
}

interface PlayerData {
  gold: number;           // 金叶数量
  enlightenment: number;  // 悟道值
  level: number;          // 玩家等级
  unlockedTeas: string[]; // 已解锁茶种
}
```

**关键方法：**
- `save()` / `load()` — 存档/读档
- `getData<T>(key: string): T` — 泛型数据读取
- `setData(key: string, value: any): void` — 数据更新（触发自动保存）

---

### TimeManager（时间管理）

```typescript
// 职责：游戏时间、离线补偿、计时器管理
class TimeManager {
  private lastSaveTime: number;
  private timers: Map<string, Timer>;
  
  // 计算离线时间（上限 8 小时）
  getOfflineDuration(): number;
  
  // 注册全局计时器
  registerTimer(id: string, interval: number, callback: Function): void;
  
  // 游戏加速（道具效果）
  setSpeedMultiplier(multiplier: number, duration: number): void;
}
```

---

### GardenManager（茶圃管理）

```typescript
// 职责：管理所有茶圃地块的生长状态
interface PlotData {
  id: number;
  teaType: string | null;  // 种植的茶种，null 表示空地
  stage: GrowthStage;      // 生长阶段 0-3
  plantedAt: number;       // 种植时间戳
  fertilized: boolean;     // 是否施肥
}

enum GrowthStage {
  EMPTY = 0,
  SEEDLING = 1,
  GROWING = 2,
  MATURE = 3,
}

class GardenManager {
  plant(plotId: number, teaType: string): void;
  harvest(plotId: number): TeaLeaf[];
  fertilize(plotId: number): void;
  
  // 离线补偿：根据离线时长更新所有地块状态
  applyOfflineProgress(offlineSecs: number): void;
}
```

---

### BrewManager（炼茶管理）

```typescript
// 职责：管理炼茶台和制茶流程
interface BrewTask {
  id: string;
  recipeId: string;
  materials: { teaType: string; amount: number }[];
  startTime: number;
  duration: number;        // 炼制时长（秒）
  qualityBonus: number;    // 品质加成 0-1
}

class BrewManager {
  startBrew(stationId: number, recipeId: string, materials: Item[]): void;
  collectResult(stationId: number): BrewResult;
  
  // 迷你游戏结果影响品质
  applyMiniGameBonus(taskId: string, score: number): void;
}
```

---

### SenseManager（品茶/悟道管理）

```typescript
// 职责：品茶体验和悟道值管理
class SenseManager {
  drinkTea(teaId: string): SenseResult;
  
  // 获取茶的意境描述（随机从配置池中选取）
  getTeaPoem(teaType: string): string;
  
  // 检查是否解锁新感悟
  checkEnlightenment(current: number): Enlightenment | null;
}

interface SenseResult {
  enlightenmentGain: number;
  poem: string;           // 意境文字
  specialEffect?: string; // 特殊效果（如触发灵感碎片）
}
```

---

## 数据存储方案

### 存储键设计

```typescript
const SAVE_KEYS = {
  GAME_DATA: 'lingcha_game_data',
  SETTINGS: 'lingcha_settings',
  LAST_ONLINE: 'lingcha_last_online',
};
```

### 存档频率策略

| 触发条件 | 行为 |
|---------|------|
| 每 30 秒 | 自动保存 |
| 关键操作（收获/炼茶完成） | 立即保存 |
| 游戏切后台 | 立即保存 + 记录时间戳 |
| 游戏打开 | 读取存档 + 计算离线补偿 |

### 数据版本管理

```typescript
interface SaveFile {
  version: number;  // 当前: 1
  data: GameData;
  checksum: string; // 简单防篡改
}
```

---

## 性能优化策略

1. **对象池（Object Pool）：** 茶叶粒子、飘字、地块动画对象复用
2. **懒加载：** 未显示的场景资源按需加载
3. **更新频率：** 
   - 生长进度：每 5 秒检查一次（非每帧）
   - UI 刷新：状态变化驱动，不做 Polling
4. **内存管理：** 切场景时主动卸载未使用的资源 Bundle

---

## 事件系统设计

```typescript
// 全局事件总线，模块间解耦通信
enum GameEvent {
  GOLD_CHANGED = 'gold_changed',
  TEA_HARVESTED = 'tea_harvested',
  BREW_COMPLETE = 'brew_complete',
  ENLIGHTENMENT_UP = 'enlightenment_up',
  QUEST_COMPLETE = 'quest_complete',
  LEVEL_UP = 'level_up',
}

// 使用示例
EventBus.emit(GameEvent.TEA_HARVESTED, { teaType: 'green', amount: 3 });
EventBus.on(GameEvent.TEA_HARVESTED, this.onTeaHarvested, this);
```

---

## 开发约定

- **命名规范：** PascalCase 类名，camelCase 变量/方法，UPPER_SNAKE_CASE 常量
- **注释：** 公开方法必须有 JSDoc 注释
- **禁止：** 在 Update/LateUpdate 中做重计算，一律用事件驱动
- **资源路径：** 统一用 `resources/` 目录下的相对路径
- **错误处理：** 数据加载失败必须有降级默认值，不允许 crash
