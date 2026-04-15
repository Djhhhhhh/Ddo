# server-go

## 📌 作用

server-go 是 Ddo 平台的核心网关服务，负责提供统一的 API 路由、定时任务调度、消息队列、知识库管理和 MCP 管理能力。采用 DDD（领域驱动设计）四层架构，为业务功能开发提供清晰的领域边界和分层结构。

- 边界：负责 HTTP API 路由、配置管理、日志等基础设施能力
- 调用关系：被上层服务调用，调用数据库和外部 API

## 📂 目录结构

```
server-go/
├── cmd/
│   └── server/
│       └── main.go                          # 服务启动入口（2026-04-14）
├── configs/
│   └── config.yaml                          # 配置文件模板（2026-04-14）
├── internal/
│   ├── bootstrap/
│   │   └── app.go                           # 应用生命周期管理（2026-04-14）
│   ├── domain/                              # ★ 领域层（核心业务）
│   │   ├── common/                          # 领域共享组件（2026-04-14）
│   │   │   ├── entity.go                    # 实体基类
│   │   │   ├── valueobject.go               # 值对象基类
│   │   │   ├── event.go                     # 领域事件接口
│   │   │   └── errors.go                    # 领域错误定义
│   │   └── health/                          # 健康检查领域（2026-04-14）
│   │       ├── aggregate.go                 # Health 聚合根
│   │       └── valueobject.go               # HealthStatus 值对象
│   ├── application/                         # 应用层（用例编排）
│   │   ├── result/
│   │   │   └── result.go                    # 统一响应结果封装（2026-04-14）
│   │   └── usecase/
│   │       └── health/
│   │           └── check_health.go          # CheckHealth 用例实现（2026-04-14）
│   ├── interfaces/                          # 接口层（协议适配）
│   │   └── http/
│   │       ├── handler/
│   │       │   └── health_handler.go        # 健康检查 Handler（2026-04-14）
│   │       ├── middleware/
│   │       │   ├── recovery.go              # 异常恢复（2026-04-14）
│   │       │   ├── logger.go                # 请求日志（2026-04-14）
│   │       │   ├── cors.go                  # 跨域支持（2026-04-14）
│   │       │   └── request_id.go            # 请求ID追踪（2026-04-14）
│   │       ├── dto/
│   │       │   └── health_dto.go            # HTTP DTO（2026-04-14）
│   │       └── router.go                    # 路由注册（2026-04-14）
│   └── infrastructure/                      # 基础设施层（技术实现）
│       ├── config/
│       │   └── config.go                    # Viper 配置管理（2026-04-14）
│       ├── logger/
│       │   └── logger.go                    # Zap 日志实现（2026-04-14）
│       └── server/
│           └── gin_server.go                # Gin HTTP 服务器适配器（2026-04-14）
├── pkg/
│   └── utils/
│       └── validator.go                     # 通用验证工具（2026-04-14）
├── docs/
│   └── feature/                             # 技术方案文档
├── go.mod                                   # Go 模块定义
├── Makefile                                 # 构建脚本（2026-04-14）
├── wire.go                                  # Wire 依赖注入配置（2026-04-14）
├── wire_gen.go                              # Wire 生成的代码（2026-04-14）
└── AGENTS.md                                # 本文件
```

## 🧠 Rules 自维护

**此章节指导 AI 如何自动维护本服务的规则。**

### Rules 文件位置
- 本服务规则：[.claude/rules/rules.md](.claude/rules/rules.md)

### 何时更新 Rules
开发完成后，如果满足以下条件之一，**必须**更新 Rules：
- 🆕 引入新的架构模式
- 📁 新增目录结构
- 📋 改变代码规范
- 🔁 出现重复实现（需要抽象规则）

### 如何更新 Rules
1. 打开 [.claude/rules/rules.md](.claude/rules/rules.md)
2. 在对应类别下追加新规则（不要覆盖）
3. 格式：`- 规则描述（发现日期：YYYY-MM-DD）`

> 💡 提示：每次开发完成后问自己：这次我学到了什么模式值得记录？

## ✅ 开发检查清单

提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/<service>.md

## 🚫 禁止

硬性红线（违反会导致架构混乱）：
- ❌ 跨 service import（只能调 API，不能 import 包）
- ❌ 直接修改其他 service 的代码
- ❌ [待补充：具体的禁止行为，由开发过程中发现]

## 🕒 最后更新时间

2026-04-14 16:45:00