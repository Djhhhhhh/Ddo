# API 对接 - 功能测试清单

**创建时间**: 2026-04-19 22:35:00
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| getMetrics() 正确获取 Dashboard 指标数据 | 集成测试 | 高 | ⏳ 待验证 |
| listTimers() 正确获取定时任务列表 | 集成测试 | 高 | ⏳ 待验证 |
| listMCPs() 正确获取 MCP 配置列表 | 集成测试 | 高 | ⏳ 待验证 |
| testMCP() 正确测试 MCP 连接 | 集成测试 | 高 | ⏳ 待验证 |
| API 错误时显示友好提示 | 集成测试 | 中 | ⏳ 待验证 |

## 功能验证清单

### Health API
- [ ] GET /health 返回健康状态 - 预期结果: `{code: 0, data: {status, version, mysql, badgerdb}}`

**验证命令**:
```bash
curl -s http://127.0.0.1:8080/health | jq
```

### Metrics API
- [ ] GET /api/v1/metrics 返回综合指标 - 预期结果: `{code: 0, data: {services, timers, knowledge, mcps}}`

**验证命令**:
```bash
curl -s http://127.0.0.1:8080/api/v1/metrics | jq
```

### Timer API
- [ ] GET /api/v1/timers 返回定时任务列表 - 预期结果: `{code: 0, data: [...]}`

**验证命令**:
```bash
curl -s http://127.0.0.1:8080/api/v1/timers | jq
```

### MCP API
- [ ] GET /api/v1/mcps 返回 MCP 配置列表 - 预期结果: `{code: 0, data: [...]}`

**验证命令**:
```bash
curl -s http://127.0.0.1:8080/api/v1/mcps | jq
```

## 边界情况测试

- [ ] server-go 未启动时 API 返回错误 - 预期结果: 网络错误提示
- [ ] 请求超时（10秒）处理 - 预期结果: 超时错误提示
- [ ] MCP 测试失败时返回错误信息 - 预期结果: `{code: 0, data: {success: false, error: "..."}}`

## 回归测试

- [ ] 确认未破坏 client.ts 原有功能
- [ ] 确认未破坏其他 service 的 API

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| - | - | - | - |
