# 定时任务触发 Web 灵动岛通知 - 功能测试清单

**创建时间**: 2026-04-20 23:15:00  
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| Notification 模型数据库迁移 | 集成测试 | 高 | ⏳ 待验证 |
| NotificationService 创建通知 | 单元测试 | 高 | ⏳ 待验证 |
| NotificationService 查询未读通知 | 单元测试 | 高 | ⏳ 待验证 |
| NotificationService 标记已读 | 单元测试 | 中 | ⏳ 待验证 |
| GET /api/v1/notifications/subscribe 接口 | 集成测试 | 高 | ⏳ 待验证 |
| POST /api/v1/notifications/:id/read 接口 | 集成测试 | 中 | ⏳ 待验证 |
| 定时任务执行后发送通知 | 集成测试 | 高 | ⏳ 待验证 |
| 通知过期清理 | 单元测试 | 中 | ⏳ 待验证 |
| Electron 轮询获取通知 | 前端测试 | 高 | ⏳ 待验证 |
| 灵动岛显示不同 level 通知 | 前端测试 | 高 | ⏳ 待验证 |

## 功能验证清单

### Notification 模型
- [ ] 数据库表 `notifications` 成功创建
- [ ] `BeforeCreate` 钩子正确生成 ID 和过期时间
- [ ] `IsExpired()` 方法正确判断过期状态

### NotificationService
- [ ] `AddNotification()` 正确创建通知记录
- [ ] `GetUnreadNotifications()` 只返回未读且未过期的通知
- [ ] `MarkAsRead()` 正确标记单条通知为已读
- [ ] `MarkMultipleAsRead()` 批量标记通知为已读
- [ ] `CleanupExpired()` 正确清理过期通知
- [ ] `CreateTimerNotification()` 根据状态设置正确的 level:
  - `started` → `normal`
  - `completed` → `important`
  - `failed` → `urgent`

### HTTP 接口

#### GET /api/v1/notifications/subscribe
- [ ] 正确返回未读通知列表
- [ ] 自动将返回的通知标记为已读
- [ ] 无通知时返回空数组

```bash
curl -X GET http://localhost:8080/api/v1/notifications/subscribe
```

#### POST /api/v1/notifications/:id/read
- [ ] 正确标记指定 ID 的通知为已读
- [ ] 无效 ID 返回 400 错误
- [ ] 内部错误返回 500

```bash
curl -X POST http://localhost:8080/api/v1/notifications/{id}/read
```

### 定时任务集成
- [ ] 任务执行成功时发送 `completed` 通知 (level: important)
- [ ] 任务执行失败时发送 `failed` 通知 (level: urgent)
- [ ] 通知 body 包含执行耗时信息

### Electron 端
- [ ] 轮询 `/api/v1/notifications/subscribe` 正确获取通知
- [ ] 根据通知 level 调用正确的显示方式:
  - `normal` → 系统通知
  - `important` → 灵动岛
  - `urgent` → 灵动岛 + 系统通知

## 边界情况测试

- [ ] 通知服务为 nil 时，CallbackExecutor 不崩溃
- [ ] 数据库连接失败时，通知功能优雅降级
- [ ] 大量通知时，轮询接口性能正常
- [ ] 通知过期后不再返回给前端

## 回归测试

- [ ] 定时任务原有功能不受影响（创建、暂停、恢复、删除、触发）
- [ ] 回调执行器正常执行 HTTP 请求
- [ ] 执行日志正常记录

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-20 | - | ⏳ | 开发完成，待验证 |

## 已知问题

- [ ] 待补充
