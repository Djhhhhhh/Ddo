# Ddo 个人开发者工作台 - MVP 规划文档

**版本**: MVP v1.0  
**更新日期**: 2026/04/13

---

## 技术决策摘要

| 决策项 | 结论 | 说明 |
|--------|------|------|
| **项目定位** | **开源本地 AI 工作台** | 可自由部署到本地或私有服务器，单用户模式，数据完全本地存储 |
| 数据库 | **MySQL 8.0 + Docker** | 数据持久化到 `~/.ddo/data/mysql/`，通过 Docker Volume 挂载。删除/重建容器不影响数据 |
| **RAG 知识库** | **llm-py 负责 RAG** | llm-py 新增 RAG Engine：文本向量化 + 向量存储（Chroma/FAISS）+ 语义检索 |
| **向量存储** | **Chroma/FAISS** | 本地嵌入式向量数据库，存储路径 `~/.ddo/data/vector/` |
| **客户端** | **CLI 为核心，Web/Electron 为扩展** | CLI 是主体，Web 弥补可视化不足，Electron 弥补通知不足 |
| 数据目录 | **用户可配置** | 优先级：`DDO_DATA_DIR` 环境变量 > `--data-dir` CLI 参数 > 默认值 |
| 鉴权 | **无登录鉴权** | 开源本地部署，服务绑定 `127.0.0.1` 仅限本机访问，无需用户系统 |
| 启动方式 | **CLI 统一管理** | `ddo init` 初始化环境，`ddo start` 按顺序启动 MySQL → server-go → llm-py → web-ui |
| 开发顺序 | **CLI → llm-py(RAG) → server-go → web-ui/Electron** | RAG 是核心能力优先实现，Electron 客户端独立开发 |

---

## 一、项目目标

**定位**：面向开发者的开源本地 AI 工作台，帮助用户构建个人 AI 工作空间。

**开源特性**：
- 完全开源，可自由部署到本地或私有服务器
- 单用户模式，数据完全本地存储，隐私可控
- 模块化架构，支持扩展开发

**核心场景**：解决 vibe coding 中的三大痛点：

1. **知识库（RAG）** - AI 检索增强的知识管理系统，支持问答和记录
2. **工具集成** - 通过 MCP 统一接入各类第三方服务和工具
3. **项目管理** - 管理日常开发任务，快速接入日志、监控、通知功能

**产品形态**（CLI 为核心的中心化架构）：
- **CLI（核心主体）**: 命令行控制核心，统一 orchestrate 服务生命周期和 REPL 交互
- **Web（浏览器扩展）**: 可选可视化界面，Dashboard 和配置表单，弥补 CLI 的可视化不足
- **Electron（通知扩展）**: 系统通知补充，灵动岛消息提示，弥补 CLI 无法弹窗通知的短板
- **服务架构**: CLI 统一管理服务，Web/Electron 是围绕 CLI 的扩展渲染层

**部署方式**：
```bash
# 开发者本地部署
git clone https://github.com/xxx/ddo.git
cd ddo
npm install -g ddo-cli  # 或通过源码安装
ddo init  # 初始化（启动 MySQL Docker）
ddo start  # 启动所有服务（CLI 进入 REPL）

# 可选：浏览器访问 Dashboard
ddo web  # 或手动打开 http://localhost:3000

# 可选：Electron 通知客户端（配合 CLI 使用）
ddo ding  # 启动灵动岛通知，接收定时任务等提醒
```

**架构关系**：
```
┌─────────────────────────────────────────────────────────────┐
│                       CLI (核心主体)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  REPL 交互模式                                         │  │
│  │  > 帮我创建喝水提醒                                   │  │
│  │  > 记录今天学习了 Go                                  │  │
│  │  > /status  查看服务状态                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│  ┌─────────────────────┼─────────────────────┐             │
│  │                     │                     │             │
│  ▼                     ▼                     ▼             │
│ MySQL    →    server-go  →   llm-py(RAG)                    │
│ (Docker)      (API网关)      (AI代理)                      │
└─────────────────────────────────────────────────────────────┘
          │                     │
          │    扩展渲染层        │
          ▼                     ▼
   ┌────────────┐       ┌────────────┐
   │ Web Browser│       │  Electron  │
   │ (Dashboard │       │  (灵动岛/  │
   │  配置面板) │       │  系统通知) │
   └────────────┘       └────────────┘
   
   弥补 CLI 的不足：    弥补 CLI 的不足：
   - 可视化统计        - 无法弹出通知
   - 表单配置          - 系统级提醒
```

