# MCP/Timer 配置表单 - 功能测试清单

**创建时间**: 2026-04-20
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| MCP 列表展示 | 集成测试 | 高 | ⏳ 待验证 |
| MCP 新增表单 | 集成测试 | 高 | ⏳ 待验证 |
| MCP 测试功能 | 集成测试 | 高 | ⏳ 待验证 |
| MCP 删除功能 | 集成测试 | 高 | ⏳ 待验证 |
| Timer 列表展示 | 集成测试 | 高 | ⏳ 待验证 |
| Timer 新增表单 | 集成测试 | 高 | ⏳ 待验证 |
| Timer 暂停/恢复 | 集成测试 | 高 | ⏳ 待验证 |
| Timer 执行日志 | 集成测试 | 高 | ⏳ 待验证 |
| 表单验证 | 单元测试 | 中 | ⏳ 待验证 |
| 错误边界处理 | 手动验证 | 中 | ⏳ 待验证 |

## 功能验证清单

### MCP 配置管理

- [ ] **MCP 列表展示** - 调用 `GET /api/v1/mcps` 显示所有 MCP 配置
  - 预期结果: 表格展示名称、类型、状态、最后测试时间

- [ ] **MCP 新增表单 - stdio 类型** - 填写名称、类型为 stdio、命令参数
  - 预期结果: 创建成功后列表更新，显示新配置

- [ ] **MCP 新增表单 - http/sse 类型** - 填写名称、类型为 http、URL
  - 预期结果: 创建成功后列表更新，显示新配置

- [ ] **MCP 动态字段** - type=stdio 显示 command/args/env，type=http/sse 显示 url/headers
  - 预期结果: 切换类型时表单字段正确变化

- [ ] **MCP 测试功能** - 点击测试按钮
  - 预期结果: 显示测试结果弹窗，包含状态、工具列表、耗时

- [ ] **MCP 删除确认** - 点击删除后确认
  - 预期结果: 显示确认对话框，确认后列表更新

### 定时任务管理

- [ ] **Timer 列表展示** - 调用 `GET /api/v1/timers` 显示所有定时任务
  - 预期结果: 表格展示名称、cron、状态、下次执行时间

- [ ] **Timer 新增表单** - 填写名称、cron、回调URL
  - 预期结果: 创建成功后列表更新，显示新任务

- [ ] **Timer 暂停功能** - 点击暂停按钮
  - 预期结果: 任务状态变为"已暂停"，按钮变为"恢复"

- [ ] **Timer 恢复功能** - 点击恢复按钮
  - 预期结果: 任务状态变为"运行中"，按钮变为"暂停"

- [ ] **Timer 手动触发** - 点击触发按钮
  - 预期结果: 立即执行一次任务

- [ ] **Timer 执行日志** - 点击日志按钮
  - 预期结果: 显示执行历史弹窗，包含状态、输出、错误、耗时

### 表单验证

- [ ] **必填字段验证** - 空表单提交
  - 预期结果: 提交按钮禁用

- [ ] **type=stdio 命令验证** - 不填写 command
  - 预期结果: 提交按钮禁用

- [ ] **type=http URL 验证** - 不填写 url
  - 预期结果: 提交按钮禁用

- [ ] **Cron 表达式格式** - 填写错误的 cron 表达式
  - 预期结果: 后端返回错误提示

### 错误边界处理

- [ ] **server-go 不可用** - 后端服务关闭时操作
  - 预期结果: 显示友好错误提示，不是空白页面

- [ ] **表单提交防重复** - 快速连续点击提交
  - 预期结果: 按钮显示 loading 状态，禁止重复提交

## 边界情况测试

- [ ] **MCP 列表为空** - 无任何 MCP 配置时
  - 预期结果: 显示"暂无 MCP 配置"提示

- [ ] **Timer 列表为空** - 无任何定时任务时
  - 预期结果: 显示"暂无定时任务"提示

- [ ] **测试超时** - MCP 服务无响应
  - 预期结果: 显示错误信息，超时提示

- [ ] **日志为空** - 任务从未执行过
  - 预期结果: 显示"暂无执行日志"

- [ ] **长任务名称** - 名称超过 50 字符
  - 预期结果: 正确截断显示

## 回归测试

- [ ] 确认 Help 页面正常访问
- [ ] 确认 Dashboard 页面正常访问
- [ ] 确认 Config 页面正常访问
- [ ] 确认主题切换功能正常

## API 验证 (curl)

### MCP APIs

```bash
# 列出所有 MCP
curl -X GET http://127.0.0.1:8080/api/v1/mcps

# 创建 MCP (stdio)
curl -X POST http://127.0.0.1:8080/api/v1/mcps \
  -H "Content-Type: application/json" \
  -d '{"name":"test","type":"stdio","command":"npx"}'

# 创建 MCP (http)
curl -X POST http://127.0.0.1:8080/api/v1/mcps \
  -H "Content-Type: application/json" \
  -d '{"name":"test","type":"http","url":"https://api.example.com/mcp"}'

# 测试 MCP
curl -X POST http://127.0.0.1:8080/api/v1/mcps/{uuid}/test

# 删除 MCP
curl -X POST http://127.0.0.1:8080/api/v1/mcps/{uuid}/delete
```

### Timer APIs

```bash
# 列出所有定时任务
curl -X GET http://127.0.0.1:8080/api/v1/timers

# 创建定时任务
curl -X POST http://127.0.0.1:8080/api/v1/timers \
  -H "Content-Type: application/json" \
  -d '{"name":"test","cron_expr":"0 * * * *","callback_url":"https://example.com/webhook"}'

# 暂停定时任务
curl -X POST http://127.0.0.1:8080/api/v1/timers/{uuid}/pause

# 恢复定时任务
curl -X POST http://127.0.0.1:8080/api/v1/timers/{uuid}/resume

# 手动触发
curl -X POST http://127.0.0.1:8080/api/v1/timers/{uuid}/trigger

# 查看执行日志
curl -X GET http://127.0.0.1:8080/api/v1/timers/{uuid}/logs
```

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| - | - | - | - |
