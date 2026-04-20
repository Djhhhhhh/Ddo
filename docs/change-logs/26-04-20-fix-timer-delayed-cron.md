# 变更日志

**提交信息**: fix(timer): 修复定时任务 delayed 类型不触发的问题，优化 Cron 表达式说明

**分支**: main

**日期**: 2026-04-20

**作者**: Djhhh

## 变更文件
- services/server-go/internal/scheduler/scheduler.go (modified)
- services/server-go/internal/application/service/callback_executor.go (modified)
- services/server-go/cmd/server/wire_gen.go (modified)
- services/web-ui/src/views/Timer/TimerView.vue (modified)

## 统计
- 新增文件: 0
- 修改文件: 4
- 删除文件: 0
- 代码行数: +190 / -32

## 描述

### Bug 修复

1. **delayed 类型任务从未执行的问题**
   - 原因：Scheduler 对 delayed 类型任务只是记录日志后直接返回，没有将任务发布到队列
   - 修复：添加 publishDelayedJob 方法，在创建 delayed 类型任务时立即将延迟消息发布到队列

2. **delayed 类型任务执行后未暂停的问题**
   - 原因：delayed 是一次性任务，执行完成后应该自动暂停，但没有实现
   - 修复：CallbackExecutor 执行回调成功后，检查任务类型，如果是 delayed 则自动暂停

3. **periodic 类型使用错误字段的问题**
   - 修复：修正 IntervalSeconds 字段的使用

### 功能改进

1. **TimerPayload 添加 TriggerType 字段**
   - 用于在执行时区分任务类型

2. **前端 Cron 表达式说明优化**
   - 添加格式说明和实用示例
   - 新增 Every Minute、Every 5/15 Minutes 等预设
   - 调整默认值为 * * * * * 更直观

3. **前端任务类型说明优化**
   - Cron：定时调度，精确到分钟
   - Periodic：间隔重复，支持秒级精度
   - Delayed：一次性延迟，触发后自动暂停

4. **前端表单布局优化**
   - Cron 输入框从多行改为单行 5 列布局
   - 新增 delayed 类型预设选项
