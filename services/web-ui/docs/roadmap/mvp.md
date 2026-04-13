# Ddo web-ui MVP需求文档 v1.0

## 1. 目标与指标

- 核心问题：提供可视化配置界面、健康监控面板，以及 **Electron 通知客户端**，作为 CLI 核心主体的扩展渲染层。
- 目标用户：使用 CLI 的开发者，需要可视化界面或系统通知补充。

**技术决策**：
- **架构定位**：CLI 是核心主体，Web/Electron 是扩展渲染层
- Web Dashboard：弥补 CLI 的可视化不足（统计图表、配置表单）
- **Electron 通知**：弥补 CLI 无法弹窗通知的短板（灵动岛、系统通知）
- 启动方式：
  - Web: 通过 CLI `ddo web` 启动（CLI 已启动服务后）
  - **Electron: `ddo ding` 启动通知客户端，接收 CLI 发送的通知事件**
- 无登录：直接访问，无需登录
- 服务绑定：`127.0.0.1:3000`（Web），Electron 通过 localhost 连接后端

- 成功指标：
  - 首屏加载时间 < 3 秒
  - Dashboard 数据刷新延迟 < 500ms
  - 监控面板数据准确率 99%
  - 浏览器兼容性（Chrome/Safari/Firefox/Edge）

## 2. 核心流程（CLI 为核心的扩展架构）

> **设计原则**：CLI 是核心主体，Web 和 Electron 是弥补 CLI 短板的扩展渲染层

```
CLI 主体：
- REPL 交互（主要操作入口）
- 服务生命周期管理（MySQL/server-go/llm-py）
- 定时任务调度
- 日志查看（文本形式）

扩展层：
├── Web Browser：弥补可视化不足
│   └── Dashboard 图表、配置表单
│
└── Electron：弥补通知能力不足
    └── 灵动岛提示、系统通知中心
```

### Web 端（浏览器扩展）

**定位**：弥补 CLI 的可视化短板

1. 步骤一：启动 Web 服务
   - CLI 运行 `ddo web` 启动 Web 服务
   - 或 `ddo start` 已自动启动 Web（可选配置）
   - 浏览器访问 `http://localhost:3000`

2. 步骤二：Dashboard 可视化
   - 将 CLI `ddo status` 的文本信息可视化展示
   - 服务健康状态卡片（图形化）
   - 定时任务统计图表（趋势可视化）
   - 知识库统计（条目、存储饼图）
   - LLM 调用趋势（折线图）

3. 步骤三：表单化配置
   - 将 CLI 命令式配置改为表单操作
   - MCP 可视化配置（替代 `ddo mcp create`）
   - 定时任务可视化（替代 `ddo timer create`）
   - 系统设置表单（替代 `ddo config set`）

### Electron 端（通知扩展）

**定位**：弥补 CLI 无法弹出通知的短板

4. 步骤四：启动通知客户端
   - CLI 运行 **`ddo ding`** 启动 Electron 通知客户端
   - Electron 最小化到系统托盘（常驻后台）
   - 连接后端服务（`http://localhost:8080`）

5. 步骤五：接收 CLI 通知事件
   - CLI 调度定时任务触发时，发送通知事件到后端
   - Electron 轮询/接收 WebSocket 通知
   - 示例流程：
     ```
     定时任务触发
         ↓
     server-go 执行回调
         ↓
     发送通知事件到 Electron
         ↓
     灵动岛弹出提示："喝水提醒 - 该喝水了！"
     ```

6. 步骤六：灵动岛通知
   - 显示屏幕角落悬浮消息（非模态，不打扰）
   - 支持快捷操作："完成"、"5分钟后提醒"、"查看详情"
   - 自动消失或点击关闭

7. 步骤七：系统级通知
   - 重要事件（任务失败、服务离线）触发 OS 通知
   - 进入系统通知中心历史记录
   - 点击通知可唤起 CLI 或 Web

## 3. 功能列表（MoSCoW）

