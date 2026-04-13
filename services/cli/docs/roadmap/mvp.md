# Ddo CLI MVP需求文档 v1.0

## 1. 目标与指标

- 核心问题：为技术个人提供统一、跨平台的 CLI 入口，解决 vibe coding 中工具分散、操作复杂的痛点，实现工作空间的初始化、服务生命周期管理和自然语言交互。
- 目标用户：技术个人开发者，主要在 Windows 和 macOS 平台使用。

**技术决策**：
- 数据目录可配置：支持环境变量 `DDO_DATA_DIR`、CLI 参数 `--data-dir`、默认路径优先级
- MySQL 数据持久化：通过 Docker Volume 挂载 `~/.ddo/data/mysql/`，容器重建不影响数据
- 无鉴权：纯本地项目，无需登录系统

- 成功指标：
  - `ddo init` 一键初始化成功率 > 95%
  - 服务启动时间 < 10 秒
  - 跨平台兼容性（Windows/macOS）功能正常率 100%
  - REPL 自然语言识别准确率 > 80%

## 2. 核心流程（仅主要路径）

> 用户旅程图：安装 CLI → 初始化工作空间 → 启动服务 → 进入 REPL 交互 → 执行任务 → 退出

1. 步骤一：安装与初始化
   - 用户通过 `npm install -g ddo-cli` 安装 CLI
   - 运行 `ddo init`，自动创建 `~/.ddo/` 目录结构
   - MySQL Docker 容器启动，数据卷挂载到 `~/.ddo/data/mysql/`
   - 验证：目录创建成功、Docker 容器运行正常、数据持久化配置正确
   
   **数据持久化机制**：
   ```yaml
   # Docker Compose Volume 配置
   volumes:
     - ~/.ddo/data/mysql:/var/lib/mysql  # 容器数据 -> 本地磁盘
   ```
   - 首次启动：MySQL 初始化数据库，创建表结构
   - 后续启动：检测已有数据，`✓ 发现已有数据，跳过初始化`
   - 删除容器：`docker rm ddo-mysql`，数据仍在 `~/.ddo/data/mysql/`
   - 重装系统：只要 `~/.ddo/data/mysql/` 在，数据可恢复

2. 步骤二：服务启动
   - 运行 `ddo start`，依次启动 server-go、llm-py、web-ui
   - 生成 PID 文件到 `~/.ddo/services/`
   - 自动进入 REPL 交互模式

3. 步骤三：REPL 交互
   - 默认自然语言模式：直接输入任务描述，LLM 解析意图并执行
   - 命令模式：以 `/` 开头的系统命令（如 `/status`, `/exit`）
   - 支持子命令模式切换（如 `/kb`, `/timer`, `/mcp`）

4. 步骤四：服务管理
   - `ddo status` 查看所有服务健康状态
   - `ddo logs [service]` 查看指定服务日志
   - `ddo stop` 停止所有后台服务并清理 PID 文件

## 3. CLI 架构定位

```
┌─────────────────────────────────────────────┐
│                  CLI (主体)                  │
│  ┌──────────────────────────────────────┐  │
│  │  核心能力：                            │  │
│  │  - REPL 交互（主要操作入口）           │  │
│  │  - 服务生命周期管理（启动/停止/监控）  │  │
│  │  - 定时任务调度与触发                  │  │
│  │  - 知识库管理与 RAG 查询               │  │
│  │  - MCP 配置与调用                      │  │
│  └──────────────────────────────────────┘  │
│                      │                      │
│  扩展渲染层（弥补 CLI 不足）：               │
│  ┌────────────┐      │      ┌────────────┐ │
│  │   ddo web  │◄─────┴─────►│  ddo ding  │ │
│  │ (Dashboard)│             │(灵动岛通知)│ │
│  │ 可视化不足 │             │ 通知不足   │ │
│  └────────────┘             └────────────┘ │
└─────────────────────────────────────────────┘
```

**设计原则**：
- CLI 是核心主体，所有核心逻辑都在 CLI/后端服务
- Web 和 Electron 只是渲染层，**不承载业务逻辑**
- 用户可以通过纯 CLI 完成所有操作，Web/Electron 是可选增强

## 3. 功能列表（MoSCoW）

