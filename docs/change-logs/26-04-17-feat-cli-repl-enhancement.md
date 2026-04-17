# 变更日志

**提交信息**: feat(cli): REPL 交互增强 - Shift+Tab 切换和输出优化
**分支**: main
**日期**: 2026-04-17
**作者**: Djhhh

## 变更文件
- services/cli/src/repl/index.ts (modified) - Shift+Tab 切换知识库优先模式、输入去重、换行控制
- services/cli/src/repl/commands/index.ts (modified) - 新增 CommandType 枚举和 CommandResult 接口
- services/cli/src/repl/commands/chat.ts (modified)
- services/cli/src/repl/commands/help.ts (modified)
- services/cli/src/repl/commands/exit.ts (modified)
- services/cli/src/repl/commands/clear.ts (modified)
- services/cli/src/repl/commands/status.ts (modified)
- services/cli/src/repl/commands/mode-switch.ts (modified)
- services/cli/src/repl/commands/kb-commands.ts (modified)
- services/cli/src/repl/commands/timer-commands.ts (modified)
- services/cli/src/repl/commands/mcp-commands.ts (modified)
- services/cli/src/repl/intent-router.ts (modified) - 修复 intent-router.ts 问题
- services/cli/src/repl/mode.ts (modified)
- services/cli/AGENTS.md (modified)
- services/cli/docs/feature/2026-04-17-cli-repl-enhancement/review-list.md (added)
- services/cli/docs/feature/2026-04-17-cli-repl-enhancement/技术方案.md (added)
- services/llm-py/app/core/llm_factory.py (modified)
- services/server-go/internal/application/usecase/knowledge/create_knowledge.go (modified)
- services/other/docs/bugfix/2026-04-17-bugfix-cli-nlp-categories/技术方案.md (added)
- services/cli/dist/ (many modified) - 编译产物

## 统计
- 新增文件: 3
- 修改文件: 57
- 删除文件: 0
- 代码行数: +1118 / -211

## 描述
CLI REPL 交互模式增强：
- Shift+Tab 切换知识库优先模式
- 取消重复显示用户输入（"你: xxx"）
- AI 对话答复后换行，普通命令不换行
- 知识库智能分类和标签增强
- NLP 分类功能优化
