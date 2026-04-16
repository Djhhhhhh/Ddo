# Timer API 功能测试清单

> 文档生成时间：2026-04-16
> API 基础地址：`http://localhost:8080/api/v1`

---

## 1. 创建定时任务

### 1.1 创建每分钟执行的定时任务
```bash
curl -X POST http://localhost:8080/api/v1/timers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每分钟健康检查",
    "description": "每分钟调用一次健康检查接口",
    "cron_expr": "*/1 * * * *",
    "timezone": "Asia/Shanghai",
    "callback_url": "http://localhost:8080/health",
    "callback_method": "GET",
    "callback_headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "timer-test"
    }
  }'
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uuid": "cb387601-9eec-4a2d-98f1-3eefd7f3601b",
    "name": "每分钟健康检查",
    "status": "active",
    "next_run_at": "2026-04-16T14:30:00+08:00"
  },
  "timestamp": "2026-04-16T14:29:00.123456789+08:00"
}
```

### 1.2 创建带 Body 的 POST 定时任务
```bash
curl -X POST http://localhost:8080/api/v1/timers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每日数据同步",
    "description": "每天凌晨2点同步数据",
    "cron_expr": "0 2 * * *",
    "timezone": "Asia/Shanghai",
    "callback_url": "http://localhost:8080/api/v1/webhook/sync",
    "callback_method": "POST",
    "callback_headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer your-token-here"
    },
    "callback_body": "{\"action\": \"sync\", \"target\": \"all\"}"
  }'
```

### 1.3 错误案例 - 缺少必填字段
```bash
curl -X POST http://localhost:8080/api/v1/timers \
  -H "Content-Type: application/json" \
  -d '{
    "description": "缺少 name 和 cron_expr"
  }'
```

**预期响应：**
```json
{
  "code": 400,
  "message": "invalid request: ...",
  "data": null
}
```

### 1.4 错误案例 - 无效的 Cron 表达式
```bash
curl -X POST http://localhost:8080/api/v1/timers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "无效任务",
    "cron_expr": "invalid-cron",
    "callback_url": "http://localhost:8080/health"
  }'
```

---

## 2. 查询定时任务列表

### 2.1 查询所有定时任务（分页）
```bash
curl -X GET "http://localhost:8080/api/v1/timers?page=1&page_size=20"
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 5,
    "items": [
      {
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "name": "每分钟健康检查",
        "description": "每分钟调用一次健康检查接口",
        "cron_expr": "*/1 * * * *",
        "timezone": "Asia/Shanghai",
        "status": "active",
        "last_run_at": "2026-04-16T14:29:00+08:00",
        "next_run_at": "2026-04-16T14:30:00+08:00"
      }
    ]
  },
  "timestamp": "2026-04-16T14:29:30.123456789+08:00"
}
```

### 2.2 按状态查询 - 活跃任务
```bash
curl -X GET "http://localhost:8080/api/v1/timers?status=active"
```

### 2.3 按状态查询 - 已暂停任务
```bash
curl -X GET "http://localhost:8080/api/v1/timers?status=paused"
```

---

## 3. 获取定时任务详情

### 3.1 获取单个任务详情
```bash
curl -X GET http://localhost:8080/api/v1/timers/{uuid}
```

**替换 `{uuid}` 为实际的任务 UUID，例如：**
```bash
curl -X GET http://localhost:8080/api/v1/timers/550e8400-e29b-41d4-a716-446655440000
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "timer": {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "每分钟健康检查",
      "description": "每分钟调用一次健康检查接口",
      "cron_expr": "*/1 * * * *",
      "timezone": "Asia/Shanghai",
      "callback_url": "http://localhost:8080/health",
      "callback_method": "GET",
      "callback_headers": "{\"Content-Type\":\"application/json\",\"X-Custom-Header\":\"timer-test\"}",
      "callback_body": "",
      "status": "active",
      "last_run_at": "2026-04-16T14:29:00+08:00",
      "next_run_at": "2026-04-16T14:30:00+08:00",
      "stats": {
        "total_runs": 10,
        "success_rate": 100.0,
        "avg_duration_ms": 15,
        "last_status": "success"
      },
      "created_at": "2026-04-16T14:00:00+08:00",
      "updated_at": "2026-04-16T14:29:00+08:00"
    }
  },
  "timestamp": "2026-04-16T14:29:30.123456789+08:00"
}
```

### 3.2 获取不存在的任务
```bash
curl -X GET http://localhost:8080/api/v1/timers/invalid-uuid
```

**预期响应：**
```json
{
  "code": 404,
  "message": "timer not found: invalid-uuid",
  "data": null
}
```

---

## 4. 更新定时任务