| 模块 | 功能点 | 优先级 | 描述 | 验收标准 |
|------|--------|--------|------|----------|
| 安装部署 | npm 全局安装 | P0 | 支持 `npm install -g ddo-cli` 安装 | 1. 安装后 `ddo` 命令全局可用 2. 显示版本号 `ddo --version` |
| 初始化 | `ddo init` | P0 | 初始化工作空间，创建目录结构，启动 MySQL Docker | 1. 创建数据目录及子目录（可配置路径） 2. 生成 `docker-compose.yml` 和 `config.yaml` 3. MySQL 容器启动成功 4. 数据卷正确挂载到本地目录 |
| 配置管理 | 数据目录配置 | P0 | 支持自定义数据存储位置 | 1. 支持 `DDO_DATA_DIR` 环境变量 2. 支持 `--data-dir` CLI 参数 3. 生成配置文件到指定目录 4. MySQL Volume 指向自定义路径 |
| 服务管理 | `ddo start` | P0 | 启动所有后台服务，进入 REPL | 1. server-go、llm-py、web-ui 依次启动 2. PID 文件正确记录 3. 自动进入 REPL 模式 4. 显示启动成功信息 |
| 服务管理 | `ddo stop` | P0 | 停止所有后台服务 | 1. 读取 PID 文件终止进程 2. 清理 PID 文件 3. 优雅退出 REPL |
| 服务管理 | `ddo status` | P0 | 显示所有服务健康状态 | 1. 显示 CLI、server-go、llm-py、MySQL 状态 2. 显示版本号和运行时间 3. 显示活跃定时任务和 MCP 数量 |
| 服务管理 | `ddo logs` | P1 | 查看服务日志 | 1. 支持查看 cli、server-go、llm-py、web-ui 日志 2. 支持 `-f` 实时跟踪 3. 支持 `-n` 指定行数 |
| 扩展渲染 | `ddo web` | P1 | 启动 Web Dashboard（可选） | 1. 启动 web-ui 服务 2. 自动打开浏览器 3. 提供可视化界面 |
| 扩展渲染 | **`ddo ding`** | **P0** | **启动 Electron 通知客户端** | 1. 启动灵动岛通知 2. 接收定时任务等通知事件 3. 常驻系统托盘 4. 弥补 CLI 无法弹窗的短板 |
| 配置管理 | `ddo config` | P1 | 系统级配置管理 | 1. `config set <key> <value>` 设置配置 2. `config get <key>` 获取配置 3. `config edit` 打开编辑器修改 YAML |
| REPL 交互 | 自然语言模式 | P0 | 默认模式，直接输入自然语言 | 1. 输入内容转发到 `/api/v1/chat/nlp` 2. 识别意图并执行对应操作 3. 返回执行结果和友好回复 |
| REPL 交互 | 命令模式 | P0 | 以 `/` 开头的系统命令 | 1. `/status` 显示服务状态 2. `/web` 打开 Web UI 3. `/exit` 退出 REPL 4. `/kb`, `/timer`, `/mcp` 进入子命令模式 |
| REPL 交互 | 子命令模式 | P1 | 知识库/定时任务/MCP 专用模式 | 1. `/kb` 进入知识库模式，支持 `add`, `list`, `search` 2. `/timer` 进入定时任务模式 3. `/mcp` 进入 MCP 管理模式 |
| 跨平台 | Windows 支持 | P0 | 完整支持 Windows 平台 | 1. 路径使用 `path.join()` 处理 2. 使用 `cross-spawn` 管理进程 3. HOME 目录使用 `os.homedir()` |
| 跨平台 | macOS 支持 | P0 | 完整支持 macOS 平台 | 同上 |

## 4. 本期不做（明确排除）

- Windows Service / launchd 系统服务注册
- 自动更新检查
- 插件扩展机制
- 多语言国际化
- 离线模式（无网络情况下使用）
- 复杂的权限管理（保持单用户模式）
- SSH 远程管理

## 5. 底线要求

- 性能：
  - 冷启动时间 < 3 秒
  - REPL 命令响应时间 < 500ms
  - 服务启动超时设置为 30 秒
- 可用性：
  - 进程崩溃自动检测并提示
  - 支持优雅关闭和强制关闭两种模式
  - 日志文件自动轮转，单文件不超过 10MB
- 埋点事件：
  - `cli_init_start`: 初始化开始
  - `cli_init_success`: 初始化成功
  - `cli_start`: REPL 启动
  - `cli_command_executed`: 命令执行（含命令类型）
  - `cli_exit`: REPL 退出

## 附录

- 目录结构图（可通过 `DDO_DATA_DIR` 或 `--data-dir` 自定义位置）：
  ```
  ~/.ddo/
  ├── config.yaml              # CLI 配置文件
  ├── docker/
  │   └── docker-compose.yml   # MySQL 容器配置
  ├── services/                # PID 文件
  │   ├── server-go.pid
  │   ├── llm-py.pid
  │   └── web-ui.pid
  ├── data/
  │   └── mysql/               # MySQL 数据持久化（!!!重要，定期备份）
  │       ├── ibdata1
  │       ├── mysql/
  │       └── ddo_workspace/
  ├── cache/
  │   └── cache.db             # SQLite 本地缓存
  ├── logs/
  │   ├── cli.log
  │   ├── server-go.log
  │   ├── llm-py.log
  │   └── web-ui.log
  └── backup/                  # 数据库备份目录
  
  # 路径获取优先级
  1. ${DDO_DATA_DIR}              # 环境变量
  2. --data-dir CLI 参数          # 启动参数
  3. ${HOME}/.ddo                 # 默认路径（Linux/Mac）
  4. ${USERPROFILE}/.ddo         # 默认路径（Windows）
  ```
  
- MySQL 数据持久化验证：
  ```bash
  # 查看 MySQL 数据是否挂载成功
  $ ddo status
  MySQL: running (container: ddo-mysql)
  Data volume: ~/.ddo/data/mysql/
  
  # Docker 内部查看
  $ docker exec ddo-mysql ls -la /var/lib/mysql
  # 应与本地 ~/.ddo/data/mysql/ 内容一致
  ```
- 相关文档：
  - [MVP 总览](../../../docs/roadmap/mvp.md)
  - [server-go MVP]( ../../server-go/docs/roadmap/mvp.md)
  - [llm-py MVP](../../llm-py/docs/roadmap/mvp.md)
  - [web-ui MVP](../../web-ui/docs/roadmap/mvp.md)
