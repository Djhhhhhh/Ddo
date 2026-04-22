# RAG Engine: Retriever + Generator - 功能测试清单

**创建时间**: 2026-04-15 23:30:00  
**技术方案**: [技术方案.md](技术方案.md)  
**任务**: p2-8 (Retriever) + p2-9 (Generator)

## 前置准备

1. **启动服务**: `python main.py` 或 `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
2. **检查日志**: 观察日志输出，确认 ChromaDB 或 FAISS 初始化成功
3. **设置环境变量** (必须):
   ```cmd
   set DDO_OPENROUTER_API_KEY=your_key
   set DDO_LLM_RAG_MODEL=qwen/qwen3-embedding-8b  (或 openai/text-embedding-3-small)
   set RAG_VECTOR_STORE=chroma
   ```
   
   **注意**: 如果不设置 `DDO_LLM_RAG_MODEL`，embedder 会尝试使用 `DDO_LLM_MODEL` 或默认模型。
   但大多数 LLM 模型不支持 embeddings，需要明确指定支持 embedding 的模型。

---

## 完整功能测试步骤

### Phase 1: 基础健康检查

#### 1.1 健康检查
```cmd
curl -X GET http://127.0.0.1:8000/health
```
- **预期结果**: 返回 `{"status":"ok","version":"0.1.0","openrouter_connected":true/false}`
- **验证点**: 服务正常启动，包含 openrouter_connected 状态

---

### Phase 2: RAG 嵌入功能 (p2-7 回归)

#### 2.1 嵌入文档
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/embed -H "Content-Type: application/json" -d "{\"documents\":[\"RAG stands for Retrieval-Augmented Generation. It combines retrieval systems with LLMs.\",\"OpenRouter provides unified access to many LLMs through a single API.\",\"Vector databases store embeddings for semantic search.\"],\"metadata\":[{\"source\":\"tutorial\",\"topic\":\"rag\"},{\"source\":\"tutorial\",\"topic\":\"openrouter\"},{\"source\":\"tutorial\",\"topic\":\"vector_db\"}]}"
```
- **预期结果**: 返回 `{"document_ids":["...","...","..."],"embeddings_count":3}`
- **验证点**: 文档 ID 列表，数量正确

#### 2.2 嵌入空文档（边界测试）
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/embed -H "Content-Type: application/json" -d "{\"documents\":[]}" -w "\nHTTP Status: %{http_code}\n"
```
- **预期结果**: HTTP 400，返回错误信息 `{"detail":"Documents list cannot be empty"}`
- **验证点**: 正确错误处理

---

### Phase 3: RAG 语义检索 (p2-8)

#### 3.1 基础语义搜索
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/search -H "Content-Type: application/json" -d "{\"query\":\"什么是RAG\",\"top_k\":3}"
```
- **预期结果**: 返回 `{"documents":[{"document_id":"...","content":"RAG stands for...","score":0.XX,"metadata":{...}},...],"total":N,"collection":"default"}`
- **验证点**: documents 数组，包含 document_id/content/score/metadata

#### 3.2 搜索带 min_score 过滤
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/search -H "Content-Type: application/json" -d "{\"query\":\"OpenRouter是什么\",\"top_k\":5,\"min_score\":0.9}"
```
- **预期结果**: 可能返回空列表或 0-1 个结果（因为阈值较高）
- **验证点**: 低分结果被过滤

#### 3.3 搜索空集合（边界测试）
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/search -H "Content-Type: application/json" -d "{\"query\":\"不存在的查询\",\"collection\":\"nonexistent\"}"
```
- **预期结果**: 返回空 documents 数组，不报错
- **验证点**: `{"documents":[],"total":0,"collection":"nonexistent"}`

---

### Phase 4: RAG Q&A (p2-9)

#### 4.1 非流式 RAG 问答
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/ask -H "Content-Type: application/json" -d "{\"question\":\"What is RAG?\",\"top_k\":3,\"stream\":false}"
```
- **预期结果**: 返回 `{"answer":"...","citations":[{"document_id":"...","content_preview":"...","score":0.XX}],"model":"...","search_stats":{"documents_retrieved":N,"collection":"default"}}`
- **验证点**: answer 非空，citations 包含 source 信息

#### 4.2 流式 RAG 问答（SSE）
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/ask -H "Content-Type: application/json" -H "Accept: text/event-stream" -d "{\"question\":\"Explain vector databases\",\"top_k\":3,\"stream\":true}" -N
```
- **预期结果**: 流式输出 `data: ...\n\ndata: ...\n\ndata: [DONE]\n\n`
- **验证点**: SSE 格式，包含 citations 消息，以 [DONE] 结尾

