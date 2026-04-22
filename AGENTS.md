# AGENTS.md

> 本仓库采用多服务架构，请先阅读 [SERVICES_INDEX.md](./SERVICES_INDEX.md) 了解所有服务的职责和文档链接。

## 🧭 工作流程（必须遵守）

1. 根据任务判断目标服务
2. 查看 [SERVICES_INDEX.md](./SERVICES_INDEX.md) 确认服务职责
3. 进入对应 services/<service>
4. 阅读该服务的 AGENTS.md
5. 在该目录内完成任务

---

## ⚠️ 全局规则

- 每次只允许修改一个 service
- 不允许跨服务修改代码
- 不允许引入其他 service 的内部实现

---

## 📂 服务列表

详见 [SERVICES_INDEX.md](./SERVICES_INDEX.md)，快速参考：

| 服务 | 职责 | 文档 |
|------|------|------|
| cli | 负责服务初始化、启动/停止/状态管理、REPL 交互、定时任务调度、知识库管理；不负责 LLM 推理、数据持久化逻辑、Web UI | [services/cli/AGENTS.md](services/cli/AGENTS.md) |
| llm-py | 负责 LLM 推理、RAG 知识库服务、NLP 意图识别；不处理业务逻辑 | [services/llm-py/AGENTS.md](services/llm-py/AGENTS.md) |
| server-go | 负责 HTTP API 路由、配置管理、日志等基础设施能力 | [services/server-go/AGENTS.md](services/server-go/AGENTS.md) |
| web-ui | 只负责前端界面展示和用户交互，不处理业务逻辑 | [services/web-ui/AGENTS.md](services/web-ui/AGENTS.md) |

---

## 🧠 工作模式

### 🌍 全局模式（分析 / 提问）

- 只读取：
  - AGENTS.md（本文档）
  - [SERVICES_INDEX.md](./SERVICES_INDEX.md)（服务索引）
- 不要进入 services 目录


### 📍 开发模式（编码 / 修改）

- 必须进入某个 services/<name>
- 只读取该目录的 AGENTS.md
- 不要读取其他 services

---

## 📌 优先级

AGENTS.md（当前服务） > 代码
