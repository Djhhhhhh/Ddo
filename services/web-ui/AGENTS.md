# web-ui

## 📌 作用

CLI 核心主体的可视化扩展渲染层，提供 Web Dashboard 和配置表单。

- **边界**：只负责前端界面展示和用户交互，不处理业务逻辑
- **调用关系**：通过 CLI `/xx-web` 命令启动，调用 server-go 后端 API
- **定位**：CLI 是核心，Web/Electron 是扩展层

## 📂 目录结构

```
web-ui/
├── index.html                      # Vue 挂载点
├── package.json                    # 依赖配置
├── vite.config.ts                  # Vite 配置（代理到 127.0.0.1:8080）
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.js              # TailwindCSS 配置（DESIGN.md 规范）
├── postcss.config.js               # PostCSS 配置
├── public/
│   └── favicon.ico
└── src/
    ├── main.ts                     # 应用入口
    ├── App.vue                     # 根组件
    ├── vue-shim.d.ts               # Vue 文件类型声明
    ├── api/
    │   ├── client.ts               # Axios 封装（baseURL: 127.0.0.1:8080）
    │   ├── index.ts               # ← 新增：API 模块统一导出
    │   ├── types.ts               # ← 新增：API 类型定义
    │   ├── health.ts              # ← 新增：健康检查 API
    │   ├── metrics.ts             # ← 新增：综合指标 API
    │   ├── timer.ts               # ← 新增：定时任务 API
    │   ├── mcp.ts                 # ← 新增：MCP 配置 API
    │   └── knowledge.ts           # ← 新增：知识库 API
    ├── components/
    │   ├── ui/                    # UI 基础组件
    │   │   ├── Button.vue         # 按钮组件（Gray/White/Black Pill）
    │   │   ├── Card.vue           # 卡片组件（12px 圆角）
    │   │   └── Input.vue          # 输入框组件（Pill 形状）
    │   ├── ServiceCard.vue        # ← 新增：服务状态卡片
    │   ├── StatCard.vue           # ← 新增：统计卡片
    │   └── Charts/               # ← 新增：图表组件
    │       ├── BarChart.vue       # 柱状图
    │       └── LineChart.vue       # 折线图
    ├── stores/
    │   ├── theme.ts               # 主题状态管理（Pinia）
    │   └── dashboard.ts           # ← 新增：Dashboard 数据状态
    ├── views/
    │   ├── Help/
    │   │   └── HelpView.vue        # Help 首页（项目介绍）
    │   ├── Dashboard/
    │   │   └── DashboardView.vue   # Dashboard 页面（开发中）
    │   ├── MCP/
    │   │   └── MCPView.vue          # MCP 配置页面（开发中）
    │   ├── Timer/
    │   │   └── TimerView.vue       # 定时任务页面（开发中）
    │   └── Config/
    │       └── ConfigView.vue       # 系统配置页面（开发中）
    ├── router/
    │   └── index.ts               # 路由配置（Hash 模式）
    ├── stores/
    │   └── theme.ts               # 主题状态管理（Pinia）
    └── styles/
        └── main.css               # 全局样式（DESIGN.md 规范）
```

## 🧠 Rules 自维护

**此章节指导 AI 如何自动维护本服务的规则。**

### Rules 文件位置
- 本服务规则：[.claude/rules/rules.md](.claude/rules/rules.md)

### 设计规范
- 必须遵循 `DESIGN.md` 中的 Ollama 风格规范
- 灰度色系（无彩色）、Pill 按钮、零阴影、12px/9999px 二元 border-radius

### 何时更新 Rules
开发完成后，如果满足以下条件之一，**必须**更新 Rules：
- 🆕 引入新的架构模式
- 📁 新增目录结构
- 📋 改变代码规范
- 🔁 出现重复实现（需要抽象规则）

### 如何更新 Rules
1. 打开 [.claude/rules/rules.md](.claude/rules/rules.md)
2. 在对应类别下追加新规则（不要覆盖）
3. 格式：`- 规则描述（发现日期：YYYY-MM-DD）`

> 💡 提示：每次开发完成后问自己：这次我学到了什么模式值得记录？

## ✅ 开发检查清单

提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/rules.md
- [ ] UI 组件遵循 DESIGN.md 规范（灰度色系、Pill 按钮）

## 🚫 禁止

硬性红线（违反会导致架构混乱）：
- ❌ 跨 service import（只能调 API，不能 import 包）
- ❌ 直接修改其他 service 的代码
- ❌ 在 web-ui 中实现业务逻辑（只做展示）
- ❌ 使用彩色（遵循 Ollama 纯灰度设计）

## 🕒 最后更新时间

2026-04-19 22:35:00