#### 4.3 RAG 无上下文问答（边界测试）
```cmd
curl -X POST http://127.0.0.1:8000/api/rag/ask -H "Content-Type: application/json" -d "{\"question\":\"What is quantum computing\",\"top_k\":3,\"stream\":false}"
```
- **预期结果**: 返回友好提示，如 "I couldn't find any relevant information..."
- **验证点**: 无相关文档时正常降级，不报错

---

### Phase 5: 集合管理

#### 5.1 列出集合
```cmd
curl -X GET http://127.0.0.1:8000/api/rag/collections
```
- **预期结果**: 返回 `{"collections":["default"],"total":1}`
- **验证点**: collections 数组

#### 5.2 获取集合统计
```cmd
curl -X GET http://127.0.0.1:8000/api/rag/collections/default/stats
```
- **预期结果**: 返回 `{"collection":"default","count":3,"store_type":"chroma"}` (或 faiss)
- **验证点**: count 与嵌入的文档数一致

#### 5.3 列出文档
```cmd
curl -X GET "http://127.0.0.1:8000/api/rag/documents?collection=default&skip=0&limit=10"
```
- **预期结果**: 返回 `{"documents":[],"total":3,"collection":"default"}`（当前实现返回空列表+总数）
- **验证点**: total 正确，documents 可能为空（已知限制）

---

### Phase 6: 回归测试

#### 6.1 Chat API 回归
```cmd
curl -X POST http://127.0.0.1:8000/api/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"model\":\"anthropic/claude-3.5-sonnet\",\"stream\":false}"
```
- **预期结果**: 返回 `{"content":"...","model":"...","usage":{...}}`
- **验证点**: 核心聊天功能正常

#### 6.2 NLP API 回归
```cmd
curl -X POST http://127.0.0.1:8000/api/nlp -H "Content-Type: application/json" -d "{\"text\":\"set a timer for 5 minutes\"}"
```
- **预期结果**: 返回 `{\"intent\":\"timer.create\",\"parameters\":{...},\"reply\":\"...\"}`
- **验证点**: NLP 意图识别正常

#### 6.3 Models API 回归
```cmd
curl -X GET http://127.0.0.1:8000/api/models
```
- **预期结果**: 返回模型列表
- **验证点**: 模型列表正常返回

---

### Phase 7: 日志验证

执行上述测试时，检查服务日志输出：

| 日志关键字 | 出现场景 | 预期内容 |
|-----------|---------|---------|
| `[retriever_search_start]` | 调用 search/ask | 包含 query_length, collection, top_k |
| `[rag_search_executed]` | 搜索完成 | 包含 duration_ms, results 数量 |
| `[generator_start]` | 调用 ask (非流式) | 包含 question_length, documents 数量 |
| `[rag_answer_generated]` | 生成完成 | 包含 model, answer_length, duration |
| `[embedder_start]` | 调用 embed | 包含 documents=N |
| `[embed_api_success]` | 嵌入完成 | 包含 created=N |

---

## 快速验证脚本 (Windows CMD)

将以下内容保存为 `test-rag.cmd`，在服务启动后运行：

```cmd
@echo off
echo Testing RAG Engine...

set BASE_URL=http://127.0.0.1:8000
set API=api

echo.
echo === Phase 1: Health Check ===
curl -s %BASE_URL%/%API%/health
echo.

echo.
echo === Phase 2: Embed Documents ===
curl -s -X POST %BASE_URL%/%API%/rag/embed -H "Content-Type: application/json" -d "{\"documents\":[\"RAG is Retrieval-Augmented Generation\",\"OpenRouter provides LLM APIs\",\"Vector DB stores embeddings\"],\"metadata\":[{\"topic\":\"rag\"},{\"topic\":\"api\"},{\"topic\":\"db\"}]}"
echo.

echo.
echo === Phase 3: Search ===
curl -s -X POST %BASE_URL%/%API%/rag/search -H "Content-Type: application/json" -d "{\"query\":\"What is RAG\",\"top_k\":3}"
echo.

echo.
echo === Phase 4: RAG Ask ===
curl -s -X POST %BASE_URL%/%API%/rag/ask -H "Content-Type: application/json" -d "{\"question\":\"What is RAG?\",\"top_k\":3,\"stream\":false}"
echo.

echo.
echo === Phase 5: Collection Stats ===
curl -s %BASE_URL%/%API%/rag/collections/default/stats
echo.

echo.
echo === Phase 6: Regression - Chat ===
curl -s -X POST %BASE_URL%/%API%/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}],\"stream\":false}"
echo.

echo.
echo === Done ===
pause
```

---

## 测试覆盖范围

