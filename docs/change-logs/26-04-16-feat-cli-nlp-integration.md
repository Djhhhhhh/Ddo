# 变更日志

**提交信息**: feat(cli): 实现 CLI NLP 集成和意图路由
**分支**: main
**日期**: 2026-04-16
**作者**: Djhhh

## 变更文件

### CLI Source Files (added)
- services/cli/src/services/nlp.ts - NLP Service 封装
- services/cli/src/repl/intent-router.ts - 意图路由器
- services/cli/src/repl/commands/kb-commands.ts - 知识库命令
- services/cli/src/repl/commands/mcp-commands.ts - MCP 命令
- services/cli/src/repl/commands/timer-commands.ts - 定时任务命令
- services/cli/src/repl/commands/prompt-helper.ts - Prompt 助手
- services/cli/src/services/api-client.ts - API 客户端

### CLI Source Files (modified)
- services/cli/src/commands/start.ts
- services/cli/src/index.ts
- services/cli/src/repl/commands/chat.ts
- services/cli/src/repl/commands/index.ts
- services/cli/src/repl/commands/mode-switch.ts
- services/cli/src/repl/commands/status.ts
- services/cli/src/repl/index.ts
- services/cli/src/repl/mode.ts

### Server-Go Files (added)
- services/server-go/internal/application/service/llm_proxy.go - LLM 代理服务
- services/server-go/internal/interfaces/http/handler/llm_handler.go - LLM 处理器
- services/server-go/internal/interfaces/http/handler/metrics_handler.go - 指标处理器

### Server-Go Files (modified)
- services/server-go/cmd/server/wire_gen.go
- services/server-go/ddo/MANIFEST
- services/server-go/internal/interfaces/http/dto/health_dto.go
- services/server-go/internal/interfaces/http/handler/health_handler.go
- services/server-go/internal/interfaces/http/router.go

### Other Files (added)
- services/other/docs/bugfix/2026-04-16-repl-interaction-fix/技术方案.md
- services/other/docs/feature/2026-04-16-api-integration/review-list.md
- services/other/docs/feature/2026-04-16-api-integration/技术方案.md

### Other Files (modified)
- docs/roadmap/todo-list/ddo-tasks.json

### Build Outputs (added/modified)
- services/cli/dist/* - 编译产物

## 统计
- 新增文件: 24
- 修改文件: 56
- 删除文件: 0
- 代码行数: +5370 / -647

## 描述

CLI NLP 集成和意图路由增强：
- NLP Service 封装 llm-py /api/nlp 接口
- 意图路由器支持关键词兜底匹配
- REPL 默认模式自然语言输入自动调用 NLP 分析
- NLP 服务不可用时自动降级到 chat 模式
- 新增知识库、MCP、定时任务、Prompt 助手命令模块
- API 客户端服务封装

Server-Go LLM 代理增强：
- LLM Proxy 服务实现
- Metrics 指标采集端点
- Health 健康检查改进
