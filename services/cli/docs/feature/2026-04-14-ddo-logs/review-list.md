# CLI: ddo logs 实现 - 功能测试清单

**创建时间**: 2026-04-14 18:00:00  
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| 查看 CLI 日志 | 集成测试 | 高 | ⏳ 待验证 |
| 指定行数参数 (-n) | 单元测试 | 高 | ⏳ 待验证 |
| 实时跟踪功能 (-f) | 集成测试 | 高 | ⏳ 待验证 |
| 时间过滤参数 (--since) | 单元测试 | 中 | ⏳ 待验证 |
| 级别过滤参数 (--level) | 单元测试 | 中 | ⏳ 待验证 |
| 查看所有服务日志 (all) | 集成测试 | 高 | ⏳ 待验证 |
| MySQL 容器日志 | 集成测试 | 高 | ⏳ 待验证 |
| 彩色高亮输出 | 手动验证 | 中 | ⏳ 待验证 |
| 错误服务名处理 | 单元测试 | 中 | ⏳ 待验证 |
| 不存在的日志文件 | 边界测试 | 中 | ⏳ 待验证 |
| 日志文件轮转 | 边界测试 | 低 | ⏳ 待验证 |
| Ctrl+C 退出跟踪模式 | 手动验证 | 高 | ⏳ 待验证 |

## 功能验证清单

### 1. 基础功能
- [ ] `ddo logs` - 预期结果: 显示 CLI 日志最后 100 行
- [ ] `ddo logs cli` - 预期结果: 显示 CLI 日志最后 100 行
- [ ] `ddo logs server-go` - 预期结果: 显示 server-go 日志
- [ ] `ddo logs llm-py` - 预期结果: 显示 llm-py 日志
- [ ] `ddo logs web-ui` - 预期结果: 显示 web-ui 日志
- [ ] `ddo logs mysql` - 预期结果: 显示 MySQL 容器日志
- [ ] `ddo logs all` - 预期结果: 显示所有服务日志（带服务前缀）

### 2. 行数参数 (-n, --lines)
- [ ] `ddo logs -n 20` - 预期结果: 显示最后 20 行
- [ ] `ddo logs --lines 50` - 预期结果: 显示最后 50 行
- [ ] `ddo logs cli -n 5` - 预期结果: 显示 CLI 日志最后 5 行

### 3. 实时跟踪 (-f, --follow)
- [ ] `ddo logs -f` - 预期结果: 实时跟踪 CLI 日志，显示提示信息
- [ ] `ddo logs server-go -f` - 预期结果: 实时跟踪 server-go 日志
- [ ] `ddo logs mysql -f` - 预期结果: 实时跟踪 MySQL 容器日志
- [ ] 按 Ctrl+C - 预期结果: 优雅退出跟踪模式

### 4. 时间过滤 (--since)
- [ ] `ddo logs --since 1h` - 预期结果: 显示过去 1 小时的日志
- [ ] `ddo logs --since 30m` - 预期结果: 显示过去 30 分钟的日志
- [ ] `ddo logs --since 1d` - 预期结果: 显示过去 1 天的日志
- [ ] `ddo logs --since 2026-04-13` - 预期结果: 显示指定日期之后的日志

### 5. 级别过滤 (--level)
- [ ] `ddo logs --level ERROR` - 预期结果: 只显示 ERROR 级别日志
- [ ] `ddo logs --level WARN` - 预期结果: 显示 WARN 及以上级别
- [ ] `ddo logs --level INFO` - 预期结果: 显示 INFO 及以上级别
- [ ] `ddo logs --level DEBUG` - 预期结果: 显示所有级别日志

### 6. 组合参数
- [ ] `ddo logs -n 50 -f` - 预期结果: 显示最后 50 行并继续跟踪
- [ ] `ddo logs --since 1h --level ERROR` - 预期结果: 过去 1 小时的 ERROR 日志

### 7. 彩色高亮
- [ ] ERROR 日志 - 预期结果: 显示为红色
- [ ] WARN 日志 - 预期结果: 显示为黄色
- [ ] INFO 日志 - 预期结果: 显示为青色
- [ ] DEBUG 日志 - 预期结果: 显示为灰色

## 边界情况测试

- [ ] 无效服务名: `ddo logs invalid-service` - 预期结果: 提示未知服务，列出支持的服务
- [ ] 无效日志级别: `ddo logs --level INVALID` - 预期结果: 提示无效级别
- [ ] 不存在的日志文件 - 预期结果: 友好提示，说明服务可能未启动
- [ ] 空日志文件 - 预期结果: 显示 "（无日志内容）"
- [ ] 非数字行数: `ddo logs -n abc` - 预期结果: 使用默认值 100

## 回归测试

- [ ] `ddo init` 正常工作
- [ ] `ddo start` 正常工作
- [ ] `ddo stop` 正常工作
- [ ] `ddo status` 正常工作
- [ ] TypeScript 编译无错误

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-14 | | ⏳ | 待验证 |

## 编译测试

```bash
# 在项目根目录执行
cd services/cli
npm run build
```

**预期结果**:
- TypeScript 编译成功
- 无错误或警告
- 生成 dist/commands/logs.js 和 dist/utils/log-reader.js

## 已知问题

暂无