---

## 二、技术架构

### 2.1 架构拓扑

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Layer                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │       CLI       │  │    Web (Browser) │  │ Electron (Ding)  │   │
│  │    (Node.js)    │  │   (Vue 3 + Vite) │  │  (系统通知/桌面) │   │
│  │                 │  │                  │  │  ┌────────────┐  │   │
│  │ 启动前命令:      │  │ ┌──────────────┐ │  │ │ 灵动岛提示 │  │   │
│  │ ddo init        │  │ │ Dashboard    │ │  │ │ 系统通知   │  │   │
│  │ ddo start       │◄─┼┤ Config       │ │  │ │ 快捷键     │  │   │
│  │ ddo status      │  │ │ Timer/MCP    │ │  │ └────────────┘  │   │
│  │ ddo stop        │  │ └──────────────┘ │  └──────────────────┘   │
│  └─────────────────┘  └──────────────────┘                         │
│                                                                     │
│  REPL交互模式 (ddo start 后):                                       │
│  > 帮我总结一下昨天的笔记      → 调用 RAG 知识库问答                │
│  > 记录一下今天学习了 Go       → 写入知识库，自动生成向量           │
│  > /kb search "设计模式"       → 向量相似度搜索                     │
│  > /kb ask "Go interface 是什么" → RAG 问答                         │
│  > /exit                       → 退出并停止服务                      │
│                                                                     │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ HTTP REST / WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Gateway Layer (Go)                         │
│                          server-go                                  │
│  ┌───────────┬───────────┬───────────────┬────────────────────────┐│
│  │ API Router│ Scheduler │  MCP Manager  │    Health/Metrics      ││
│  │           │ (robfig/) │               │    /api/v1/health      ││
│  └─────┬─────┴─────┬─────┴───────┬───────┴────────────────┬───────┘│
│        │           │             │                        │         │
│        │    ┌──────┴──────┐      │                 ┌──────┴──────┐  │
│        │    │  Task Queue │      │                 │    MySQL    │  │
│        │    │  (BadgerDB) │      │                 │  (Docker)   │  │
│        │    └─────────────┘      │                 └──────┬──────┘  │
│        │                         │                        │         │
│        │       RAG Query         │         ┌──────────────┴─────┐   │
│        └─────────────────────────┼────────►│  Knowledge Base    │   │
│                                  │         │  Timer/Logs        │   │
│                                  │         │  MCP Config        │   │
│                                  │         └────────────────────┘   │
│                      HTTP REST          │  Volume: ~/.ddo/data/      │
└─────────────────────────────────────────┼────────────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │        llm-py         │
                              │     (Python/FastAPI)  │
                              │                       │
                              │  ┌─────────────────┐  │
                              │  │ OpenRouter 代理  │  │
                              │  │ Chat/NLP/Stream │  │
                              │  └─────────────────┘  │
                              │  ┌─────────────────┐  │
                              │  │   RAG Engine    │  │◄── 新增：知识库 RAG
                              │  │  - Embeddings   │  │     - 文本向量化
                              │  │  - Vector Store │  │     - 向量存储 Chroma
                              │  │  - Similarity   │  │     - 语义检索
                              │  │  - Context Gen  │  │     - 上下文生成
                              │  └─────────────────┘  │
                              └───────────────────────┘
```

### 2.2 数据目录配置

用户数据目录优先级（从高到低）：

```
1. DDO_DATA_DIR 环境变量              # 最高优先级
2. --data-dir CLI 参数              # 启动时指定
3. ~/.ddo/ 或 C:\Users\<user>\.ddo\   # 默认位置（Windows/macOS/Linux）
```

**目录结构示例**：
```
$DDO_DATA_DIR 或 ~/.ddo/
├── config.yaml                  # 主配置文件
├── docker/
│   └── docker-compose.yml       # MySQL 容器配置
├── data/
│   └── mysql/                   # MySQL 数据持久化目录（Volume 挂载）
├── cache/
│   └── cache.db                 # SQLite 本地缓存（轻量 KV）
├── logs/                        # 各服务日志
│   ├── cli.log
│   ├── server-go.log
│   ├── llm-py.log
│   └── web-ui.log
├── services/                    # PID 文件
│   ├── server-go.pid
│   ├── llm-py.pid
│   └── web-ui.pid
└── backup/                      # 数据库备份目录
```

### 2.3 服务启动顺序

```
1. MySQL (Docker)
   - 数据卷挂载到 ~/.ddo/data/mysql/
   - 首次启动自动初始化
   - 删除/重建容器，数据不丢失
   
