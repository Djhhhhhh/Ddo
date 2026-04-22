# Ddo

[![Go](https://img.shields.io/badge/Go-0A0A0A?style=flat-square&logo=go&logoColor=FFD700)](https://go.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-0A0A0A?style=flat-square&logo=node.js&logoColor=FFD700)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/Vue-0A0A0A?style=flat-square&logo=vue.js&logoColor=FFD700)](https://vuejs.org/)
[![Python](https://img.shields.io/badge/Python-0A0A0A?style=flat-square&logo=python&logoColor=FFD700)](https://www.python.org/)
[![npm](https://img.shields.io/badge/npm-0A0A0A?style=flat-square&logo=npm&logoColor=FFD700)](https://www.npmjs.com/)

> 一个面向个人智能工作流的多服务工作空间，整合 `CLI`、`HTTP API`、`LLM 推理` 与 `Web UI`。

Ddo 将多个独立服务组织成一个统一的本地智能工作台：你可以通过 `ddo` 命令完成初始化、启动、停止、状态查看，并把 LLM、知识库、调度能力和可视化界面串联起来。

## ✨ 项目亮点

- **一个命令统一入口**：通过 `ddo` 管理初始化、启动、停止、状态查看与交互流程
- **多服务架构清晰解耦**：CLI、API、LLM、Web UI 分层明确，便于独立开发与打包
- **支持本地知识库能力**：内置 RAG 知识库服务与 NLP 意图识别能力
- **兼顾开发与分发**：支持将各服务产物打包进入 CLI，并通过 npm 分发
- **面向个人工作空间场景**：覆盖配置管理、任务调度、对话能力、桌面端交互等需求

## 🧭 目录

- [核心能力](#-核心能力)
- [适用场景](#-适用场景)
- [发版记录](#-发版记录)
- [服务组成](#-服务组成)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [配置说明](#-配置说明)
- [项目结构](#-项目结构)
- [开发与打包](#-开发与打包)
- [常见问题](#-常见问题)
- [贡献](#-贡献)
- [许可证](#-许可证)

## 🚀 核心能力

- **服务生命周期管理**
  使用 `ddo` 命令统一管理多个服务的初始化、启动、停止与状态查询。

- **本地智能能力集成**
  `llm-py` 提供 LLM 推理、RAG 知识库和 NLP 意图识别能力。

- **API 与基础设施承载**
  `server-go` 提供 HTTP API 路由、配置管理、日志与调度等基础设施能力。

- **图形化工作台体验**
  `web-ui` 提供可视化配置与管理界面，并支持 Electron 桌面端集成。

- **统一配置与数据目录**
  所有服务围绕 `~/.ddo` 工作目录组织，便于维护、迁移和自定义数据目录。

## 🎯 适用场景

- **个人智能工作空间**
- **知识库管理与检索**
- **定时任务调度**
- **LLM 对话与意图识别集成**
- **本地服务编排与桌面工作台**

## 📦 发版记录

| 版本 | 发布日期 | 标题 | 说明 |
|------|----------|------|------|
| 0.1.0 | 2026-04-22 | MVP 版本 | 首次发布，支持 CLI 命令行工具、多服务架构、本地知识库、LLM 推理、Web UI 及 Electron 桌面端集成 |

## 🧩 服务组成

| 服务 | 职责 | 文档 |
|------|------|------|
| `cli` | 负责服务初始化、启动/停止/状态管理、REPL 交互、定时任务调度、知识库管理 | [services/cli/AGENTS.md](services/cli/AGENTS.md) |
| `llm-py` | 负责 LLM 推理、RAG 知识库服务、NLP 意图识别 | [services/llm-py/AGENTS.md](services/llm-py/AGENTS.md) |
| `server-go` | 负责 HTTP API 路由、配置管理、日志等基础设施能力 | [services/server-go/AGENTS.md](services/server-go/AGENTS.md) |
| `web-ui` | 只负责前端界面展示和用户交互 | [services/web-ui/AGENTS.md](services/web-ui/AGENTS.md) |

更多信息可查看：[SERVICES_INDEX.md](./SERVICES_INDEX.md)

## 🛠 技术栈

| 模块 | 技术 |
|------|------|
| CLI | Node.js |
| 服务端 API | Go |
| LLM 服务 | Python 3.8+ / FastAPI |
| Web UI | Vue.js / Vite / Electron |

## ⚡ 快速开始

### 1. 安装 CLI

#### 通过 npm 安装

```bash
npm view @_djhhh/ddo-cli
```

#### 从源码构建并安装

```bash
node scripts/package-all.mjs
cd services/cli
npm pack
npm install -g ddo-cli-*.tgz
```

### 2. 安装 Python 依赖

`llm-py` 依赖本地 Python 环境：

```bash
pip install -r services/llm-py/requirements.txt
```

### 3. 配置 LLM 相关环境变量

以下环境变量不会写入 `~/.ddo`：

```bash
set DDO_LLM_MODEL=anthropic/claude-3.5-sonnet
set DDO_LLM_RAG_MODEL=openai/text-embedding-3-small
set DDO_OPENROUTER_API_KEY=your_api_key
```

### 4. 初始化工作空间

```bash
ddo init
```

默认会在用户目录生成 `~/.ddo`，其中包含：

- 配置文件
- 数据目录
- 日志目录
- 各服务运行所需目录

如果你想使用自定义数据目录：

```bash
ddo init --data-dir D:\custom\ddo-data
```

### 5. 启动服务

```bash
ddo start
```

默认启动顺序：`server-go` → `llm-py` → `web-ui` → `electron`

如果你只想启动后台服务而不进入 REPL：

```bash
ddo start --skip-repl
```

### 6. 查看状态与停止服务

```bash
ddo status
ddo stop
```

## ⚙️ 配置说明

### 根配置

`~/.ddo/config.yaml` 用于保存整个工作空间的统一配置，例如：

- 数据目录
- 日志配置
- 服务地址
- 各服务端口
- 服务配置文件路径

### 服务配置文件

- `server-go`: `~/.ddo/server-go/config.yaml`（默认端口：`50001`）
- `llm-py`: `~/.ddo/llm-py/config.json`（默认端口：`50002`）
- `web-ui`: `~/.ddo/web-ui/config.json`（默认端口：`50003`）

修改配置后，重新执行 `ddo stop` 与 `ddo start` 即可使配置生效。

## � 项目结构

```text
Ddo/
├── .claude/                  # AI 辅助开发配置
├── AGENTS.md                 # 全局开发规则
├── DESIGN.md                 # 设计规范
├── README.md                 # 项目说明
├── SERVICES_INDEX.md         # 服务索引
├── docs/                     # 文档目录
│   ├── change-logs/          # 变更日志
│   └── roadmap/              # 路线图与规划
├── scripts/
│   └── package-all.mjs       # 打包各服务到 CLI
└── services/
    ├── cli/                  # 命令行入口服务
    ├── llm-py/               # LLM 推理服务
    ├── server-go/            # HTTP API 网关服务
    └── web-ui/               # 前端与桌面端界面
```

## 🔧 开发与打包

### 本地打包所有服务到 CLI

```bash
node scripts/package-all.mjs
```

该脚本会完成以下工作：

- 构建 `server-go` 二进制并复制到 `services/cli/vendor/server-go`
- 复制 `llm-py` 源码到 `services/cli/vendor/llm-py`
- 构建 `web-ui` 静态资源并复制到 `services/cli/vendor/web-ui/dist`
- 构建 `web-ui` Electron 主进程产物并复制到 `services/cli/vendor/web-ui/dist-electron`
- 复制 `web-ui/public` 资源到 `services/cli/vendor/web-ui/public`
- 最后构建 CLI 的 `dist`

### 在 CLI 目录打 npm 包

```bash
cd services/cli
npm run pack:npm
```

### 仅生成服务打包产物

```bash
cd services/cli
npm run bundle:services
```

## ❓ 常见问题

### `server-go` 打包是否支持跨平台？

当前 `server-go` 打包为**当前执行平台**的二进制。如果你需要发布跨平台 npm 包，需要在对应平台分别构建。

### `llm-py` 依赖会被 npm 自动安装吗？

不会。`llm-py` 仍依赖本地 Python 与 Python 包安装，需要手动执行 `pip install -r services/llm-py/requirements.txt`。

### Electron 是否必须启动？

`ddo start` 默认会尝试启动 Electron。如果你暂时不需要桌面端，可使用 `ddo start --skip-repl` 启动后台服务流程。

### 如何修改服务端口？

修改 `~/.ddo` 中对应服务的配置文件后，执行 `ddo stop` 与 `ddo start` 重新启动即可。

### 自定义数据目录如何使用？

你可以在 `init`、`start`、`stop`、`status` 等命令中保持同一数据目录，或设置环境变量 `DDO_DATA_DIR`。

## 🤝 贡献

欢迎提交改进建议与代码贡献。

建议流程：

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m "Add some AmazingFeature"`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

提交前建议确认：

- 代码符合项目规范
- 通过相关测试
- 更新了必要文档

## 📄 许可证

本项目采用 [MIT License](LICENSE)。

## � 相关链接

- **项目主页**：[https://github.com/ddo/ddo](https://github.com/ddo/ddo)
- **项目文档**：[https://github.com/ddo/ddo/docs](https://github.com/ddo/ddo/docs)