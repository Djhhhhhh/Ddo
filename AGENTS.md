# AGENTS.md

## 🧭 工作流程（必须遵守）

1. 根据任务判断目标服务
2. 查看 .agent/routing.md
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

- cli：命令行入口 / 调度
- server-go：后端 API / 数据处理
- llm-py：大模型交互
- web-ui：前端 / 弹窗

---

## 🧠 工作模式

### 🌍 全局模式（分析 / 提问）

- 只读取：
  - AGENTS.md
  - .agent/routing.md
- 不要进入 services 目录


### 📍 开发模式（编码 / 修改）

- 必须进入某个 services/<name>
- 只读取该目录的 AGENTS.md
- 不要读取其他 services

---

## 📌 优先级

AGENTS.md（当前服务） > routing.md > 代码