| 模块 | 功能点 | 优先级 | 描述 | 验收标准 |
|------|--------|--------|------|----------|
| 基础框架 | Vue 3 + Vite | P0 | 前端框架搭建 | 1. Vue 3 Composition API 2. Vite 构建工具 3. 支持热更新 4. TypeScript 支持 |
| 基础框架 | Axios HTTP 客户端 | P0 | API 通信 | 1. 封装 axios 实例 2. 统一错误处理 3. 请求/响应拦截器 |
| 基础框架 | Vue Router | P0 | 路由管理 | 1. `/dashboard` 路由 2. `/mcp` 路由 3. `/config` 路由 4. 路由守卫（预留） |
| 基础布局 | 侧边栏导航 | P0 | 左侧固定导航菜单 | 1. Logo + 服务名称 2. Dashboard、MCP、定时任务、配置 菜单 3. 响应式折叠（移动端） |
| 基础布局 | 主题切换 | P1 | 深色/浅色模式 | 1. 支持 dark/light 主题 2. 本地存储偏好 3. 系统主题自动适配 |
| Dashboard | 服务状态卡片 | P0 | 显示各服务健康状态 | 1. CLI、server-go、llm-py、MySQL 四个卡片 2. 显示状态指示灯（🟢/🔴） 3. 显示版本号 4. 显示 uptime/延迟 |
| Dashboard | 定时任务统计 | P0 | 定时任务执行概况 | 1. 总任务数 2. 运行中/暂停数 3. 今日执行次数 4. 成功/失败数量 |
| Dashboard | 知识库统计 | P0 | 知识库数据概况 | 1. 总条目数 2. 本月新增 3. 存储占用（MB） |
| Dashboard | MCP 状态列表 | P0 | MCP 连接状态展示 | 1. 名称、类型、状态列 2. 最后检查时间 3. 错误状态标记 |
| Dashboard | LLM 调用趋势 | P1 | 近7天调用量图表 | 1. 柱状图或折线图 2. 显示总调用数、成功率、平均延迟 3. 使用轻量图表库 |
| Dashboard | 自动刷新 | P1 | 数据自动更新 | 1. 每 30 秒自动刷新 2. 显示最后更新时间 3. 支持手动刷新按钮 |
| MCP 配置 | MCP 列表页 | P0 | MCP 配置列表 | 1. 表格展示（名称、类型、状态） 2. 分页（如有必要） 3. 搜索过滤 |
| MCP 配置 | 新增 MCP 表单 | P0 | 创建 MCP 配置 | 1. 名称输入 2. 类型选择（stdio/http/sse） 3. 动态 config 表单 4. 表单验证 |
| MCP 配置 | MCP 测试 | P0 | 测试 MCP 连接 | 1. 测试按钮 2. 显示测试结果（成功/失败） 3. 显示可用工具列表 4. 显示测试耗时 |
| MCP 配置 | 删除 MCP | P1 | 删除 MCP 配置 | 1. 删除确认对话框 2. 删除成功提示 |
| 定时任务 | 任务列表页 | P1 | 定时任务展示 | 1. 表格展示（名称、cron、状态） 2. 支持分页 3. 显示下次执行时间 |
| 定时任务 | 执行日志查看 | P1 | 任务执行历史 | 1. 点击任务查看日志 2. 显示状态、输出、错误、耗时 |
| 定时任务 | 暂停/恢复 | P1 | 任务状态控制 | 1. 暂停按钮 2. 恢复按钮 3. 状态实时更新 |
| 系统配置 | 用户偏好 | P1 | 用户设置表单 | 1. LLM 模型选择 2. 主题选择 3. 自动保存 |
| 系统配置 | 配置预览 | P1 | 显示当前配置 | 1. 只读展示 `config.yaml` 2. 格式化为表格展示 |
| **Electron** | **主窗口** | **P1** | **Electron 主进程** | 1. 加载 Web UI 2. 窗口管理 3. 系统托盘 4. 开机自启配置 |
| **Electron** | **灵动岛通知** | **P0** | **屏幕角落消息提示** | 1. 定时任务触发时显示 2. 支持自定义样式 3. 点击交互 4. 自动消失/手动关闭 |
| **Electron** | **系统通知** | **P1** | **OS 级通知中心** | 1. 调用系统通知 API 2. 通知历史记录 3. 通知级别配置 |
| **Electron** | **快捷键** | **P2** | **全局快捷键** | 1. 显示/隐藏窗口快捷键 2. 快速启动 MCP 工具（预留） |