2. server-go (核心网关)
   - 连接 MySQL (GORM)
   - 初始化 BadgerDB 嵌入式队列
   - 启动定时任务调度器
   - API 服务绑定 127.0.0.1:8080
   
3. llm-py (AI 代理服务)
   - 绑定 127.0.0.1:8000
   - 仅接收来自 server-go 的请求
   
4. web-ui (可视化界面)
   - 绑定 127.0.0.1:3000
   - 可选启动（配置项控制）
   
5. CLI (用户交互入口)
   - REPL 交互模式
   - 负责服务生命周期管理
```

### 2.4 通信协议

| 通信方向 | 协议 | 说明 |
|----------|------|------|
| CLI → server-go | HTTP REST | CLI 统一调用后端 API，无鉴权 |
| Web UI → server-go | HTTP REST | REST API，仅本地访问，无登录系统 |
| server-go → llm-py | HTTP REST | 内部 LLM 代理转发，绑定 127.0.0.1 |
| server-go → MySQL | TCP | 数据库连接，通过 Unix Socket 或 TCP |
| 消息队列 | 嵌入式 (BadgerDB) | server-go 内部队列，无网络依赖 |

### 2.5 安全设计

由于是纯本地个人项目，安全设计简化：

```yaml
绑定地址: "127.0.0.1"  # 仅本机访问，不监听 0.0.0.0
鉴权: 无              # 无需登录
HTTPS: 无             # 本地 HTTP 即可
CORS: 允许 localhost   # 开发便利
```

如需远程访问（进阶场景），建议通过 SSH 隧道或配置反向代理添加鉴权。

---

## 三、MVP 各服务详细能力

### 3.1 cli（Node.js）

CLI 采用**双模式设计**：系统管理命令 + REPL 交互模式，类似 Claude Code。

#### 模式一：系统管理命令（服务启动前）

用于管理工作空间和服务生命周期：

| 命令 | 功能 | 示例 | 跨平台 |
|------|------|------|--------|
| `ddo init` | 初始化工作空间，创建配置，启动 MySQL Docker | `ddo init` | ✅ Win/Mac |
| `ddo start` | 启动后台服务（server-go + llm-py + web-ui） | `ddo start` | ✅ Win/Mac |
| `ddo stop` | 停止所有后台服务 | `ddo stop` | ✅ Win/Mac |
| `ddo status` | 显示各服务健康状态（简化版） | `ddo status` | ✅ Win/Mac |
| `ddo config [set/get/edit]` | 系统级配置管理 | `ddo config set llm.model claude-3.5` | ✅ Win/Mac |
| `ddo logs [service]` | 查看服务日志 | `ddo logs server-go` | ✅ Win/Mac |

#### 模式二：REPL 交互模式（服务启动后）

执行 `ddo start` 后进入自然语言交互模式，直接输入即可对话：

```bash
$ ddo start
Starting ddo services...
✓ MySQL is running
✓ server-go started (pid: 1234)
✓ llm-py started (pid: 1235)
✓ web-ui started at http://localhost:3000

# 默认自然语言模式 - 直接输入，像聊天一样
ddo> Hello, 帮我检查下今天的任务
你好！今天有3个定时任务运行成功，1个知识库条目新增...

ddo> 帮我新增一个5min后的闹钟，提示我睡觉
✓ 已创建定时任务 "睡觉提醒" (uuid-xxx)
  执行时间: 5分钟后 (10:35)
  提示内容: "该睡觉了！"

ddo> 记录一下：今天学习了 Go 的 interface 设计模式
✓ 已添加到知识库
  分类: general
  标签: ["go", "interface", "设计模式"]

