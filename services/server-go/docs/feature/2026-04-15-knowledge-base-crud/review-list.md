# 知识库 CRUD 与 RAG 代理 - 功能测试清单

**创建时间**: 2026-04-15 19:30:00  
**技术方案**: [技术方案.md](技术方案.md)

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| Repository 层 CRUD 操作 | 单元测试 | 高 | ⏳ 待验证 |
| UseCase 层业务逻辑 | 单元测试 | 高 | ⏳ 待验证 |
| RAG 代理服务 HTTP 调用 | Mock 测试 | 高 | ⏳ 待验证 |
| 与 llm-py 真实接口联调 | 集成测试 | 高 | ⏳ 待验证 |
| REST API 端点验证 | 接口测试 | 高 | ⏳ 待验证 |
| 并发查询下的响应时间 | 性能测试 | 中 | ⏳ 待验证 |

## 功能验证清单

### 1. 知识条目 CRUD 接口

#### 1.1 创建知识条目 (POST /api/v1/knowledge)
- [ ] 正常创建：带完整参数创建成功，返回 UUID 和 embedding_id
- [ ] 必填验证：title 为空时返回 400 错误
- [ ] 可选字段：content 为空时也能创建成功
- [ ] 标签存储：tags 数组正确序列化存储到 MySQL
- [ ] RAG 嵌入：创建成功后调用 llm-py 生成向量
- [ ] RAG 失败处理：llm-py 不可用时知识仍能创建，embedding_id 为空

#### 1.2 查询知识列表 (GET /api/v1/knowledge)
- [ ] 正常查询：返回分页列表，包含 total 和 items
- [ ] 分类筛选：category 参数正确过滤
- [ ] 标签筛选：tag 参数正确过滤
- [ ] 关键词搜索：keyword 参数在 title 和 content 中搜索
- [ ] 分页参数：page 和 page_size 参数正常工作
- [ ] 默认值：page 默认为 1，page_size 默认为 20
- [ ] 返回值：标签正确反序列化为数组

#### 1.3 获取知识详情 (GET /api/v1/knowledge/:uuid)
- [ ] 正常获取：返回完整的知识详情，包含 content
- [ ] UUID 不存在：返回 404 错误
- [ ] UUID 为空：返回 400 错误
- [ ] 时间格式：created_at 和 updated_at 为 ISO8601 格式

#### 1.4 删除知识条目 (POST /api/v1/knowledge/:uuid/delete)
- [ ] 正常删除：返回 success: true
- [ ] UUID 不存在：返回错误
- [ ] 软删除验证：数据库中 status 变为 deleted，数据仍在

### 2. RAG 代理接口

#### 2.1 语义搜索 (GET /api/v1/knowledge/search)
- [ ] 正常搜索：返回搜索结果列表，包含 score
- [ ] 必填验证：q 参数为空时返回 400 错误
- [ ] limit 参数：限制返回结果数量，默认 5
- [ ] 元数据补充：返回结果包含 MySQL 中的 title, category
- [ ] llm-py 失败：llm-py 不可用时返回 500 错误

#### 2.2 RAG 问答 (POST /api/v1/knowledge/ask)
- [ ] 正常问答：返回答案和相关来源
- [ ] 必填验证：question 为空时返回 400 错误
- [ ] context_limit：控制检索文档数量，默认 3
- [ ] 搜索失败：向量搜索失败仍可继续问答（无上下文）
- [ ] llm-py 失败：llm-py 不可用时返回 500 错误

## 边界情况测试

- [ ] 超长标题/内容：数据库字段长度限制处理
- [ ] 特殊字符：title/content 包含特殊字符的处理
- [ ] 大量标签：tags 数组包含大量标签的存储
- [ ] 并发创建：多个请求同时创建知识的处理
- [ ] 数据库断开：MySQL 连接断开时的错误处理
- [ ] llm-py 超时：RAG 代理超时处理

## 回归测试

- [ ] 健康检查接口 (/health) 正常工作
- [ ] 原有中间件（CORS、日志、恢复）正常工作
- [ ] 数据库迁移自动执行，不报错
- [ ] 消息队列启动和关闭正常

## 配置验证

- [ ] DDO_LLM_HOST 环境变量可配置 llm-py 地址
- [ ] 默认 llm-py 地址为 http://localhost:8000
- [ ] 数据库配置通过配置文件加载

## 已知问题

| 问题描述 | 严重程度 | 状态 | 备注 |
|----------|----------|------|------|
| - | - | - | - |

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-15 | AI | ✅ 编码完成 | 待人工验证 |

---

**验证步骤**:
1. 启动服务: `cd services/server-go && go run cmd/server/main.go`
2. 测试健康检查: `curl http://localhost:8080/health`
3. 测试创建知识: `curl -X POST http://localhost:8080/api/v1/knowledge -H "Content-Type: application/json" -d '{"title":"Test","content":"Test content"}'`
4. 检查各功能点执行情况