## 4. 本期不做（明确排除）

- 用户登录和认证系统（保持无登录）
- 知识库内容的富文本编辑（仅查看和搜索）
- 定时任务的创建和编辑（移到 CLI 实现）
- ~~灵动岛/桌面通知组件~~（本期已实现）
- PWA 离线访问支持
- 移动端 App 适配（仅响应式 Web + Electron）
- WebSocket 实时推送（轮询方案，Electron 预留扩展）
- 多语言和国际化（仅中文）
- 操作权限控制（保持单用户）
- 数据可视化高级图表（使用轻量级方案）

## 5. 底线要求

- 性能：
  - 首屏加载时间 < 3 秒
  - 路由切换 < 300ms
  - API 请求超时 10 秒
  - Dashboard 数据刷新 < 500ms
- 可用性：
  - server-go 不可用时的友好提示
  - 网络断线检测和重连提示
  - 表单提交防重复点击
  - 错误边界（Error Boundary）处理
- 埋点事件：
  - `page_view`: 页面访问（含页面名称）
  - `dashboard_refresh`: Dashboard 手动刷新
  - `mcp_test_click`: MCP 测试按钮点击
  - `config_save`: 配置保存
  - `error_boundary`: 前端错误捕获

## 附录

- 目录结构图：
  ```
  web-ui/
  ├── electron/                    # Electron 主进程（新增）
  │   ├── main.ts                  # Electron 入口
  │   ├── preload.ts               # 预加载脚本
  │   ├── windows/
  │   │   ├── mainWindow.ts        # 主窗口管理
  │   │   └── islandWindow.ts      # 灵动岛窗口
  │   ├── tray.ts                  # 系统托盘
  │   └── notification.ts          # 通知管理
  ├── public/
  │   └── favicon.ico
  ├── src/                         # Vue 前端（渲染进程）
  │   ├── api/
  │   │   ├── client.ts
  │   │   ├── health.ts
  │   │   ├── knowledge.ts
  │   │   ├── timer.ts
  │   │   ├── mcp.ts
  │   │   └── settings.ts
  │   ├── components/
  │   │   ├── Layout/
  │   │   ├── ServiceCard/
  │   │   ├── StatCard/
  │   │   ├── Chart/
  │   │   └── DingIsland/          # 灵动岛组件（新增）
  │   ├── views/
  │   │   ├── Dashboard/
  │   │   ├── MCP/
  │   │   ├── Timer/
  │   │   ├── Config/
  │   │   └── Home/
  │   ├── router/
  │   │   └── index.ts
  │   ├── stores/
  │   ├── App.vue
  │   └── main.ts
  ├── index.html
  ├── package.json
  ├── vite.config.ts
  └── tsconfig.json
  ```
- 技术栈：
  **Web 端：**
  - Vue 3.3+
  - TypeScript 5.0+
  - Vite 4.0+
  - Vue Router 4.0+
  - Axios 1.0+
  - 轻量级图表库（如 Chart.js 或 ECharts 精简版）
  - CSS 框架（推荐 TailwindCSS 或原生 CSS）
  
  **Electron 端：**
  - Electron 28+（支持 ESM）
  - electron-builder（打包）
  - 系统通知 API
  - 全局快捷键
- 相关文档：
  - [MVP 总览](../../../docs/roadmap/mvp.md)
  - [CLI MVP](../../cli/docs/roadmap/mvp.md)
  - [server-go MVP](../../server-go/docs/roadmap/mvp.md)
  - [llm-py MVP](../../llm-py/docs/roadmap/mvp.md)
