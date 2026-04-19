# Service Rules

> 由 AI 在开发过程中自动维护的规则文件。

## 架构规则

- **CLI 为核心，Web 为扩展**：Web 通过 CLI 命令启动，非必须组件（2026-04-19）
- **代理转发**：Vite dev server 代理 `/api` 和 `/health` 到 `127.0.0.1:8080`（2026-04-19）
- **简洁单页布局**：使用顶部导航栏，而非侧边栏（2026-04-19）

## 代码规范

- **Ollama 设计系统**：遵循 DESIGN.md 规范 - 纯灰度、Pill 按钮、零阴影、12px/9999px 二元 border-radius（2026-04-19）
- **TailwindCSS 扩展**：在 `tailwind.config.js` 中扩展灰度色板和自定义 border-radius（2026-04-19）
- **Pinia 状态管理**：使用 Pinia 管理 theme 等全局状态（2026-04-19）
- **Vue 3 Composition API**：使用 `<script setup>` 语法（2026-04-19）

## 常见陷阱

- **API 模块待开发**：Axios 封装好了，但具体 API 函数（health.ts 等）需根据 server-go 实际路由定义创建（2026-04-19）
- **Dark 主题切换**：需在 HTML 元素上切换 `dark` class，并设置 backgroundColor 防止 FOUC（2026-04-19）

## 示例参考

- **Button 组件**：遵循 Ollama 的 Gray/White/Black Pill 设计（2026-04-19）
- **Card 组件**：12px border-radius，无阴影，纯色背景 + 1px border（2026-04-19）