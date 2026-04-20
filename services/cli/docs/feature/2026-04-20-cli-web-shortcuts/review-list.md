# CLI Web 快捷命令与可视化入口统一 - 功能测试清单

**创建时间**: 2026-04-20 22:32:00  
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| `/web` 打开 Dashboard 首页 | 手动验证 | 高 | ⏳ 待验证 |
| `/status-web` 打开状态页 | 手动验证 | 高 | ⏳ 待验证 |
| `/timer-web` 打开定时任务页 | 手动验证 | 高 | ⏳ 待验证 |
| `/mcp-web` 打开 MCP 配置页 | 手动验证 | 高 | ⏳ 待验证 |
| `/kb-web` 打开知识库页 | 手动验证 | 高 | ⏳ 待验证 |
| `config.yaml` 中 `endpoints.webUi` 生效 | 集成测试 | 高 | ⏳ 待验证 |
| Hash 路由拼接为 `/#/path` | 集成测试 | 高 | ⏳ 待验证 |
| 浏览器拉起失败时输出完整 URL | 边界测试 | 中 | ⏳ 待验证 |
| Timer / MCP 交互文案与页面语义一致 | 手动验证 | 中 | ⏳ 待验证 |
| `/timer-add-interval` 创建 cron 周期任务 | 手动验证 | 高 | ⏳ 待验证 |
| `/timer-add-delay` 正确提示能力边界 | 手动验证 | 中 | ⏳ 待验证 |

## 功能验证清单

### Web 快捷命令
- [ ] 执行 `/web` - 预期结果: 输出“已打开 Web 页面”并跳转到 Dashboard 首页。
- [ ] 执行 `/status-web` - 预期结果: 输出完整 URL，并打开状态总览页。
- [ ] 执行 `/timer-web` - 预期结果: 输出完整 URL，并打开定时任务列表页。
- [ ] 执行 `/mcp-web` - 预期结果: 输出完整 URL，并打开 MCP 配置页。
- [ ] 执行 `/kb-web` - 预期结果: 输出完整 URL，并打开知识库页面。
- [ ] 执行 `/mcp-web` - 预期结果: 输出 URL 为 `http://localhost:3000/#/mcp` 或对应自定义 Web 地址的 hash 路由。

### 配置解析
- [ ] 修改 `~/.ddo/config.yaml` 的 `endpoints.webUi` 为自定义地址后执行 `/web` - 预期结果: 打开的地址使用配置中的新地址。
- [ ] 删除或缺失 `config.yaml` 后执行 `/web` - 预期结果: 回退到 `http://localhost:3000`。

### 定时任务创建
- [ ] 执行 `/timer-add-interval 15 minutes "http://localhost:8080/callback" GET` - 预期结果: 生成 cron `*/15 * * * *` 并成功创建任务。
- [ ] 执行 `/timer-add-interval 2 hours "http://localhost:8080/callback" GET` - 预期结果: 生成 cron `0 */2 * * *` 并成功创建任务。
- [ ] 执行 `/timer-add-delay 30 minutes "http://localhost:8080/callback" GET` - 预期结果: CLI 明确提示当前后端接口不支持一次性延迟任务，并建议转到 `/timer-web`。

### Timer / MCP 交互文案
- [ ] 执行 `/timer-add` 进入交互式输入 - 预期结果: 字段提示显示“目标 URL”“请求方法”。
- [ ] 执行 `/mcp-add` 进入交互式输入 - 预期结果: 字段提示显示“连接配置”。
- [ ] 执行 `/timer-add` 并进入确认页 - 预期结果: 摘要文案显示“调度表达式”“目标URL”“请求方法”。
- [ ] 执行 `/mcp-add` 并进入确认页 - 预期结果: 摘要文案显示“连接配置”。

## 边界情况测试

- [ ] Web UI 未启动时执行 `/status-web` - 预期结果: 即使浏览器无法成功加载页面，CLI 仍输出可手工访问的 URL。
- [ ] Windows 环境执行 `/web` - 预期结果: `cmd /c start` 能正常拉起默认浏览器，不阻塞 REPL。
- [ ] 路由带前导 `/` 与不带前导 `/` 的调用 - 预期结果: URL 拼接结果一致且无重复斜杠，并采用 `/#/path` 形式。
- [ ] 执行 `/timer-add-interval 60 minutes ...` - 预期结果: CLI 提示分钟间隔超出支持范围。
- [ ] 执行 `/timer-add-interval 0 hours ...` - 预期结果: CLI 提示必须输入大于 0 的整数。

## 回归测试

- [ ] 确认 `/status`、`/timer`、`/mcp` 原有命令仍可正常执行。
- [ ] 确认 `/help` 中新增命令被正确分组显示在“交互”区域。
- [ ] 确认 `/timer-help` 中新增 `timer-add-interval` 与 `timer-add-delay` 示例可见。
- [ ] 确认 REPL 启动、命令注册、参数采集逻辑未因新增命令而中断。

## 接口联调参考

### 读取状态接口
```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/metrics
```

### 定时任务接口
```bash
curl http://localhost:8080/api/v1/timers
curl -X POST http://localhost:8080/api/v1/timers ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"test timer\",\"cron_expr\":\"0 * * * *\",\"callback_url\":\"https://example.com\",\"callback_method\":\"GET\"}"
```

### MCP 接口
```bash
curl http://localhost:8080/api/v1/mcps
curl -X POST http://localhost:8080/api/v1/mcps ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"demo-mcp\",\"type\":\"http\",\"url\":\"http://localhost:3001/mcp\"}"
```

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-20 | 待验证 | ⏳ | 等待你在本地 REPL 中验证 |
