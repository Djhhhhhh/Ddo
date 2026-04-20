# Metrics 接口数据完善 - 功能测试清单

**创建时间**: 2026-04-20 07:12:15
**技术方案**: [技术方案-metrics接口数据完善.md](技术方案-metrics接口数据完善.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| metrics 接口返回 200 | 集成测试 | 高 | ⏳ 待验证 |
| timers.total 和 timers.active 返回真实计数 | 集成测试 | 高 | ⏳ 待验证 |
| knowledge.total 返回真实计数 | 集成测试 | 高 | ⏳ 待验证 |
| mcps.total 返回真实计数 | 集成测试 | 高 | ⏳ 待验证 |
| 服务状态检测（server_go/llm_py/mysql） | 集成测试 | 中 | ⏳ 待验证 |
| cli/web 默认显示 running | 集成测试 | 中 | ⏳ 待验证 |
| 数据库无数据时返回 0 | 单元/集成 | 中 | ⏳ 待验证 |

## 功能验证清单

### 接口基本性
- [ ] 向 GET /api/v1/metrics 发送请求，返回 HTTP 200，响应格式与技术方案一致

### 服务状态
- [ ] services.server_go 固定为 "running"（server-go 在运行才响应请求）
- [ ] services.llm_py 通过 HTTP /health 检测，返回 "running" 或 "stopped"
- [ ] services.mysql 通过 dbConn.GetMySQLStatus() 检测，返回 "connected" 或 "disconnected"
- [ ] services.cli 固定为 "running"（Claude Code REPL 前端组件）
- [ ] services.web 固定为 "running"（前端 SPA）

### timers

### knowledge
- [ ] knowledge.total 等于 knowledge_repo.List() 返回的 total
- [ ] 当没有知识条目时，返回 0

### mcps
- [ ] mcps.total 等于 mcp_repo.List() 返回的 total
- [ ] 当没有 MCP 配置时，返回 0

## 边界情况测试

- [ ] llm-py 服务不可达：llm_py 字段应为 "stopped"（模拟断开或更换地址）
- [ ] 数据库连接异常：mysql 字段应为 "disconnected" 并且接口仍返回 200
- [ ] 高并发调用：使用简易压测工具（hey/ab）进行 100/s 压测，无致命错误

## 回归测试

- [ ] 确认其他 API（/api/v1/health、/api/v1/timers）不受影响

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-20 07:12 | {验证人} | ⏳ 待验证 | 由实现者运行测试 |
