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
│   │   ├── api-client.ts     # server-go API 客户端，统一封装状态/知识库/定时器/MCP/聊天请求
│   │   ├── health-check.ts   # 健康检查 - HTTP 轮询检查服务就绪
│   │   ├── manager.ts        # 服务管理器 - 统一管理服务生命周期
│   │   ├── nlp.ts            # NLP Service - llm-py NLP 接口封装（2026-04-16）
│   │   ├── pid-file.ts       # PID 文件操作 - 读写进程 ID
│   │   ├── service-runtime.ts # 服务运行时定义 - 路径解析与 Electron 启动配置（2026-04-22）
│   │   └── web-ui-server.ts  # Web UI 本地静态服务与路由回退处理（2026-04-22）
│   ├── repl/
│   │   ├── index.ts          # REPL 入口，命令分发和自然语言处理
│   │   ├── parser.ts         # 命令解析器 - 支持参数、选项、引号字符串（2026-04-14）
│   │   ├── mode.ts           # 模式管理器 - 管理 Default/Chat/Kb/Timer/Mcp 模式（2026-04-14）
│   │   ├── intent-router.ts  # 意图路由器 - NLP 意图路由+参数标准化（2026-04-16）
│   │   ├── validators.ts     # 参数验证工具 - KB/Timer/MCP 参数验证（2026-04-16）
│   │   ├── completer.ts      # Tab 自动补全（2026-04-14）
│   │   ├── conversation-handler.ts # AI 对话输出与流式交互处理（2026-04-22）
│   │   ├── commands/         # REPL 命令目录（2026-04-14）
│   │   │   ├── index.ts      # 命令注册中心、接口定义与命令调度
│   │   │   ├── chat.ts       # /chat 命令 - AI 对话和聊天模式
│   │   │   ├── status.ts     # /status 命令 - 服务状态查看
│   │   │   ├── exit.ts       # /exit、/back 命令
│   │   │   ├── help.ts       # /help 命令 - 帮助系统
│   │   │   ├── clear.ts      # /clear 命令
│   │   │   ├── kb-commands.ts # /kb 子命令实现（2026-04-22）
│   │   │   ├── mcp-commands.ts # /mcp 子命令实现（2026-04-22）
│   │   │   ├── mode-switch.ts # /kb、/timer、/mcp 模式切换命令
│   │   │   ├── prompt-helper.ts # 模式提示与快捷帮助输出（2026-04-22）
│   │   │   ├── timer-commands.ts # /timer 子命令实现（2026-04-22）
│   │   │   └── web-shortcuts.ts # /web、/status-web、/timer-web、/mcp-web、/kb-web 快捷入口（2026-04-20）
│   │   └── tools/
│   │       ├── index.ts      # REPL 工具模块导出
│   │       └── registry.ts   # REPL 工具注册与按名执行
│   ├── templates/
│   │   ├── config.yaml.ts    # 配置文件模板
│   │   └── docker-compose.yml.ts  # Docker Compose 模板
│   ├── utils/
│   │   ├── config.ts         # Ddo 配置读取与写入工具（2026-04-22）
│   │   ├── index.ts          # 工具模块导出
│   │   ├── logger.ts         # 终端日志输出工具
│   │   ├── paths.ts          # 路径解析工具
│   │   ├── docker.ts         # Docker 操作封装
│   │   ├── log-reader.ts     # 日志读取、过滤、跟踪工具（2026-04-14）
│   │   └── open-url.ts       # Web UI 地址解析与浏览器打开工具（2026-04-20）
│   └── types/
│       └── index.ts          # TypeScript 类型定义
├── dist/                     # 编译输出（自动构建）
├── docs/
│   ├── roadmap/
│   │   └── mvp.md            # MVP 需求文档
│   └── feature/              # 技术方案目录
│       ├── 2026-04-14-cli-repl-base/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-14-ddo-init/
│       │   └── 技术方案.md
│       ├── 2026-04-14-ddo-logs/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-14-ddo-start/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-16-nlp-integration/  # NLP 集成（2026-04-16）
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-17-cli-repl-enhancement/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       └── 2026-04-20-cli-web-shortcuts/
│           ├── 技术方案.md
│           └── review-list.md
├── .claude/
│   └── rules/
│       └── rules.md          # 服务规则文件
├── tests/
│   └── mock-server.js        # 本地测试用模拟服务
├── vendor/                   # 打包附带的本地依赖与运行资源
├── node_modules/             # 本地安装依赖（开发产物）
├── package-lock.json         # npm 锁文件
├── package.json              # npm 配置
├── tsconfig.json             # TypeScript 配置
└── AGENTS.md (本文件)

## 规则

- 所有路径、目录和文件说明必须以 `services/cli` 的真实内容为准，禁止补写不存在的命令、模块或文档。
- CLI 只负责入口层、进程编排和交互体验，不在文档中把业务能力归属到 CLI 本地实现。
- 更新文档时优先维护 `AGENTS.md` 的目录结构、边界和流程，再补充 `.claude/rules/rules.md` 的经验规则。
- 面向用户的文案不能暴露内部规则；服务级文档则必须明确边界、流程和硬性约束。

## 开发流程

1. 开发前先阅读本文件，确认 CLI 边界、目录结构和禁止事项。
2. 仅在 `services/cli` 目录内实施修改，不跨 service 读取或写入实现细节。
3. 若新增命令、模块、文档目录或运行约定，完成代码后同步更新 `## 目录结构`。
4. 若沉淀出新的架构规则、规范或常见陷阱，同步更新 `.claude/rules/rules.md`。
5. 提交前确认命令职责、API 调用关系和文档内容与当前代码一致。

## Rules 自维护

- Rules 文件位置：[.claude/rules/rules.md](.claude/rules/rules.md)
- 触发时机：新增目录结构、引入新架构模式、调整代码规范、出现可复用经验时必须追加。
- 追加格式：`- 规则描述（发现日期：YYYY-MM-DD）`
- 维护原则：只增量补充，不覆盖仍然有效的历史规则。

## 开发检查清单

提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/<service>.md

## 禁止

硬性红线（违反会导致架构混乱）：
- 跨 service import（只能调 API，不能 import 包）
- 直接修改其他 service 的代码
- 在 CLI 中实现 LLM 推理逻辑（应调用 llm-py）
- 在 CLI 中直接操作 MySQL 数据库（应通过 server-go API）

## 最后更新时间

2026-04-22 20:03

- 同步 `services/cli` 真实目录结构，补充 `api-client.ts`、`web-ui-server.ts`、REPL 子命令文件、`tests/`、`vendor/` 等条目
- 补齐 规则、开发流程 章节，使服务文档结构与 `doc-fix` 要求一致
- 保留原有边界说明、检查清单与禁止事项，避免文档修复改变服务职责定义
