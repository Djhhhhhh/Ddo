# 变更日志

**提交信息**: feat(cli): 增强 REPL 交互和 NLP 意图路由
**分支**: main
**日期**: 2026-04-16
**作者**: Claude

## 变更文件
- services/cli/.claude/rules/rules.md (modified)
- services/cli/AGENTS.md (modified)
- services/cli/dist/repl/commands/kb-commands.js (modified)
- services/cli/dist/repl/commands/mcp-commands.js (modified)
- services/cli/dist/repl/commands/prompt-helper.js (modified)
- services/cli/dist/repl/commands/timer-commands.js (modified)
- services/cli/dist/repl/index.js (modified)
- services/cli/dist/repl/intent-router.js (modified)
- services/cli/dist/repl/validators.js (added)
- services/cli/dist/services/api-client.js (modified)
- services/cli/src/repl/commands/kb-commands.ts (modified)
- services/cli/src/repl/commands/mcp-commands.ts (modified)
- services/cli/src/repl/commands/prompt-helper.ts (modified)
- services/cli/src/repl/commands/timer-commands.ts (modified)
- services/cli/src/repl/intent-router.ts (modified)
- services/cli/src/repl/validators.ts (added)
- services/cli/src/services/api-client.ts (modified)
- services/llm-py/.claude/rules/rules.md (modified)
- services/llm-py/AGENTS.md (modified)
- services/llm-py/app/api/chat.py (modified)
- services/llm-py/app/core/llm_factory.py (modified)
- services/other/docs/bugfix/2026-04-16-repl-interaction-fix/... (added)
- services/server-go/internal/application/service/llm_proxy.go (modified)

## 统计
- 新增文件: 5
- 修改文件: 23
- 删除文件: 0
- 代码行数: +2088 / -72

## 描述
CLI REPL 交互增强：新增 validators.ts 参数验证模块，完善意图路由器参数标准化契约（KB/Timer/MCP），修复 API 客户端字段映射问题（cron_expr/callback_url）。LLM 代理新增历史消息压缩功能。更新 AGENTS.md 和 rules.md 文档。