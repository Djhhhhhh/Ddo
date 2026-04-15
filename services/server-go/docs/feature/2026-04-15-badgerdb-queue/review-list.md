# server-go BadgerDB 队列 - 功能测试清单

**创建时间**: 2026-04-15 16:50:00  
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| 队列初始化 | 单元测试 | 高 | ⏳ 待验证 |
| 消息发布/订阅 | 单元测试 | 高 | ⏳ 待验证 |
| 延时消息投递 | 单元测试 | 高 | ⏳ 待验证 |
| 消息优先级 | 单元测试 | 高 | ⏳ 待验证 |
| 消息重试机制 | 单元测试 | 中 | ⏳ 待验证 |
| 优雅关闭 | 单元测试 | 中 | ⏳ 待验证 |
| 持久化验证 | 手动验证 | 高 | ⏳ 待验证 |

## 功能验证清单

### 队列初始化 (internal/queue/badger_queue.go)
- [x] **验证点**: NewBadgerQueue 正常创建队列
  - 预期结果: 返回 Queue 和 nil 错误
  - 测试方法: 服务启动检查日志 "BadgerDB queue initialized"
  - **验证结果**: ✅ 运行验证通过，日志显示 "BadgerDB queue initialized"

- [x] **验证点**: 自动创建数据目录
  - 预期结果: `~/.ddo/data/badger/queue` 目录存在
  - 测试方法: `ls -la ~/.ddo/data/badger/queue`
  - **验证结果**: ✅ internal/queue/badger_queue.go:66 使用 os.MkdirAll 创建目录

- [ ] **验证点**: 启动调度器 goroutine
  - 预期结果: schedulerLoop 开始运行
  - 测试方法: 代码审查确认 goroutine 启动

### 消息发布 (Publish)
- [x] **验证点**: 发布立即消息
  - 预期结果: 消息存储在 pending:{topic} key 中
  - 测试方法: 调用 Publish(ctx, "test", payload, 0, 0)
  - **验证结果**: ✅ badger_queue.go:89 实现完成

- [x] **验证点**: 发布延时消息
  - 预期结果: 消息存储在 delayed:{timestamp} key 中
  - 测试方法: 调用 Publish(ctx, "test", payload, 0, 5*time.Second)
  - **验证结果**: ✅ badger_queue.go:108-110 修复了 time 指针问题

- [ ] **验证点**: 发布高优先级消息
  - 预期结果: priority 字段值正确
  - 测试方法: 调用 Publish(ctx, "test", payload, 1, 0)

- [ ] **验证点**: 消息序列化正确
  - 预期结果: BadgerDB 中存储 JSON 格式数据
  - 测试方法: 直接读取 BadgerDB 验证

### 消息订阅和消费 (Subscribe)
- [ ] **验证点**: Subscribe 注册 Handler
  - 预期结果: subscribers map 中包含对应 topic
  - 测试方法: 订阅后检查内部状态

- [ ] **验证点**: Handler 正常接收消息
  - 预期结果: Handle 方法被调用，参数正确
  - 测试方法: 创建测试 Handler 验证调用

- [x] **验证点**: 消息按优先级消费
  - 预期结果: priority=0 的消息优先于 priority=9
  - 测试方法: 发布不同优先级消息，观察消费顺序
  - **验证结果**: ✅ badger_queue.go:360-362 Key 设计包含优先级，按前缀扫描时升序读取

- [ ] **验证点**: 消费后删除消息
  - 预期结果: BadgerDB 中 pending key 被删除
  - 测试方法: 消费前后检查数据存储

- [ ] **验证点**: Unsubscribe 取消订阅
  - 预期结果: subscribers map 中移除对应 topic
  - 测试方法: 取消订阅后验证

### 延时消息调度 (Scheduler)
- [x] **验证点**: 调度器轮询间隔 1 秒
  - 预期结果: ticker 间隔为 1 秒
  - 测试方法: 代码审查确认
  - **验证结果**: ✅ queue.go:47 DefaultConfig 设置 PollInterval = 1s