### 4.1 更新任务配置
```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/update \
  -H "Content-Type: application/json" \
  -d '{
    "name": "每分钟健康检查（更新后）",
    "description": "更新后的描述信息",
    "cron_expr": "*/2 * * * *",
    "timezone": "Asia/Shanghai",
    "callback_url": "http://localhost:8080/api/v1/health",
    "callback_method": "POST",
    "callback_headers": {
      "Content-Type": "application/json"
    },
    "callback_body": "{\"check\": true}"
  }'
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "每分钟健康检查（更新后）",
    "status": "active"
  },
  "timestamp": "2026-04-16T14:30:00.123456789+08:00"
}
```

### 4.2 部分更新（只改名称）
```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/update \
  -H "Content-Type: application/json" \
  -d '{
    "name": "仅更新名称"
  }'
```

---

## 5. 暂停定时任务

```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/pause
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "status": "paused"
  },
  "timestamp": "2026-04-16T14:31:00.123456789+08:00"
}
```

---

## 6. 恢复定时任务

```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/resume
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active"
  },
  "timestamp": "2026-04-16T14:32:00.123456789+08:00"
}
```

---

## 7. 删除定时任务

```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/delete
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true
  },
  "timestamp": "2026-04-16T14:33:00.123456789+08:00"
}
```

---

## 8. 手动触发定时任务

### 8.1 立即触发执行
```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/trigger
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "status": "triggered"
  },
  "timestamp": "2026-04-16T14:34:00.123456789+08:00"
}
```

**预期行为：**
- 任务会立即执行一次回调
- 执行结果会记录到日志中
- 不影响原有的调度计划

### 8.2 触发已删除的任务
```bash
curl -X POST http://localhost:8080/api/v1/timers/{deleted-uuid}/trigger
```

**预期响应：**
```json
{
  "code": 500,
  "message": "timer has been deleted",
  "data": null
}
```

---

## 9. 查询执行日志

### 9.1 查询任务的所有日志
```bash
curl -X GET "http://localhost:8080/api/v1/timers/{uuid}/logs?page=1&page_size=20"
```

**预期响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 15,
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "status": "success",
        "output": "{\"status\":\"ok\"}",
        "error": "",
        "duration": 12,
        "created_at": "2026-04-16T14:29:00+08:00"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "status": "failed",
        "output": "",
        "error": "HTTP error: 500 Internal Server Error",
        "duration": 3045,
        "created_at": "2026-04-16T14:28:00+08:00"
      }
    ]
  },
  "timestamp": "2026-04-16T14:34:30.123456789+08:00"
}
```

### 9.2 按状态过滤日志 - 成功
```bash
curl -X GET "http://localhost:8080/api/v1/timers/{uuid}/logs?status=success"
```

### 9.3 按状态过滤日志 - 失败
```bash
curl -X GET "http://localhost:8080/api/v1/timers/{uuid}/logs?status=failed"
```

---

## 10. 完整业务流程测试脚本

### 10.1 完整生命周期测试
```bash
#!/bin/bash

BASE_URL="http://localhost:8080/api/v1"

# 1. 创建定时任务
echo "=== 1. 创建定时任务 ==="
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/timers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试任务",
    "description": "测试完整生命周期",
    "cron_expr": "*/5 * * * *",
    "timezone": "Asia/Shanghai",
    "callback_url": "http://localhost:8080/health",
    "callback_method": "GET"
  }')
echo $CREATE_RESPONSE | jq .

# 提取 UUID
UUID=$(echo $CREATE_RESPONSE | jq -r '.data.uuid')
echo "Created timer UUID: $UUID"

# 2. 查询列表
echo ""
echo "=== 2. 查询定时任务列表 ==="
curl -s "${BASE_URL}/timers" | jq '.data.items | length'

# 3. 获取详情
echo ""
echo "=== 3. 获取任务详情 ==="
curl -s "${BASE_URL}/timers/${UUID}" | jq '.data.timer.name'

# 4. 手动触发
echo ""
echo "=== 4. 手动触发任务 ==="
curl -s -X POST "${BASE_URL}/timers/${UUID}/trigger" | jq '.data.status'

# 5. 暂停任务
echo ""
echo "=== 5. 暂停任务 ==="
curl -s -X POST "${BASE_URL}/timers/${UUID}/pause" | jq '.data.status'

# 6. 恢复任务
echo ""
echo "=== 6. 恢复任务 ==="
curl -s -X POST "${BASE_URL}/timers/${UUID}/resume" | jq '.data.status'

# 7. 查询日志
echo ""
echo "=== 7. 查询执行日志 ==="
curl -s "${BASE_URL}/timers/${UUID}/logs" | jq '.data.total'

# 8. 更新任务
echo ""
echo "=== 8. 更新任务 ==="
curl -s -X POST "${BASE_URL}/timers/${UUID}/update" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试任务（已更新）"}' | jq '.data.name'

