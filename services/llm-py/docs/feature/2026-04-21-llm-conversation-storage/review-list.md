# LLM 对话记录存储与趋势统计 - 功能测试清单

**创建时间**: 2026-04-21 17:45:00  
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| 数据库初始化 | 单元测试 | 高 | ⏳ 待验证 |
| Conversation 模型 CRUD | 单元测试 | 高 | ⏳ 待验证 |
| Message 模型 CRUD | 单元测试 | 高 | ⏳ 待验证 |
| Chat API 自动存储 | 集成测试 | 高 | ⏳ 待验证 |
| Stream API 自动存储 | 集成测试 | 高 | ⏳ 待验证 |
| 统计概览接口 | 集成测试 | 高 | ⏳ 待验证 |
| 趋势数据接口 | 集成测试 | 高 | ⏳ 待验证 |
| 模型分布接口 | 集成测试 | 中 | ⏳ 待验证 |
| Dashboard 数据展示 | 手动验证 | 高 | ⏳ 待验证 |

## 功能验证清单

### 数据库层
- [ ] SQLite 数据库文件在 `~/.ddo/data/llm/conversations.db` 创建
- [ ] 启动时自动创建表结构
- [ ] WAL 模式正常工作

### Chat API 存储
- [ ] POST `/api/chat/completions` 自动创建 conversation
- [ ] 返回的响应包含 `conversation_id`
- [ ] 用户消息被正确存储
- [ ] 助手响应被正确存储
- [ ] latency_ms 正确记录

### Stream API 存储
- [ ] POST `/api/chat/completions/stream` 自动创建 conversation
- [ ] 响应头 `X-Conversation-ID` 包含 conversation ID
- [ ] 流结束后完整响应被存储

### 对话管理 API
- [ ] GET `/api/conversations` 返回分页列表
- [ ] GET `/api/conversations?session_id=xxx` 支持按 session 筛选
- [ ] GET `/api/conversations?start_date=2026-04-01` 支持日期筛选
- [ ] GET `/api/conversations/{id}` 返回详情（含消息）
- [ ] GET `/api/conversations/{id}/messages` 返回消息分页
- [ ] DELETE `/api/conversations/{id}` 删除成功

### 统计 API
- [ ] GET `/api/stats/overview` 返回今日/本周/本月统计
- [ ] GET `/api/stats/trend?days=7` 返回 7 天趋势
- [ ] GET `/api/stats/trend?group_by=week` 按周聚合
- [ ] GET `/api/stats/models` 返回模型分布

## 边界情况测试

- [ ] 数据库初始化失败时服务仍可启动（降级模式）
- [ ] 并发请求下 conversation 创建不重复
- [ ] 空数据库时统计接口返回零值而非错误
- [ ] 传入无效的 conversation_id 时正确处理

## 回归测试

- [ ] 现有 Chat API 功能未破坏
- [ ] 现有 Stream API 功能未破坏
- [ ] 其他 API (nlp/rag/analyze) 正常工作

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| | | | |

## API 测试命令

```bash
# 1. 启动 llm-py 服务
# cd services/llm-py && python main.py

# 2. 测试 Chat API 并存储
 curl -X POST http://localhost:8000/api/chat/completions \
   -H "Content-Type: application/json" \
   -d '{
     "messages": [{"role": "user", "content": "Hello"}],
     "conversation_id": "",
     "session_id": "test-session"
   }'

# 3. 查看对话列表
curl http://localhost:8000/api/conversations

# 4. 查看统计概览
curl http://localhost:8000/api/stats/overview

# 5. 查看趋势
curl "http://localhost:8000/api/stats/trend?days=7"
```
