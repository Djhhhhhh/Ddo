# cli

## 📌 作用

Ddo CLI 是个人智能工作空间的命令行入口，提供交互式操作界面和后台服务生命周期管理。

- 边界：
  - **负责**：服务初始化、启动/停止/状态管理、REPL 交互、定时任务调度、知识库管理
  - **不负责**：LLM 推理（委托给 llm-py）、数据持久化逻辑（委托给 server-go）、Web UI（仅触发启动）
- 调用关系：
  - 被用户调用（CLI 入口）
  - 调用 Docker API（管理 MySQL 容器）
  - 调用 server-go API（状态查询、数据操作）
  - 调用 llm-py API（REPL 自然语言处理）

## 📂 目录结构

```
services/cli/
├── src/
│   ├── index.ts              # CLI 入口，命令注册和解析
│   ├── commands/
│   │   ├── init.ts           # init 命令实现
│   │   ├── start.ts          # start 命令实现 - 启动所有服务
│   │   ├── stop.ts           # stop 命令实现 - 停止所有服务
│   │   ├── status.ts         # status 命令实现 - 显示服务状态
│   │   └── logs.ts           # logs 命令实现 - 查看服务日志（2026-04-14）
│   ├── services/
│   │   ├── manager.ts        # 服务管理器 - 统一管理服务生命周期
│   │   ├── pid-file.ts       # PID 文件操作 - 读写进程ID
│   │   ├── health-check.ts   # 健康检查 - HTTP 轮询检查服务就绪
│   │   └── nlp.ts            # NLP Service - llm-py NLP 接口封装（2026-04-16）
│   ├── repl/
│   │   ├── index.ts          # REPL 入口，命令分发和自然语言处理
│   │   ├── parser.ts         # 命令解析器 - 支持参数、选项、引号字符串（2026-04-14）
│   │   ├── mode.ts           # 模式管理器 - 管理 Default/Chat/Kb/Timer/Mcp 模式（2026-04-14）
│   │   ├── intent-router.ts  # 意图路由器 - NLP 意图路由+参数标准化（2026-04-16）
│   │   ├── validators.ts     # 参数验证工具 - KB/Timer/MCP 参数验证（2026-04-16）
│   │   ├── completer.ts      # Tab 自动补全（2026-04-14）
│   │   └── commands/         # REPL 命令目录（2026-04-14）
│   │       ├── index.ts      # 命令注册中心和接口定义
│   │       ├── chat.ts       # /chat 命令 - AI 对话和聊天模式
│   │       ├── status.ts     # /status 命令 - 服务状态查看
│   │       ├── exit.ts       # /exit、/back 命令
│   │       ├── help.ts       # /help 命令 - 帮助系统
│   │       ├── clear.ts      # /clear 命令
│   │       └── mode-switch.ts # /kb、/timer、/mcp 模式切换命令
│   ├── templates/
│   │   ├── config.yaml.ts    # 配置文件模板
│   │   └── docker-compose.yml.ts  # Docker Compose 模板
│   ├── utils/
│   │   ├── index.ts          # 工具模块导出
│   │   ├── logger.ts         # 终端日志输出工具
│   │   ├── paths.ts          # 路径解析工具
│   │   ├── docker.ts         # Docker 操作封装
│   │   └── log-reader.ts     # 日志读取、过滤、跟踪工具（2026-04-14）
│   └── types/
│       └── index.ts          # TypeScript 类型定义
├── dist/                     # 编译输出（自动构建）
├── docs/
│   ├── roadmap/
│   │   └── mvp.md            # MVP 需求文档
│   └── feature/              # 技术方案目录
│       ├── 2026-04-14-ddo-init/
│       │   └── 技术方案.md
│       └── 2026-04-16-nlp-integration/  # NLP 集成（2026-04-16）
│           └── 技术方案.md
├── .claude/
│   └── rules/
│       └── rules.md          # 服务规则文件
├── package.json              # npm 配置
├── tsconfig.json             # TypeScript 配置
└── AGENTS.md (本文件)
```

## 🧠 Rules 自维护

**此章节指导 AI 如何自动维护本服务的规则。**

### Rules 文件位置
- 本服务规则：[.claude/rules/rules.md](.claude/rules/rules.md)

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
- [ ] 如涉及新架构/规范，已更新 .claude/rules/<service>.md

## 🚫 禁止

硬性红线（违反会导致架构混乱）：
- ❌ 跨 service import（只能调 API，不能 import 包）
- ❌ 直接修改其他 service 的代码
- ❌ 在 CLI 中实现 LLM 推理逻辑（应调用 llm-py）
- ❌ 在 CLI 中直接操作 MySQL 数据库（应通过 server-go API）

## 🕒 最后更新时间

2026-04-16：新增 NLP 参数标准化（intent-router.ts 标准化函数、validators.ts 验证工具）
2026-04-16：新增 NLP 集成（intent-router.ts, nlp.ts）
2026-04-14 20:30:00
