# routing.md

## 🎯 服务职责

- cli → 命令行入口 / 调度
- server-go → API / 业务逻辑 / 数据库
- llm-py → LLM / prompt / AI处理
- web-ui → UI / 弹窗

---

## 🚦 路由规则

- CLI功能 → cli
- API / DB → server-go
- AI / prompt → llm-py
- UI → web-ui

---

## 🚫 强制限制

- 不要跨服务修改代码
- 不要创建跨服务依赖
- 不要混用语言（Go / Python / Node）
- 不要一次性读取多个 service 的 AGENTS.md  
- 只在进入目标 service 后再读取对应文档

---

## 🧠 行为规则

进入某个 service 后：
- 必须读取该目录 AGENTS.md
- 只使用该目录的 rules 和 skills

---

## 🧭 模式判断

如果任务是：
- 架构理解 / 方案设计 → 使用全局模式
- 代码修改 / 实现功能 → 使用开发模式