# 灵茶山居 🍵

> 国风休闲茶道养成游戏

![版本](https://img.shields.io/badge/版本-0.1.0-green)
![引擎](https://img.shields.io/badge/Cocos_Creator-3.8.x-blue)
![语言](https://img.shields.io/badge/TypeScript-5.x-blue)
![平台](https://img.shields.io/badge/平台-微信小游戏_|_H5-orange)

---

## 🎮 游戏简介

玩家扮演隐居山林的茶道修行者，在灵山仙境中种植各类灵茶，炼制茶饮，通过品茶提升悟道值，解锁更多茶种与场景。

**核心循环：**
```
种茶 → 采摘 → 炼制 → 品鉴 → 解锁新品种 → 种茶
```

---

## ✨ 功能模块

| 模块 | 说明 |
|------|------|
| 🌿 **种植系统** | 4~16 格茶圃，9 种茶叶，4 阶段生长，实时 + 离线补偿 |
| 🫖 **炼茶系统** | 1~3 台炼茶台，7 种配方，迷你游戏影响品质（普通/精品/极品） |
| ☯ **品茶系统** | 品茶积累悟道值，意境诗句，灵感碎片，茶友拜访 |
| 📦 **仓库系统** | 背包管理，物品分类，出售换取金叶，容量可扩充 |
| 📋 **任务系统** | 每日 3 任务，20 章主线剧情，100+ 成就体系 |

---

## 🏗️ 项目结构

```
lingcha-shanju/
├── assets/
│   └── scripts/
│       ├── core/
│       │   ├── EventBus.ts          # 全局事件总线
│       │   ├── GameDataManager.ts   # 全局数据管理（单例）
│       │   └── TimeManager.ts       # 时间/离线补偿管理
│       ├── modules/
│       │   ├── garden/
│       │   │   ├── TeaConfig.ts     # 茶种配置数据（9 种）
│       │   │   ├── GardenManager.ts # 茶圃管理器
│       │   │   └── PlotController.ts# 地块 UI 控制器
│       │   ├── brew/
│       │   │   ├── BrewRecipe.ts    # 配方数据（7 种）
│       │   │   └── BrewManager.ts   # 炼茶管理器
│       │   ├── sense/
│       │   │   └── SenseManager.ts  # 品茶/悟道管理器
│       │   ├── storage/
│       │   │   └── StorageManager.ts# 仓库管理器
│       │   └── quest/
│       │       ├── QuestConfig.ts   # 任务配置数据
│       │       └── QuestManager.ts  # 任务管理器
│       ├── scenes/
│       │   └── MainScene.ts         # 主场景控制器
│       └── utils/
│           └── SaveUtils.ts         # 存档工具（版本管理 + checksum）
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🍵 茶种一览

| 茶种 | 等级 | 生长时间 | 基础金叶 | 悟道值 | 解锁条件 |
|------|------|---------|---------|--------|---------|
| 绿茶 | 普通 | 5 分钟 | 10 | 5 | 初始解锁 |
| 白茶 | 普通 | 10 分钟 | 20 | 10 | 初始解锁 |
| 红茶 | 普通 | 8 分钟 | 15 | 8 | Lv.2 |
| 乌龙 | 普通 | 12 分钟 | 25 | 12 | Lv.3 |
| 雨前龙井 | 灵品 | 30 分钟 | 80 | 40 | 悟道值 100 |
| 白毫银针 | 灵品 | 30 分钟 | 90 | 45 | 悟道值 150 |
| 正山小种 | 灵品 | 40 分钟 | 100 | 50 | 悟道值 200 |
| 灵芽仙露 | 仙品 | 60 分钟 | 200 | 100 | 主线第 10 章 |
| 千年古树普洱 | 仙品 | 120 分钟 | 500 | 200 | 成就「茶道宗师」 |

---

## 🔧 技术规范

- **引擎：** Cocos Creator 3.8.x
- **语言：** TypeScript 5.x（严格模式）
- **存档：** localStorage + JSON + checksum 校验
- **事件：** 自研 EventBus，模块间解耦
- **时间：** 真实时间戳 + 离线补偿（上限 8 小时）
- **性能：** 生长检查每 5 秒一次，UI 事件驱动，无 polling

---

## 🚀 开发指南

### 安装依赖
```bash
npm install
```

### 类型检查
```bash
npm run build
```

### 代码规范
```bash
npm run lint
```

### 接入 Cocos Creator
1. 使用 Cocos Creator 3.8.x 打开项目根目录
2. `assets/scripts/` 目录下的脚本会自动被引擎识别
3. 将 `GameDataManager`、`TimeManager` 等挂载到场景中的持久节点
4. 将 `MainScene` 挂载到主场景根节点

---

## 📅 MVP 里程碑

| 周次 | 目标 |
|------|------|
| Week 1 | 基础种植系统 + UI 框架 |
| Week 2 | 炼茶系统 + 仓库系统 |
| Week 3 | 品茶系统 + 任务系统 |
| Week 4 | 数据持久化 + 性能优化 + 测试 |

---

## 📄 License

MIT © 灵茶山居开发团队