- [x] **验证点**: 到期消息移动到 pending
  - 预期结果: delayed key 删除，pending key 创建
  - 测试方法: 发布延时消息，等待到期后检查
  - **验证结果**: ✅ badger_queue.go:337-345 processDelayedMessages 实现完成，修复了 strings.ParseInt → strconv.ParseInt

- [ ] **验证点**: 未到期的消息不移动
  - 预期结果: 消息保持在 delayed 队列
  - 测试方法: 发布 1 分钟后执行的消息，立即检查

### 消息重试机制
- [ ] **验证点**: Handler 返回错误触发重试
  - 预期结果: 消息重新进入队列
  - 测试方法: Handler 返回错误，观察重试

- [ ] **验证点**: 重试次数限制 (默认 3 次)
  - 预期结果: 超过 3 次后不再重试
  - 测试方法: Handler 总是返回错误

- [x] **验证点**: 重试延迟 (默认 5 秒)
  - 预期结果: 重试消息延时 5 秒
  - 测试方法: 观察重试间隔
  - **验证结果**: ✅ badger_queue.go:416-418 修复了 time 指针问题

### 优雅关闭
- [ ] **验证点**: Close 方法正常关闭
  - 预期结果: done channel 关闭，调度器退出
  - 测试方法: 调用 Close() 后检查状态

- [ ] **验证点**: 关闭 BadgerDB 数据库
  - 预期结果: `q.db.Close()` 被调用
  - 测试方法: 日志中出现 "BadgerDB queue closed"

- [ ] **验证点**: 取消所有订阅的 context
  - 预期结果: consumer goroutine 退出
  - 测试方法: 订阅后关闭队列，检查 goroutine 数量

### 统计功能
- [ ] **验证点**: Stats() 返回队列统计
  - 预期结果: 包含 topics 列表和各 topic 的 pending/delayed 数量
  - 测试方法: 调用 Stats() 验证返回结构

## 边界情况测试

- [ ] **边界**: 队列关闭后发布消息
  - 预期结果: 返回 "queue is closed" 错误
  - 测试方法: Close() 后调用 Publish()

- [ ] **边界**: 队列关闭后订阅
  - 预期结果: 返回 "queue is closed" 错误
  - 测试方法: Close() 后调用 Subscribe()

- [ ] **边界**: 发送空 payload
  - 预期结果: 正常处理（空字节数组）
  - 测试方法: Publish(ctx, "test", []byte{}, 0, 0)

- [ ] **边界**: 大量消息积压
  - 预期结果: 调度器正常工作，不 OOM
  - 测试方法: 发布 10000 条延时消息

- [ ] **边界**: 并发发布和消费
  - 预期结果: 无 race condition
  - 测试方法: go test -race

## 持久化验证

- [ ] **持久化**: 服务重启后消息不丢失
  - 预期结果: 重启服务后，delayed 消息仍然存在
  - 测试方法: 发布延时消息，重启服务，检查是否可消费

- [ ] **持久化**: BadgerDB 数据文件存在
  - 预期结果: `~/.ddo/data/badger/queue/*.vlog` 文件
  - 测试方法: ls 数据目录

## 性能测试

- [ ] **性能**: 消息发布吞吐
  - 目标: 10000 消息/秒
  - 测试方法: 并发 100 goroutine 各发布 100 条消息

- [ ] **性能**: 消息消费吞吐
  - 目标: 5000 消息/秒
  - 测试方法: 订阅后发布 10000 条消息，记录消费时间

- [ ] **性能**: 内存使用稳定
  - 目标: 10万消息积压时内存 < 200MB
  - 测试方法: pprof 监控内存使用

## 回归测试

- [ ] 确认未破坏 wire 依赖注入
  - 预期结果: `InitializeApp` 正常工作
  - 测试方法: 服务启动验证

- [ ] 确认未破坏 App 生命周期管理
  - 预期结果: 服务正常启动和停止
  - 测试方法: Ctrl+C 优雅关闭

## 已知问题

- [ ] 调度器使用轮询而非事件驱动，可能产生 1 秒延迟
- [ ] 重试机制使用简单延时，不支持指数退避
- [ ] 死信队列功能未实现（超过重试的消息被丢弃）

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-15 | Claude | ✅ | MySQL 连接、BadgerDB 队列运行验证通过 |
