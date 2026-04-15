# RAG Embedder - 功能测试清单

**创建时间**: 2026-04-15 16:20:00  
**技术方案**: [技术方案.md](技术方案.md)  
**任务ID**: p2-7

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| EmbedderService.embed_documents() 正常批量嵌入 | 单元测试 | 高 | ⏳ 待验证 |
| EmbedderService.embed_documents() 空文档列表处理 | 单元测试 | 高 | ⏳ 待验证 |
| EmbedderService.embed_documents() 元数据验证 | 单元测试 | 高 | ⏳ 待验证 |
| InMemoryDocumentStore CRUD 操作 | 单元测试 | 中 | ⏳ 待验证 |
| 配置加载 - 从环境变量读取 embedding_model | 单元测试 | 中 | ⏳ 待验证 |
| POST /api/rag/embed 有效请求返回 200 | 集成测试 | 高 | ⏳ 待验证 |
| POST /api/rag/embed 空文档返回 400 | 集成测试 | 高 | ⏳ 待验证 |
| POST /api/rag/embed 元数据长度不匹配返回 400 | 集成测试 | 高 | ⏳ 待验证 |
| Embedding API 错误处理 - 模拟网络失败返回 503 | 集成测试 | 中 | ⏳ 待验证 |
| API 限流处理 - 模拟 429 响应 | 集成测试 | 中 | ⏳ 待验证 |
| 手动验证服务启动和 API 调用 | 手动验证 | 高 | ⏳ 待验证 |

## 功能验证清单

### Embedder Service
- [ ] `get_embedder_service()` 返回单例实例
- [ ] `embed_documents()` 成功生成 embedding 向量
- [ ] `embed_documents()` 生成的向量维度与配置一致 (默认 1536)
- [ ] `embed_documents()` 每条文档生成唯一 UUID
- [ ] `embed_documents()` 元数据正确保存到 DocumentEmbedding
- [ ] `embed_query()` 成功返回单条查询向量
- [ ] 批处理功能正确分批 (batch_size=100)
- [ ] 日志输出包含 `[embedder_start]`, `[embedder_success]`

### Document Store
- [ ] `add()` 可以添加文档并获得 ID
- [ ] `get()` 可以按 ID 检索文档
- [ ] `delete()` 可以删除文档
- [ ] `list_all()` 支持分页 (skip, limit)
- [ ] `count()` 返回正确数量
- [ ] `similarity_search()` 返回按相似度排序的结果

### API 端点
- [ ] POST /api/rag/embed - 正常请求返回 200 和 document_ids
- [ ] POST /api/rag/embed - 响应格式符合 EmbedResponse 模型
- [ ] POST /api/rag/embed - 错误时返回正确 HTTP 状态码
- [ ] API 日志记录包含 `[embed_api_success]` 或 `[embed_api_error]`

### 配置
- [ ] `rag_embedding_model` 默认值为 "openai/text-embedding-3-small"
- [ ] `rag_embedding_batch_size` 默认值为 100
- [ ] `rag_embedding_dimensions` 默认值为 1536
- [ ] 支持通过环境变量覆盖配置

## 边界情况测试

- [ ] 单条文档嵌入 (长度: 1)
- [ ] 大量文档嵌入 (长度: > batch_size)
- [ ] 超长文本嵌入 (chars > 8000)
- [ ] 空字符串嵌入
- [ ] 特殊字符和 Unicode 文本嵌入
- [ ] 元数据为空列表
- [ ] 元数据为 None
- [ ] 并发请求处理

## 回归测试

- [ ] /api/chat/completions 接口正常工作
- [ ] /api/nlp/intent 接口正常工作
- [ ] /api/health 健康检查接口正常工作
- [ ] 服务启动无错误

## 手动验证步骤

1. **启动服务**:
   ```bash
   cd services/llm-py
   python -m app.main
   ```

2. **测试正常嵌入**:
   ```bash
   curl -X POST http://localhost:8000/api/rag/embed \
     -H "Content-Type: application/json" \
     -d '{"documents": ["Hello world", "This is a test document"]}'
   ```
   预期: 返回 200，包含 document_ids 和 embeddings_count: 2

3. **测试带元数据**:
   ```bash
   curl -X POST http://localhost:8000/api/rag/embed \
     -H "Content-Type: application/json" \
     -d '{"documents": ["Doc 1", "Doc 2"], "metadata": [{"source": "test"}, {"source": "test2"}]}'
   ```
   预期: 返回 200，document_ids 长度为 2

4. **测试空文档**:
   ```bash
   curl -X POST http://localhost:8000/api/rag/embed \
     -H "Content-Type: application/json" \
     -d '{"documents": []}'
   ```
   预期: 返回 400，"Documents list cannot be empty"

5. **测试元数据长度不匹配**:
   ```bash
   curl -X POST http://localhost:8000/api/rag/embed \
     -H "Content-Type: application/json" \
     -d '{"documents": ["Doc 1", "Doc 2"], "metadata": [{"source": "test"}]}'
   ```
   预期: 返回 400，"Metadata length (1) must match documents length (2)"

6. **检查日志**:
   预期日志中包含:
   - `[embedder_init] model=... batch_size=... dimensions=...`
   - `[embedder_start] documents=N batch_size=100`
   - `[embedder_success] documents=N duration_ms=X stored=N`

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-15 | - | ⏳ | 待验证 |

---

## 已知问题

| 问题 | 状态 | 备注 |
|------|------|------|
| 暂无 | - | - |

## 后续任务依赖

- **p2-8 Retriever**: 需要 DocumentStore 接口正常
- **p2-9 Generator**: 需要 Embedder 服务正常