ddo> 测试一下 brave-search 这个 MCP
tools: brave_web_search, brave_local_search
✓ MCP 连接正常，发现 2 个工具

ddo> /status                    # 查看服务状态 (以 / 开头的命令)
Services:
  ✅ server-go  running (pid: 1234)
  ✅ llm-py     running (pid: 1235)

ddo> /web                       # 打开 Web UI
ddo> /kb                        # 进入知识库子命令模式 (可选)
ddo> /timer                     # 进入定时任务子命令模式 (可选)
ddo> /mcp                       # 进入 MCP 管理子命令模式 (可选)
ddo> /exit                      # 退出 REPL，停止服务
```

**两种输入方式**：

| 输入方式 | 示例 | 说明 |
|---------|------|------|
| **自然语言** (默认) | `帮我新增一个喝水提醒，每5分钟一次` | LLM 理解意图，自动执行 |
| **命令式** (以 `/` 开头) | `/status`, `/web`, `/exit` | 系统命令、子命令模式 |

**自然语言支持的操作**：

| 自然语言示例 | 实际执行 |
|-------------|----------|
| "帮我新增一个5min后的闹钟，提示我睡觉" | `POST /api/v1/timers` {name: "睡觉提醒", cron: "5 * * * *"} |
| "记录一下：今天学习了 Go" | `POST /api/v1/knowledge` {content: "今天学习了 Go"} |
| "测试一下 brave-search" | `POST /api/v1/mcps/:uuid/test` |
| "今天有哪些定时任务运行了？" | `GET /api/v1/timers/logs` + 日期过滤 |
| "搜索所有关于 vibe coding 的笔记" | `GET /api/v1/knowledge?search=vibe+coding` |

**文件结构**：
```
~/.ddo/                          # Windows: %USERPROFILE%\.ddo
├── config.yaml                  # CLI 配置
├── services/                    # 服务进程管理
│   ├── server-go.pid            # 进程 ID 文件
│   ├── llm-py.pid
│   └── web-ui.pid
├── data/
│   └── mysql/                   # MySQL 数据持久化目录
├── cache/
│   └── cache.db                 # SQLite 本地缓存
├── logs/
│   ├── cli.log                  # CLI 日志
│   ├── server-go.log
│   ├── llm-py.log
│   └── web-ui.log
└── backup/                      # 数据库备份目录
```

#### 跨平台支持（Windows & macOS）

| 平台 | 安装方式 | 服务管理 | 路径处理 |
|------|----------|----------|----------|
| **Windows** | `npm install -g ddo-cli` | Node.js child_process 管理后台进程 | 使用 `path.join()` 处理 `C:\Users\...` |
| **macOS** | `npm install -g ddo-cli` | Node.js child_process + 可选 launchd | 使用 `path.join()` 处理 `/Users/...` |
| **两者** | Docker Desktop 运行 MySQL | 数据卷挂载到用户目录 | `os.homedir()` 获取主目录 |

**跨平台实现要点**：
1. **路径处理**：使用 Node.js `path` 和 `os.homedir()`，不硬编码路径分隔符
2. **进程管理**：使用 `cross-spawn` 库管理子进程，兼容 Win/Mac
3. **服务守护**：MVP 阶段使用 Node.js 进程管理，后续可选系统服务（Windows Service / launchd）
4. **Docker**：MySQL 通过 Docker Desktop 运行，两者都支持

### 3.2 server-go（Go）

**核心模块**：

| 模块 | 功能 | 技术方案 |
|------|------|----------|
| API 网关 | 统一路由、验证、错误处理 | Gin 框架 |
| 健康监控 | 服务状态、指标采集 | `/api/v1/metrics` API |
| 定时任务调度 | Cron 表达式解析、任务调度 | robfig/cron + BadgerDB 队列 |
| MCP 管理 | MCP 配置、连接池、工具调用 | 支持 stdio/sse/http |
| 知识库服务 | CRUD、全文搜索 | MySQL FULLTEXT |
| LLM 代理 | 转发到 llm-py，支持流式 | HTTP 转发 |
| 消息队列 | 延时任务、优先级队列 | BadgerDB 嵌入式 |

**目录结构**：
```
server-go/
├── cmd/server/
│   └── main.go
├── internal/
│   ├── api/              # HTTP 路由
│   ├── service/          # 业务逻辑
│   │   ├── timer_service.go
│   │   ├── mcp_service.go
│   │   ├── kb_service.go
│   │   ├── llm_proxy.go
│   │   └── metrics_service.go
│   ├── scheduler/        # 定时调度器
│   ├── queue/            # BadgerDB 队列
│   ├── mcp/              # MCP 客户端
│   └── db/               # MySQL 连接
└── docker-compose.yml    # MySQL 启动配置
```

### 3.3 llm-py（Python）

**核心功能**：

| 接口 | 功能 | 说明 |
|------|------|------|
| `POST /api/chat` | 与 LLM 对话 | 支持流式 (SSE) 和非流式 |
| `GET /api/models` | 获取可用模型列表 | 带缓存 |
| `GET /health` | 健康检查 | |

**特性**：
- OpenRouter 代理转发
- 自动重试、超时控制
- 模型配置缓存

### 3.4 web-ui（Node.js + Vue 3）

**页面路由**：

| 路由 | 功能 | MVP 范围 |
|------|------|----------|
| `/dashboard` | **健康监控面板** | ✅ MVP 必须 |
| `/mcp` | MCP 配置表单 | ✅ MVP |
| `/config` | 系统配置 | ✅ MVP |
| `/` | 首页/欢迎 | ✅ MVP |

**监控面板 (`/dashboard`) 组件**：
- 服务状态卡片（CLI/server-go/llm-py/MySQL）
- 定时任务执行统计
- 知识库统计（条目数、存储）
- MCP 连接状态列表
- LLM API 调用趋势图

---

## 四、数据库设计

### 4.1 MySQL 配置

```yaml
# ~/.ddo/docker/docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    container_name: ddo-mysql
    restart: unless-stopped
    volumes:
      - ~/.ddo/data/mysql:/var/lib/mysql      # 数据持久化
      - ./init:/docker-entrypoint-initdb.d/   # 初始化脚本
      - ~/.ddo/backup:/backup                 # 备份目录
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ddo_workspace
    ports:
      - "3306:3306"
