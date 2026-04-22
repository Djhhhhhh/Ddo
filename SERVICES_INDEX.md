> 更新时间：2026-04-13 21:02:43
> 更新时间：2026-04-22 21:20

本仓库采用多服务架构，各服务职责如下：

| 服务 | 职责 | 文档 |
|------|------|------|
| cli | 负责服务初始化、启动/停止/状态管理、REPL 交互、定时任务调度、知识库管理；不负责 LLM 推理、数据持久化逻辑、Web UI | [services/cli/AGENTS.md](services/cli/AGENTS.md) |
| llm-py | 负责 LLM 推理、RAG 知识库服务、NLP 意图识别；不处理业务逻辑 | [services/llm-py/AGENTS.md](services/llm-py/AGENTS.md) |
| server-go | 负责 HTTP API 路由、配置管理、日志等基础设施能力 | [services/server-go/AGENTS.md](services/server-go/AGENTS.md) |
| web-ui | 只负责前端界面展示和用户交互，不处理业务逻辑 | [services/web-ui/AGENTS.md](services/web-ui/AGENTS.md) |

## 快速导航

- **cli**: [services/cli/](services/cli/)
- **llm-py**: [services/llm-py/](services/llm-py/)
- **server-go**: [services/server-go/](services/server-go/)
- **web-ui**: [services/web-ui/](services/web-ui/)