# 9. 删除任务
echo ""
echo "=== 9. 删除任务 ==="
curl -s -X POST "${BASE_URL}/timers/${UUID}/delete" | jq '.data.success'

echo ""
echo "=== 测试完成 ==="
```

### 10.2 并发压力测试
```bash
#!/bin/bash

BASE_URL="http://localhost:8080/api/v1"

# 批量创建 10 个任务
echo "=== 批量创建任务 ==="
for i in {1..10}; do
  curl -s -X POST "${BASE_URL}/timers" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"压力测试任务-$i\",
      \"cron_expr\": \"*/$i * * * *\",
      \"callback_url\": \"http://localhost:8080/health\",
      \"callback_method\": \"GET\"
    }" > /dev/null &
done
wait
echo "10 个任务创建完成"

# 并行触发所有任务
echo ""
echo "=== 并行触发所有活跃任务 ==="
curl -s "${BASE_URL}/timers?status=active" | jq -r '.data.items[].uuid' | while read uuid; do
  curl -s -X POST "${BASE_URL}/timers/${uuid}/trigger" > /dev/null &
done
wait
echo "触发完成"
```

---

## 11. 执行日志说明

### 11.1 日志如何产生

执行日志在以下情况下会被记录：

1. **定时任务自动执行**：
   - Scheduler 按照 Cron 表达式触发任务
   - 消息被投递到队列
   - CallbackExecutor 消费消息并执行回调
   - 执行结果被记录到 timer_logs 表

2. **手动触发**：
   - 调用 `POST /timers/{uuid}/trigger`
   - 消息被投递到队列
   - CallbackExecutor 消费消息并执行回调
   - 执行结果被记录到 timer_logs 表

### 11.2 验证日志功能

#### 步骤 1：创建一个会成功的任务
```bash
# 创建任务（回调到本地健康检查接口）
curl -X POST http://localhost:8080/api/v1/timers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "日志测试-成功",
    "cron_expr": "*/1 * * * *",
    "callback_url": "http://localhost:8080/health",
    "callback_method": "GET"
  }'
```

#### 步骤 2：立即手动触发一次
```bash
curl -X POST http://localhost:8080/api/v1/timers/{uuid}/trigger
```

#### 步骤 3：等待 5-10 秒后查询日志
```bash
# 替换 {uuid} 为实际的任务 UUID
curl -X GET "http://localhost:8080/api/v1/timers/{uuid}/logs"
```

**预期应该能看到类似以下内容的日志：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1,
    "items": [
      {
        "id": "xxx",
        "status": "success",
        "output": "{\"status\":\"ok\"}",
        "error": "",
        "duration": 15,
        "created_at": "2026-04-16T14:30:00+08:00"
      }
    ]
  }
}
```

### 11.3 如果日志不产生，检查以下事项

1. **CallbackExecutor 是否启动**：
   - 检查启动日志是否有 "Callback executor started, subscribed to 'timer' topic"

2. **队列是否有消息**：
   - 检查 scheduler 是否正确投递消息到队列
   - 检查 badger queue 的数据目录是否有写权限

3. **MySQL 连接是否正常**：
   - 检查 timer_logs 表是否存在
   - 检查是否有写入权限

---

## 12. Cron 表达式参考

| Cron 表达式 | 说明 |
|------------|------|
| `*/1 * * * *` | 每分钟执行 |
| `*/5 * * * *` | 每 5 分钟执行 |
| `0 * * * *` | 每小时执行（整点）|
| `0 0 * * *` | 每天 0 点执行 |
| `0 2 * * *` | 每天凌晨 2 点执行 |
| `0 9 * * 1-5` | 工作日上午 9 点执行 |
| `0 0 * * 0` | 每周日 0 点执行 |
| `0 0 1 * *` | 每月 1 日 0 点执行 |
| `0 */6 * * *` | 每 6 小时执行 |

---

## 13. 测试检查清单

- [ ] 创建定时任务（正常情况）
- [ ] 创建定时任务（缺少必填参数）
- [ ] 创建定时任务（无效 Cron 表达式）
- [ ] 查询所有定时任务（分页）
- [ ] 按状态查询定时任务
- [ ] 获取定时任务详情（存在）
- [ ] 获取定时任务详情（不存在）
- [ ] 更新定时任务（完整更新）
- [ ] 更新定时任务（部分更新）
- [ ] 暂停定时任务
- [ ] 恢复定时任务
- [ ] 删除定时任务
- [ ] 手动触发定时任务（活跃状态）
- [ ] 手动触发定时任务（已删除）
- [ ] 查询执行日志（所有）
- [ ] 查询执行日志（按状态过滤）
- [ ] **手动触发后立即查询日志（关键验证）**
- [ ] 定时任务自动执行（等待 1 分钟验证）
- [ ] 回调失败时的错误日志记录