```

### 4.2 表结构

```sql
-- 知识库
CREATE TABLE knowledge (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    tags JSON,
    source VARCHAR(100), -- manual、cli、feishu(预留)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FULLTEXT INDEX idx_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 定时任务
CREATE TABLE timers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    cron VARCHAR(100) NOT NULL,
    callback_type ENUM('http', 'webhook') NOT NULL,
    callback_config JSON NOT NULL,
    status ENUM('running', 'paused') DEFAULT 'running',
    next_run_at TIMESTAMP NULL,
    run_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_next_run (next_run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 定时任务执行日志
CREATE TABLE timer_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    timer_id VARCHAR(36) NOT NULL,
    status ENUM('success', 'failed') NOT NULL,
    output TEXT,
    error TEXT,
    duration_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timer_id (timer_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MCP 配置
CREATE TABLE mcps (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    type ENUM('stdio', 'http', 'sse') NOT NULL,
    config JSON NOT NULL,
    status ENUM('active', 'inactive', 'error') DEFAULT 'inactive',
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Skill 配置（MVP 预留表，仅注册不执行）
CREATE TABLE skills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    type ENUM('built_in', 'custom') NOT NULL,
    handler VARCHAR(200) NOT NULL,
    config JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统配置
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户偏好（单用户模式）
CREATE TABLE user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    llm_model VARCHAR(50) DEFAULT 'anthropic/claude-3.5-sonnet',
    llm_config JSON,
    theme VARCHAR(20) DEFAULT 'dark'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 外部服务（MVP 预留，飞书等）
CREATE TABLE external_services (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    config JSON NOT NULL,
    status ENUM('connected', 'disconnected') DEFAULT 'disconnected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 五、API 规范

### 5.1 健康监控 API

```yaml
# 健康检查
GET /api/v1/health
Response: { 
  "status": "ok", 
  "services": { 
    "cli": { "status": "ok", "version": "0.1.0" },
    "server_go": { "status": "ok", "version": "0.1.0", "uptime": 3600 },
    "llm_py": { "status": "ok", "version": "0.1.0", "latency_ms": 45 },
    "mysql": { "status": "ok", "version": "8.0.32" }
  }
}

# 监控指标（Dashboard 用）
GET /api/v1/metrics
Response: {
  "services": { /* 同上 */ },
  "timers": {
    "total": 5,
    "running": 3,
    "today_executions": 12,
    "today_success": 10,
    "today_failed": 2
  },
  "knowledge": {
    "total": 45,
    "this_month": 8,
    "storage_mb": 2.3
  },
  "mcps": [
    { "name": "brave-search", "type": "stdio", "status": "active", "last_check": "2s" }
  ],
  "llm": {
    "total_calls_7d": 1234,
    "success_rate": 0.992,
    "avg_latency_ms": 1200
  }
}
```

### 5.2 统一响应规范

**所有 API 仅支持 GET / POST 方法**

**标准响应格式**：
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**分页查询响应格式**：
```json
{
  "code": 200,
  "message": "ok",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**错误响应格式**：
```json
{
  "code": 400,
  "message": "invalid cron expression",
  "data": null
}
```

### 5.3 核心资源 API

```yaml
# ===================== 知识库 API =====================

POST /api/v1/knowledge                          # 创建知识
Body: { "content": "...", "category": "idea", "tags": ["vibe-coding"] }
Response: {
  "code": 200,
  "message": "success",
  "data": { "uuid": "xxx", "created_at": "..." }
}

# 知识库分页查询 (支持搜索)
GET /api/v1/knowledge?search=vibe+coding&page=1&pageSize=20
Response: {
  "code": 200,
  "message": "ok",
  "data": {
    "items": [
      { "uuid": "...", "content": "...", "category": "...", "created_at": "..." }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}

GET /api/v1/knowledge/:uuid                     # 获取单条
Response: {
  "code": 200,
  "message": "success",
  "data": { "uuid": "...", "content": "...", ... }
}

POST /api/v1/knowledge/:uuid/delete           # 删除知识 (POST 代替 DELETE)
Response: { "code": 200, "message": "success", "data": null }

# ===================== 定时任务 API =====================

POST /api/v1/timers                             # 创建定时任务
Body: {
  "name": "喝水提醒",
  "cron": "*/5 * * * *",
  "callback_type": "http",
  "callback_config": {
    "method": "POST",
    "url": "http://web-ui:3000/api/notify",
    "body": { "type": "health", "message": "该喝水了！" }
  }
}
Response: { "code": 200, "message": "success", "data": { "uuid": "...", "next_run_at": "..." } }

GET /api/v1/timers?page=1&pageSize=20          # 分页查询
Response: {
  "code": 200,
  "message": "ok",
  "data": {
    "items": [{ "uuid": "...", "name": "...", "status": "running", ... }],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}

GET /api/v1/timers/:uuid                        # 获取详情
Response: { "code": 200, "message": "success", "data": { ... } }

POST /api/v1/timers/:uuid/pause                # 暂停 (POST 代替 PUT)
POST /api/v1/timers/:uuid/resume               # 恢复
POST /api/v1/timers/:uuid/delete               # 删除

# 定时任务日志 (分页)
GET /api/v1/timers/:uuid/logs?page=1&pageSize=20
Response: {
  "code": 200,
  "message": "ok",
  "data": {
    "items": [{ "status": "success", "output": "...", "created_at": "..." }],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}

# ===================== MCP 管理 API =====================

POST /api/v1/mcps                              # 创建/更新 MCP
Body: { "name": "brave-search", "type": "stdio", "config": {...} }
Response: { "code": 200, "message": "success", "data": { "uuid": "..." } }

GET /api/v1/mcps                               # 列表查询
Response: {
  "code": 200,
  "message": "success",
  "data": { "items": [...], "total": 3 }  // 非分页，直接返回
}

GET /api/v1/mcps/:uuid
Response: { "code": 200, "message": "success", "data": { ... } }

POST /api/v1/mcps/:uuid/delete                 # 删除

POST /api/v1/mcps/:uuid/test                   # 测试 MCP
Response: {
  "code": 200,
  "message": "success",
  "data": { "success": true, "result": {...}, "duration_ms": 120 }
}

# ===================== LLM API =====================

POST /api/v1/chat                              # LLM 对话
Body: {
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "anthropic/claude-3.5-sonnet",
  "stream": true,
  "mcp_tools": ["brave-search"]
}
Response: (流式 SSE / 非流式 JSON)
{ "code": 200, "message": "success", "data": { "content": "Hello! ...", "tokens_used": 150 } }

POST /api/v1/chat/nlp                          # 自然语言理解 (REPL 用)
Body: { "text": "帮我新增一个喝水提醒，每5分钟一次" }
Response: {
  "code": 200,
  "message": "success",
  "data": {
    "intent": "timer.create",
    "parameters": { "name": "喝水提醒", "cron": "*/5 * * * *" },
    "reply": "已为您创建喝水提醒，每5分钟执行一次"
  }
}

# ===================== 系统配置 API =====================

GET /api/v1/settings                           # 获取所有配置
Response: { "code": 200, "message": "success", "data": { "items": [...] } }

POST /api/v1/settings                          # 设置配置
Body: { "key": "llm.model", "value": "claude-3.5" }
Response: { "code": 200, "message": "success", "data": null }

GET /api/v1/preferences                        # 获取用户偏好
Response: { "code": 200, "message": "success", "data": { "llm_model": "...", "theme": "dark" } }

POST /api/v1/preferences                       # 更新偏好
Body: { "llm_model": "gpt-4", "theme": "light" }
Response: { "code": 200, "message": "success", "data": null }

# ===================== Web UI 通知 API =====================

POST /api/notify                               # 灵动岛通知 (Web UI 接收)
Body: { "type": "ding", "title": "喝水提醒", "message": "该喝水了！", "duration": 5000 }
Response: { "code": 200, "message": "success", "data": null }
```

---

## 六、消息队列设计（嵌入式）

### 6.1 技术选型

- **存储引擎**：BadgerDB（纯 Go LSM 存储）
- **特性**：嵌入式、无外部依赖、支持 KV 存储
- **用途**：延时任务队列、优先级队列

### 6.2 队列接口

```go
package queue

type Message struct {
    ID        string
    Topic     string
    Payload   []byte
    Priority  int           // 优先级 (0-9)
    DelayUntil *time.Time   // 延时执行时间
}

type Queue interface {
    // 立即发布
    Publish(msg Message) error
    
    // 延时发布
    Schedule(msg Message, at time.Time) error
    
    // 订阅消费
    Subscribe(topic string, handler Handler) error
    
    // 获取待执行任务 (调度器调用)
    FetchDelayed(before time.Time) ([]Message, error)
}
```

### 6.3 使用场景

| 场景 | 处理方式 |
|------|----------|
| 定时任务触发 | 写入延时队列，调度器轮询执行 |
| MCP 异步调用 | 高优先级立即执行，低优先级入队 |
| 批量通知 | 聚合后批量处理 |

---

## 七、健康监控面板设计

### 7.1 Dashboard 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  Ddo Dashboard                                       [主题] │
├─────────────────────────────────────────────────────────────┤
│  服务健康状态                                                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│  │  CLI   │ │server- │ │ llm-py │ │ MySQL  │                │
│  │  🟢    │ │  go    │ │  🟢    │ │  🟢    │                │
│  │ v0.1.0 │ │ v0.1.0 │ │ v0.1.0 │ │ 8.0.32 │                │
│  └────────┘ └────────┘ └────────┘ └────────┘                │
├────────────────────────────────┬────────────────────────────┤
│  定时任务统计                   │ 知识库统计                  │
│  ┌────────────────────────┐    │ ┌──────────────────────┐   │
│  │ 今日执行: 12            │    │ 总条目: 45            │   │
│  │ 成功: 10  失败: 2       │    │ 本月新增: 8           │   │
│  │ [7天趋势图]            │    │ 存储: 2.3MB           │   │
│  └────────────────────────┘    │ └──────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  MCP 连接状态                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 名称           │ 类型   │ 状态    │ 最后检查          │ │
│  │ brave-search   │ stdio  │ 🟢 在线 │ 2s ago           │ │
│  │ filesystem     │ stdio  │ 🔴 离线 │ connection refused│ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  LLM API 调用趋势                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [近7天调用量趋势图]                                   │  │
│  │  总调用: 1,234  成功率: 99.2%  平均延迟: 1200ms        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 CLI 状态显示

```bash
$ ddo status
Services:
  ✅ CLI       v0.1.0
  ✅ server-go v0.1.0  uptime: 2h 34m
  ✅ llm-py    v0.1.0  latency: 45ms
  ✅ MySQL     8.0.32   connections: 5

Active Timers: 3 running, 2 paused
MCPs: 2 connected, 1 offline
Knowledge Base: 45 entries
```

---

## 八、MVP 实现阶段

### Phase 1: 基础架构（Week 1-2）

**开发顺序建议**：`CLI（MySQL管理）→ server-go → llm-py → web-ui`

| 任务 | 负责服务 | 说明 | 依赖关系 |
|------|----------|------|----------|
| MySQL Docker 配置 | cli | `ddo init` 一键启动，数据卷持久化到 `~/.ddo/data/mysql/` | 需第一个完成，是其他服务的基础 |
| server-go 框架 | server-go | Gin 路由、GORM+MySQL连接、健康检查 | 依赖 MySQL 已启动 |
| BadgerDB 队列 | server-go | 嵌入式队列实现 | 在 server-go 中 |
| llm-py 框架 | llm-py | FastAPI、OpenRouter 代理 | 可并行开发，独立服务 |
| CLI 框架 | cli | Commander、配置文件管理、进程管理 | 需配合 server-go/llm-py 的启动需求 |
| Web UI 框架 | web-ui | Vue 3、基础布局 | 可并行开发，依赖 API 设计 |

**并行开发策略**：
- A 组：CLI `ddo init/start/stop` + MySQL Docker 管理（阻塞项，需先完成）
- B 组：server-go 框架 + 数据库连接（需等 CLI 可启动 MySQL）
- C 组：llm-py FastAPI 代理（完全独立，可用 mock 测试）
- D 组：web-ui 基础布局（需等 server-go API 设计完成）

### Phase 2: 核心功能（Week 3-4）

| 任务 | 负责服务 | 说明 |
|------|----------|------|
| 定时任务调度 | server-go | Cron 调度 + BadgerDB 队列 |
| 知识库 CRUD | server-go/cli | 全文搜索、标签管理 |
| MCP 管理 | server-go/cli | 配置、连接池、测试 |
| Chat 功能 | cli/llm-py | 流式对话、MCP 工具调用 |
| 监控面板 | web-ui | Dashboard 页面、图表 |

### Phase 3: 整合优化（Week 5-6）

| 任务 | 说明 |
|------|------|
| 端到端测试 | 完整流程测试 |
| 数据备份/恢复 | `ddo backup` / `ddo restore` |
| 文档完善 | API 文档、使用指南 |
| Bug 修复 | 稳定性优化 |

---

## 九、验证清单

### MVP 验收标准

- [ ] `ddo init` 一键启动 MySQL Docker，数据持久化
- [ ] `ddo status` 显示所有服务健康状态
- [ ] Web Dashboard 显示服务健康、定时任务、知识库统计
- [ ] `ddo chat "Hello"` 能收到 LLM 回复
- [ ] `ddo timer create` 创建定时任务，定时触发执行
- [ ] `ddo mcp create` 配置 MCP，`ddo mcp test` 测试连接
- [ ] `ddo kb add/list/search` 知识库管理功能正常
- [ ] 服务重启后数据不丢失
- [ ] 监控面板实时更新

---

## 十、技术选型汇总

| 组件 | 选型 | 版本/备注 |
|------|------|-----------|
| **CLI** | Node.js | + Commander.js + Inquirer + cross-spawn，支持 Win/Mac 双平台 |
| CLI 模式 | 双模式 | 系统命令（ddo init/start/stop）+ REPL 交互（/chat, /kb...） |
| 后端 | Go | + Gin + GORM |
| LLM 服务 | Python | + FastAPI + HTTPX |
| Web UI | Node.js | + Vue 3 + Axios |
| 数据库 | MySQL | 8.0 (Docker Desktop，Win/Mac 都支持) |
| 消息队列 | BadgerDB | 嵌入式 Go 存储 |
| 定时调度 | robfig/cron | Go 标准库 |
| 向量搜索 | 预留 ES 接口 | MVP 用 MySQL FULLTEXT |
| 进程管理 | Node.js | child_process + pid 文件，MVP 阶段不依赖系统服务 |

---
