# LLM 统计 API 代理 - 功能测试清单

**创建时间**: 2026-04-21 18:40:00  
**服务**: server-go  
**功能**: Dashboard LLM 统计 API 代理

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| GetOverview 用例 | 单元测试 | 高 | ⏳ 待验证 |
| GetTrend 用例 | 单元测试 | 高 | ⏳ 待验证 |
| ListConversations 用例 | 单元测试 | 高 | ⏳ 待验证 |
| LLMStatsHandler | 集成测试 | 高 | ⏳ 待验证 |
| 路由注册 | 集成测试 | 高 | ⏳ 待验证 |
| llm-py 连接 | 集成测试 | 高 | ⏳ 待验证 |
| Dashboard API 端到端 | 手动测试 | 高 | ⏳ 待验证 |

## API 端点清单

| 方法 | 路径 | Handler | 说明 |
|------|------|---------|------|
| GET | `/api/v1/llm/stats/overview` | GetOverview | 概览统计 |
| GET | `/api/v1/llm/stats/trend` | GetTrend | 趋势数据 |
| GET | `/api/v1/llm/conversations` | ListConversations | 对话列表 |

### 查询参数

**GET /api/v1/llm/stats/trend**
- `days`: 天数 (默认 7, 范围 1-90)
- `group_by`: 聚合方式 (day/week/month, 默认 day)

**GET /api/v1/llm/conversations**
- `page`: 页码 (默认 1)
- `page_size`: 每页数量 (默认 20, 最大 100)
- `session_id`: 按 session 筛选
- `source`: 按来源筛选 (api/cli/web)

## 功能验证清单

### 编译与启动
- [ ] `make build` 编译成功
- [ ] `make run` 启动成功
- [ ] 无 panic 或初始化错误

### API 响应格式
- [ ] 成功响应: `{"code": 0, "message": "ok", "data": {...}}`
- [ ] 错误响应: `{"code": 500, "message": "..."}`

### GetOverview
- [ ] 返回今日统计数据
- [ ] 返回本周统计数据
- [ ] 返回本月统计数据
- [ ] llm-py 不可用时返回 500 错误

### GetTrend
- [ ] 默认返回 7 天趋势
- [ ] `days=30` 返回 30 天数据
- [ ] `group_by=week` 按周聚合
- [ ] `group_by=month` 按月聚合
- [ ] 无效参数使用默认值

### ListConversations
- [ ] 返回分页列表
- [ ] `page_size` 限制生效
- [ ] `session_id` 筛选生效
- [ ] `source` 筛选生效

### llm-py 代理
- [ ] 正确转发请求到 llm-py
- [ ] 正确解析 llm-py 响应
- [ ] llm-py 返回错误时正确处理

## 测试命令

```bash
# 1. 编译
cd services/server-go
make build

# 2. 启动（确保 llm-py 已启动）
make run

# 3. 测试 API
curl http://localhost:8080/api/v1/llm/stats/overview

curl "http://localhost:8080/api/v1/llm/stats/trend?days=7"

curl "http://localhost:8080/api/v1/llm/conversations?page=1&page_size=10"
```

## 依赖服务

| 服务 | 地址 | 状态 |
|------|------|------|
| llm-py | http://localhost:8000 | 必须先启动 |

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| | | | |

## 回归测试

- [ ] 现有 API 正常工作
- [ ] Health check 正常
- [ ] Metrics 接口正常
