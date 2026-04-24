# web-ui

## 📌 作用

CLI 核心主体的可视化扩展渲染层，提供 Web Dashboard 和配置表单。

- **边界**：只负责前端界面展示和用户交互，不处理业务逻辑
- **调用关系**：通过 CLI `/xx-web` 命令启动，调用 server-go 后端 API
- **定位**：CLI 是核心，Web/Electron 是扩展层

## 目录结构

```
web-ui/
├── dist/
├── dist-electron/
├── docs/
│   ├── feature/                     # 技术方案文档
│   └── roadmap/
│       └── mvp.md                   # MVP 需求文档
├── index.html                      # Vue 挂载点
├── package.json                    # 依赖配置
├── package-lock.json                # 依赖锁定
├── scripts/
│   └── build-electron.mjs          # Electron 构建脚本
├── vite.config.ts                  # Vite 配置（代理到 127.0.0.1:8080）
├── tsconfig.json                   # TypeScript 配置
├── tsconfig.node.json              # Node TypeScript 配置
├── tailwind.config.js              # TailwindCSS 配置（DESIGN.md 规范）
├── postcss.config.js               # PostCSS 配置
├── electron.mjs                    # Electron 启动脚本
├── public/
│   ├── favicon.ico
│   ├── icon.svg                    # 托盘图标
│   ├── icon-notify.svg             # 托盘通知图标
│   └── icons/                      # 图标资源
│       ├── icon-active.svg
│       └── icon.svg
├── electron/                       # Electron 主进程
│   ├── tsconfig.json               # Electron TypeScript 配置
│   ├── main.ts                     # 主进程入口
│   ├── preload.ts                  # 预加载脚本（IPC 桥接）
│   ├── ipc.ts                      # IPC 通信定义
│   ├── store.ts                    # 本地配置存储（electron-store）
│   ├── tray.ts                     # 系统托盘管理
│   ├── notification.ts             # 通知管理（灵动岛 + 系统通知）
│   └── windows/
│       ├── mainWindow.ts           # 主窗口
│       └── islandWindow.ts         # 灵动岛悬浮窗口
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
    │   ├── knowledge.ts           # ← 新增：知识库 API
    │   └── llm.ts                 # ← 新增：LLM 统计与对话 API (2026-04-21)
    ├── components/
    │   ├── ui/                    # UI 基础组件
    │   │   ├── Button.vue         # 按钮组件（Gray/White/Black Pill）
    │   │   ├── Card.vue           # 卡片组件（12px 圆角）
    │   │   ├── Input.vue          # 输入框组件（Pill 形状）
    │   │   ├── Modal.vue          # 弹窗组件
    │   │   ├── Select.vue         # 下拉选择组件
    │   │   └── Badge.vue          # 状态徽章组件
    │   ├── Form/                  # 表单组件
    │   │   ├── McpForm.vue        # MCP 配置表单
    │   │   └── TimerForm.vue      # 定时任务表单
    │   ├── Knowledge/            # ← 新增：知识库组件
    │   │   └── RagChat.vue        # RAG 对话测试组件
    │   ├── DingIsland/           # 灵动岛组件
    │   │   ├── DingIslandCard.vue # 灵动岛卡片（悬浮通知）
    │   │   └── DingIslandStore.ts # Pinia 通知状态管理
    │   ├── Layout/               # 布局组件
    │   │   ├── Layout.vue        # 主布局
    │   │   └── Sidebar.vue       # 侧边栏
    │   ├── ServiceCard.vue        # 服务状态卡片
    │   ├── StatCard.vue           # 统计卡片
    │   └── Charts/               # 图表组件
    │       ├── BarChart.vue       # 柱状图
    │       ├── LineChart.vue      # 折线图
    │       └── PieChart.vue       # 饼图组件
    ├── stores/
    │   ├── theme.ts               # 主题状态管理（Pinia）
    │   └── dashboard.ts           # ← 新增：Dashboard 数据状态
    ├── views/
    │   ├── Help/
    │   │   └── HelpView.vue        # Help 首页（项目介绍）
    │   ├── Dashboard/
    │   │   └── DashboardView.vue   # Dashboard 页面
    │   ├── MCP/
    │   │   └── MCPView.vue         # MCP 配置页面 ✅ 已完成
    │   ├── Timer/
    │   │   └── TimerView.vue       # 定时任务页面 ✅ 已完成
    │   ├── Knowledge/             # ← 新增：知识库页面
    │   │   └── KnowledgePage.vue   # 知识库页面（左右分割布局）
    │   ├── Config/
    │   │   └── ConfigView.vue      # 系统配置页面
    │   ├── Conversation/         # ← 新增：对话记录页面 (2026-04-21)
    │   │   └── ConversationView.vue  # LLM 对话历史与统计
    │   └── Island/               # ← 新增：灵动岛视图
    │       └── IslandView.vue     # 灵动岛独立窗口视图
    ├── router/
    │   └── index.ts               # 路由配置（Hash 模式，含 /island）
    ├── types/
    │   └── electron.d.ts          # Electron API 类型声明
    └── styles/
        └── main.css               # 全局样式（DESIGN.md 规范）
```

## Rules 自维护

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
- 跨 service import（只能调 API，不能 import 包）
- 直接修改其他 service 的代码
- 在 web-ui 中实现业务逻辑（只做展示）
- 使用彩色（遵循 Ollama 纯灰度设计）

## 最后更新时间

2026-04-25：MCP 连接管理功能
- 新增 connectMCP 和 disconnectMCP API 函数（mcp.ts）
- MCPView.vue 新增 persistentConnectionStatus 状态管理
- 新增 connectMcp 和 disconnectMcp 函数实现连接/断开逻辑
- MCP 详情页新增"连接"/"断开连接"按钮
- 连接成功后自动加载工具列表
- 切换 MCP 时重置连接状态

2026-04-24：Phase 3 MCP Web UI 完善
- MCP 管理页面支持 streamable_http 传输类型
- 新增连接测试、工具列表、调用工具三个独立操作按钮
- 新增工具列表弹窗（展示工具名称、描述、inputSchema）
- 新增工具调用弹窗（支持输入工具名称和 JSON 参数，展示调用结果）
- 修复删除逻辑使用标准 DELETE 方法，失败时回退旧版 POST /delete
- 修复测试结果显示字段映射（服务端返回 status/tools/elapsed_ms/error）

2026-04-22：修正 AGENTS.md 目录树
- 补全根目录缺失项（dist/、dist-electron/、docs/、scripts/、package-lock.json、tsconfig.node.json）
- 展开 docs/（feature/、roadmap/）和 scripts/（build-electron.mjs）
- 添加 src/components/Layout/（Layout.vue、Sidebar.vue）
- 删除重复的 src/stores/ 和不存在的 docs/DESIGN.md