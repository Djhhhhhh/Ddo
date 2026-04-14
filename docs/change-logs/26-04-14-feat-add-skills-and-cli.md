# 变更日志

**提交信息**: feat: 新增 check-todo、code-review 技能和 CLI 服务初始化
**分支**: main
**日期**: 2026-04-14
**作者**: Djhhh

## 变更文件
- .claude/skills/check-todo/SKILL.md (added)
- .claude/skills/code-review/SKILL.md (added)
- docs/roadmap/todo-list/TODO_LIST.html (added)
- docs/roadmap/todo-list/app.js (added)
- services/cli/.claude/rules/rules.md (modified)
- services/cli/AGENTS.md (modified)
- services/cli/dist/* (added)
- services/cli/docs/feature/* (added)
- services/cli/src/* (added)
- services/cli/package.json (added)
- services/cli/package-lock.json (added)
- services/cli/tsconfig.json (added)
- docs/change-logs/ (added)

## 统计
- 新增文件: 930+
- 修改文件: 4
- 删除文件: 0
- 代码行数: +576233 / -13

## 描述
本次提交包含以下主要更新：

1. **新增技能**：
   - check-todo：检查项目 TODO 进度，自动创建技术方案文件夹
   - code-review：代码审查技能，为服务设置评分标准

2. **新增 TODO 管理工具**：
   - docs/roadmap/todo-list/ 下的可视化 TODO 列表

3. **CLI 服务初始化**：
   - 完整的 TypeScript CLI 项目结构
   - 包含 init 命令、Docker 工具函数、日志工具等
   - 编译后的 dist 目录和类型定义

4. **文档更新**：
   - AGENTS.md 和 rules.md 规范化更新
   - 新增变更日志目录结构