| 测试项 | 类型 | 优先级 | 状态 |
|--------|------|--------|------|
| VectorStore (Chroma) | 单元测试 | 高 | ⏳ 待验证 |
| VectorStore (FAISS) | 单元测试 | 高 | ⏳ 待验证 |
| Retriever.search() | 单元测试 | 高 | ⏳ 待验证 |
| Generator.generate() | 单元测试 | 高 | ⏳ 待验证 |
| Generator.generate_stream() | 单元测试 | 高 | ⏳ 待验证 |
| /api/rag/search | 集成测试 | 高 | ⏳ 待验证 |
| /api/rag/ask (非流式) | 集成测试 | 高 | ⏳ 待验证 |
| /api/rag/ask (流式) | 集成测试 | 高 | ⏳ 待验证 |
| /api/rag/documents | 集成测试 | 中 | ⏳ 待验证 |
| /api/rag/collections | 集成测试 | 中 | ⏳ 待验证 |

## 功能验证清单

### VectorStore (Chroma/FAISS)
- [ ] 创建 Collection 并添加文档 - 预期结果: 文档 ID 返回，数据持久化
- [ ] 查询 Collection 统计信息 - 预期结果: 返回正确文档数
- [ ] 按文档 ID 删除 - 预期结果: 文档从集合中移除
- [ ] 向量相似度搜索 - 预期结果: 返回按分数排序的结果
- [ ] 清空 Collection - 预期结果: 集合清空，文档数为 0

### Retriever Service
- [ ] search() 基本流程 - 预期结果: 调用 embedder + vector_store，返回 RetrievedDocument 列表
- [ ] top_k 参数生效 - 预期结果: 返回结果数量 <= top_k
- [ ] min_score 过滤 - 预期结果: 过滤低分结果，只返回 >= min_score 的文档
- [ ] 埋点事件 rag_search_executed - 预期结果: 日志中包含该事件名和 query/result_count/duration

### Generator Service
- [ ] generate() 基本流程 - 预期结果: 构建上下文 + 调用 LLM，返回带 sources 的 RAGAnswer
- [ ] 上下文长度限制 - 预期结果: 上下文不超过 rag_max_context_length
- [ ] 无文档时的降级 - 预期结果: 返回友好提示，而不是报错
- [ ] 埋点事件 rag_answer_generated - 预期结果: 日志中包含该事件名和耗时信息

### API: /api/rag/search
- [ ] POST /api/rag/search - 预期结果: 返回 SearchResponse，包含 documents 列表
- [ ] collection 参数过滤 - 预期结果: 只在指定 collection 中搜索
- [ ] top_k 参数生效 - 预期结果: 返回结果数 <= top_k
- [ ] min_score 参数生效 - 预期结果: 过滤低相似度结果

### API: /api/rag/ask
- [ ] POST /api/rag/ask (非流式) - 预期结果: 返回 RAGAskResponse，包含 answer 和 citations
- [ ] stream=true (流式) - 预期结果: 返回 SSE 格式，data: 开头，[DONE] 结尾
- [ ] citations 信息完整 - 预期结果: 包含 document_id, content_preview, score
- [ ] search_stats 信息 - 预期结果: 包含 documents_retrieved 和 collection

### API: 文档管理
- [ ] DELETE /api/rag/documents/{id} - 预期结果: 204 No Content，文档被删除
- [ ] GET /api/rag/collections - 预期结果: 返回所有 collection 名称列表
- [ ] GET /api/rag/collections/{name}/stats - 预期结果: 返回 count 和 store_type
- [ ] DELETE /api/rag/collections/{name} - 预期结果: 清空指定 collection

## 边界情况测试

- [ ] search() 空集合 - 预期结果: 返回空列表，不报错
- [ ] search() 无匹配结果 - 预期结果: 返回空列表，min_score 过滤生效
- [ ] generate() 空文档列表 - 预期结果: 返回友好提示，不调用 LLM
- [ ] 上下文超长 (>4000 chars) - 预期结果: 自动截断，包含尽可能多的文档
- [ ] 无效的 collection 名称 - 预期结果: 适当处理，返回空结果或报错

## 回归测试

- [ ] /api/rag/embed 仍然可用 - 预期结果: p2-7 Embedder 功能未破坏
- [ ] /api/chat 仍然可用 - 预期结果: 核心聊天功能未受影响
- [ ] /api/nlp 仍然可用 - 预期结果: NLP 意图识别未受影响
- [ ] /api/models 仍然可用 - 预期结果: 模型列表功能正常
- [ ] /health 检查通过 - 预期结果: 包含服务状态

## 已知问题 / 待改进

1. **FAISS 删除限制**: FAISS 不支持单个文档删除，当前实现是重建索引（效率低），建议生产环境使用 Chroma
2. **Document List 未实现**: `/api/rag/documents` GET 接口返回空列表，需要 vector_store.list_documents() 支持
3. **Collection 切换**: 需要重启服务才能切换 vector store 后端类型

## 验证记录

| 时间 | 验证人 | 结果 | 备注 |
|------|--------|------|------|
| 2026-04-15 | Claude | 🚧 待验证 | 代码已提交，待功能测试 |
