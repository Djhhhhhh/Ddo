# Ddo

Ddo 是一个由 `cli`、`server-go`、`llm-py`、`web-ui` 组成的多服务个人智能工作空间。

本仓库现在支持将各服务产物打包进 CLI，并通过 npm 分发后使用 `ddo` 命令完成初始化、启动和停止。

## 安装

### 方式一：开发仓库内使用

在仓库根目录执行打包脚本，将各服务产物打入 `services/cli/vendor`：

```bash
node scripts/package-all.mjs
```

然后在 `services/cli` 下执行 npm 打包或本地链接：

```bash
npm pack
```

### 方式二：通过 npm 安装

发布到 npm 后，可直接安装：

```bash
npm install -g ddo-cli
```

安装完成后即可使用：

```bash
ddo --help
```

## 启动前准备

### Python 依赖

`llm-py` 仍然依赖本地 Python 运行环境。

你需要确保：

- 已安装 Python 3
- `python` 命令可用；如果命令名不同，可通过环境变量 `DDO_PYTHON_BIN` 指定
- 已安装 `llm-py` 依赖

如果你是从源码仓库或 npm 包目录中准备依赖，可执行：

```bash
pip install -r services/llm-py/requirements.txt
```

如果你使用的是已经打包进 CLI 的产物，请安装 vendor 中的依赖清单：

```bash
pip install -r <ddo-cli安装目录>/vendor/llm-py/requirements.txt
```

### LLM 环境变量

以下三个环境变量**不会**写入 `~/.ddo`，仍然直接读取系统环境变量：

```bash
DDO_LLM_MODEL
DDO_LLM_RAG_MODEL
DDO_OPENROUTER_API_KEY
```

示例：

```bash
set DDO_LLM_MODEL=anthropic/claude-3.5-sonnet
set DDO_LLM_RAG_MODEL=openai/text-embedding-3-small
set DDO_OPENROUTER_API_KEY=your_api_key
```

## 初始化

首次使用请执行：

```bash
ddo init
```

默认会在用户目录生成 `~/.ddo`，并写入以下配置：

```text
~/.ddo/
├── config.yaml
├── server-go/
│   └── config.yaml
├── llm-py/
│   └── config.json
├── web-ui/
│   └── config.json
├── data/
│   ├── go/
│   ├── llm/
│   └── vector/
├── logs/
└── services/
```

其中端口等启动配置会被抽取到这些文件中，后续各服务统一读取这些配置。

如果你想使用自定义数据目录：

```bash
ddo init --data-dir D:\custom\ddo-data
```

## 启动与停止

### 初始化后启动所有服务

```bash
ddo start
```

该命令会按顺序启动：

- `server-go`
- `llm-py`
- `web-ui`
- `electron`

启动成功后会拉起 Electron 桌面端，并进入 CLI REPL。

如果只想后台启动服务而不进入 REPL：

```bash
ddo start --skip-repl
```

### 停止所有服务

```bash
ddo stop
```

### 查看服务状态

```bash
ddo status
```

## 配置说明

### 根配置

`~/.ddo/config.yaml` 用于保存整个 Ddo 工作空间的统一配置，包括：

- 数据目录
- 日志配置
- 服务地址
- 各服务端口与配置文件路径

### 服务配置

- `server-go` 读取 `~/.ddo/server-go/config.yaml`
- `llm-py` 读取 `~/.ddo/llm-py/config.json`
- `web-ui` 读取 `~/.ddo/web-ui/config.json`

默认端口如下：

- `server-go`: `50001`
- `llm-py`: `50002`
- `web-ui`: `50003`

你可以手动修改这些配置文件中的端口，之后重新执行 `ddo start` 即可生效。

## 打包与发布

### 本地打包所有服务到 CLI

```bash
node scripts/package-all.mjs
```

该脚本会执行：

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

或仅生成服务打包产物：

```bash
cd services/cli
npm run bundle:services
```

## 注意事项

- 当前 `server-go` 打包为**当前执行平台**的二进制；如果你要发布跨平台 npm 包，需要在对应平台分别构建
- `llm-py` 仍然依赖本地 Python 与 Python 包安装，不会被 npm 自动安装
- `ddo start` 会尝试同时启动 Electron，因此 npm 包安装后需要具备 Electron 运行环境依赖
- 如果你修改了 `~/.ddo` 中的端口或地址，请先执行 `ddo stop`，再执行 `ddo start`
- 如果使用自定义数据目录，请在 `init/start/stop/status` 时保持一致，或设置 `DDO_DATA_DIR`

## 常用命令

```bash
ddo init
ddo start
ddo start --skip-repl
ddo stop
ddo status
```