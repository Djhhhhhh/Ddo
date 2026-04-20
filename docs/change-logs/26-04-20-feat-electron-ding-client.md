# 变更日志

**提交信息**: feat(web-ui): Electron 桌面客户端及钉钉 Island 功能
**分支**: main
**日期**: 2026-04-20
**作者**: Djhhh

## 变更文件

### 新增文件
- services/web-ui/dist-electron/*.js (electron编译产物)
- services/web-ui/dist/assets/*.js (前端构建产物)
- services/web-ui/dist/assets/*.css (前端构建产物)
- services/web-ui/dist/index.html
- services/web-ui/dist/icon*.svg
- services/web-ui/dist/icons/*.svg
- services/web-ui/docs/feature/2026-04-20-electron-ding-client/review-list.md
- services/web-ui/docs/feature/2026-04-20-electron-ding-client/技术方案.md
- services/web-ui/electron.mjs
- services/web-ui/electron/*.ts
- services/web-ui/electron/windows/*.ts
- services/web-ui/electron/tsconfig.json
- services/web-ui/public/icon*.svg
- services/web-ui/public/icons/*.svg
- services/web-ui/scripts/build-electron.mjs
- services/web-ui/src/components/DingIsland/*.vue
- services/web-ui/src/components/DingIsland/*.ts
- services/web-ui/src/types/electron.d.ts
- services/web-ui/src/views/Island/IslandView.vue

### 修改文件
- docs/roadmap/todo-list/ddo-tasks.json
- services/web-ui/.claude/rules/rules.md
- services/web-ui/AGENTS.md
- services/web-ui/package.json
- services/web-ui/package-lock.json
- services/web-ui/src/App.vue
- services/web-ui/src/api/*.ts
- services/web-ui/src/components/Charts/PieChart.vue
- services/web-ui/src/components/Form/*.vue
- services/web-ui/src/components/Layout/*.vue
- services/web-ui/src/components/ui/*.vue
- services/web-ui/src/router/index.ts
- services/web-ui/src/views/*/*.vue

## 统计
- 新增文件: 约 50 个
- 修改文件: 约 23 个
- 删除文件: 0
- 代码行数: +25429 / -1164

## 描述

本次提交主要包含：
1. **Electron 桌面客户端框架** - 新增 electron 目录，包含主进程、窗口管理、IPC 通信、通知、系统托盘等模块
2. **钉钉 Island 功能** - 新增 DingIslandCard 组件和 DingIslandStore 状态管理，支持在桌面客户端中嵌入钉钉面板
3. **前端构建产物** - 包含完整的 dist 目录，用于 Electron 渲染进程加载
4. **图标准备** - public 和 dist 目录下的 SVG 图标文件
5. **文档更新** - 技术方案文档和功能测试清单
