# SERVER-GO AGENTS

## 📌 作用

负责：
- API
- 业务逻辑
- 数据库操作

---

## 🧱 结构

建议分层：

- handler（接口层）
- service（业务逻辑）
- repo（数据访问）

---

## ⚙️ 规则

- handler 不写业务逻辑
- service 负责业务
- repo 负责 DB

---

## 🧭 开发流程

1. 定义接口
2. 写 handler
3. 写 service
4. 写 repo
5. 写测试

---

## 🚫 禁止

- ❌ 不要写 Python 代码
- ❌ 不要处理 LLM
- ❌ 不要修改 cli / web-ui

---

## 🚫 作用域限制

当前文件只适用于本服务  
不要读取或参考其他 services 的内容