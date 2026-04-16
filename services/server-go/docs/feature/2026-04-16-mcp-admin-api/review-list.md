# MCP 管理 API - 功能测试清单

**创建时间**: 2026-04-16
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| 创建 stdio 类型 MCP 配置 | 集成测试 | 高 | 待验证 |
| 创建 http 类型 MCP 配置 | 集成测试 | 高 | 待验证 |
| 分页查询 MCP 列表 | 集成测试 | 高 | 待验证 |
| 获取单条 MCP 详情 | 集成测试 | 高 | 待验证 |
| 删除 MCP 配置 | 集成测试 | 高 | 待验证 |
| 测试 MCP 连接 | 集成测试 | 高 | 待验证 |
| 重复测试已删除的 MCP | 边界测试 | 中 | 待验证 |
| 并发测试多个 MCP 连接 | 边界测试 | 中 | 待验证 |

## API curl 测试命令

### 创建 MCP 配置（stdio 类型）

```bash
curl -X POST http://127.0.0.1:8080/api/v1/mcps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-stdio-mcp",
    "description": "stdio MCP 示例",
    "type": "stdio",
    "command": "node",
    "args": ["/path/to/mcp-server.js"],
    "env": ["NODE_ENV=production"]
  }'
```

### 创建 MCP 配置（http 类型）

```bash
curl -X POST http://127.0.0.1:8080/api/v1/mcps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-http-mcp",
    "description": "http MCP 示例",
    "type": "http",
    "url": "http://localhost:3000/mcp",
    "headers": {
      "Authorization": "Bearer token123"
    }
  }'
```

### 创建 MCP 配置（sse 类型）

```bash
curl -X POST http://127.0.0.1:8080/api/v1/mcps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-sse-mcp",
    "description": "sse MCP 示例",
    "type": "sse",
    "url": "http://localhost:3000/sse/mcp",
    "headers": {}
  }'
```

### 查询 MCP 列表

```bash
# 基础列表查询
curl -X GET http://127.0.0.1:8080/api/v1/mcps

# 按类型过滤
curl -X GET "http://127.0.0.1:8080/api/v1/mcps?type=stdio"

# 按状态过滤
curl -X GET "http://127.0.0.1:8080/api/v1/mcps?status=active"

# 分页查询
curl -X GET "http://127.0.0.1:8080/api/v1/mcps?page=1&page_size=10"

# 组合过滤
curl -X GET "http://127.0.0.1:8080/api/v1/mcps?type=http&status=active&page=1&page_size=20"
```

### 获取 MCP 详情

```bash
curl -X GET http://127.0.0.1:8080/api/v1/mcps/{uuid}
```

### 删除 MCP 配置

```bash
curl -X POST http://127.0.0.1:8080/api/v1/mcps/{uuid}/delete
```

### 测试 MCP 连接

```bash
# 使用默认超时（10秒）
curl -X POST http://127.0.0.1:8080/api/v1/mcps/{uuid}/test

# 指定超时时间
curl -X POST "http://127.0.0.1:8080/api/v1/mcps/{uuid}/test?timeout=30"
```

## 功能验证清单

### MCP 配置 CRUD
- [ ] 创建 stdio 类型 MCP 配置
  - curl: 见上方
  - 预期结果: 返回 `{code: 200, message: "success", data: {uuid, name, type, status: "inactive"}}`
- [ ] 创建 http 类型 MCP 配置
  - curl: 见上方
  - 预期结果: 返回 `{code: 200, message: "success", data: {uuid, name, type, status: "inactive"}}`
- [ ] 创建 sse 类型 MCP 配置
  - curl: 见上方
  - 预期结果: 返回 `{code: 200, message: "success", data: {uuid, name, type, status: "inactive"}}`
- [ ] 分页查询 MCP 列表
  - curl: 见上方
  - 预期结果: 返回 `{code: 200, message: "success", data: {total, items: [...]}}`
- [ ] 获取单条 MCP 详情
  - curl: 见上方
  - 预期结果: 返回完整 MCP 配置信息
- [ ] 删除 MCP 配置
  - curl: 见上方
  - 预期结果: 返回 `{success: true}`

### MCP 连接测试
- [ ] 测试 stdio MCP 连接
  - curl: 见上方
  - 预期结果: 返回 `{status: "active", tools: [...], elapsed_ms: xxx}`
- [ ] 测试 http MCP 连接
  - curl: 见上方
  - 预期结果: 返回 `{status: "active", tools: [...], elapsed_ms: xxx}`
- [ ] 测试 sse MCP 连接
  - curl: 见上方
  - 预期结果: 返回 `{status: "active", tools: [...], elapsed_ms: xxx}`

## 边界情况测试

- [ ] 创建时 name 为空
  - curl: `curl -X POST http://127.0.0.1:8080/api/v1/mcps -H "Content-Type: application/json" -d '{"type":"stdio","command":"node"}'`
  - 预期结果: 400 错误 `{code: 400, message: "invalid request: Key: 'CreateMCPRequest.Name' Error:Field validation...`
- [ ] 创建时 type 无效
  - curl: `curl -X POST http://127.0.0.1:8080/api/v1/mcps -H "Content-Type: application/json" -d '{"name":"test","type":"invalid"}'`
  - 预期结果: 400 错误
- [ ] 创建 stdio 时 command 为空
  - curl: `curl -X POST http://127.0.0.1:8080/api/v1/mcps -H "Content-Type: application/json" -d '{"name":"test","type":"stdio"}'`
  - 预期结果: 400 错误
- [ ] 创建 http/sse 时 url 为空
  - curl: `curl -X POST http://127.0.0.1:8080/api/v1/mcps -H "Content-Type: application/json" -d '{"name":"test","type":"http"}'`
  - 预期结果: 400 错误
- [ ] 获取不存在的 uuid
  - curl: `curl -X GET http://127.0.0.1:8080/api/v1/mcps/nonexistent-uuid`
  - 预期结果: 404 错误
- [ ] 删除不存在的 uuid
  - curl: `curl -X POST http://127.0.0.1:8080/api/v1/mcps/nonexistent-uuid/delete`
  - 预期结果: 404 错误
- [ ] 测试不存在的 uuid
  - curl: `curl -X POST http://127.0.0.1:8080/api/v1/mcps/nonexistent-uuid/test`
  - 预期结果: 404 错误
- [ ] 测试已删除的 uuid
  - curl: 先创建再删除，然后测试
  - 预期结果: 404 错误
- [ ] 并发创建多个 MCP
  - curl: 使用 `&` 并发执行多个创建请求
  - 预期结果: 都能成功创建
- [ ] 并发测试同一个 MCP
  - curl: 使用 `&` 并发执行多个测试请求
  - 预期结果: 连接池隔离，无竞态问题

## 回归测试

- [ ] 确认 /health 接口仍然正常
  ```bash
  curl http://127.0.0.1:8080/health
  curl http://127.0.0.1:8080/api/v1/health
  ```
- [ ] 确认 /api/v1/knowledge 接口未被破坏
  ```bash
  curl http://127.0.0.1:8080/api/v1/knowledge
  ```
- [ ] 确认 /api/v1/timers 接口未被破坏
  ```bash
  curl http://127.0.0.1:8080/api/v1/timers
  ```

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| - | - | - | - |