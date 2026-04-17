# 知识库增强功能 - 功能测试清单

**创建时间**: 2026-04-17
**技术方案**: [技术方案.md](技术方案.md)

---

## 一、测试环境准备

**服务启动命令**:
```bash
# 1. 启动 llm-py (端口 8000)
cd services/llm-py && python main.py

# 2. 启动 server-go (端口 8080)
cd services/server-go && go run ./cmd/server

# 3. 启动 CLI (可选，用于手动测试)
cd services/cli && npm run build && node dist/index.js
```

---

## 二、llm-py 服务测试

### 2.1 测试 POST /api/analyze/analyze - 正常分析

**curl 命令**:
```bash
curl -X POST http://localhost:8000/api/analyze/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Python 异步编程核心概念：async/await、协程、事件循环",
    "title": "Python 异步编程入门"
  }'
```

**预期返回结果**:
```json
{
  "tags": ["python", "async", "coroutine", "event-loop"],
  "categories": ["编程语言", "异步编程"],
  "is_new_categories": [false, true],
  "suggested_reply": "已将内容添加到【编程语言】分类，并打上了相关标签"
}
```

**解释**: AI 分析内容后返回推荐的 tags（用于精确检索）和 categories（用于按领域浏览）。`is_new_categories` 表示该分类是否需要新建，`false` 表示已有该分类，`true` 表示需要新建。

---

### 2.2 测试 POST /api/analyze/analyze - 只传 content

**curl 命令**:
```bash
curl -X POST http://localhost:8000/api/analyze/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "如何使用 Docker 部署 MySQL 服务"
  }'
```

**预期返回结果**:
```json
{
  "tags": ["docker", "mysql", "部署"],
  "categories": ["DevOps", "数据库"],
  "is_new_categories": [false, false],
  "suggested_reply": "..."
}
```

**解释**: 即使不传 title，AI 也能从 content 中提取关键信息。

---

## 三、server-go 服务测试

### 3.1 测试 POST /api/v1/knowledge - 创建知识（带 AI 分析）

**curl 命令**:
```bash
curl -X POST http://localhost:8080/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python 异步编程入门",
    "content": "Python 异步编程核心概念：async/await、协程、事件循环",
    "source": "cli"
  }'
```

**预期返回结果**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uuid": "生成的UUID",
    "title": "Python 异步编程入门",
    "category": "编程语言",
    "tags": ["python", "async", "coroutine", "event-loop"],
    "status": "active",
    "embedding_id": "向量ID"
  },
  "timestamp": "2026-04-17T..."
}
```

**解释**: 创建知识时，server-go 会调用 llm-py 的 /api/analyze/analyze 接口，自动填充 tags 和 category。`source` 字段会被记录为 "cli"。

---

### 3.2 测试 GET /api/v1/categories - 列出所有分类

**curl 命令**:
```bash
curl -X GET http://localhost:8080/api/v1/categories
```

**预期返回结果**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 2,
    "items": [
      {
        "id": "category-uuid-1",
        "name": "编程语言",
        "description": "",
        "created_at": "2026-04-17T..."
      },
      {
        "id": "category-uuid-2",
        "name": "异步编程",
        "description": "",
        "created_at": "2026-04-17T..."
      }
    ]
  },
  "timestamp": "2026-04-17T..."
}
```

**解释**: 返回所有已创建的分类，包括 AI 自动创建的分类。

---

### 3.3 测试 POST /api/v1/categories - 手动创建分类

**curl 命令**:
```bash
curl -X POST http://localhost:8080/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "机器学习",
    "description": "机器学习和深度学习相关内容"
  }'
```

**预期返回结果**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "新创建的category-uuid",
    "name": "机器学习",
    "description": "机器学习和深度学习相关内容",
    "created_at": "2026-04-17T...",
    "updated_at": "2026-04-17T..."
  },
  "timestamp": "2026-04-17T..."
}
```

---

### 3.4 测试 GET /api/v1/categories/:id/knowledge - 获取分类下的知识

**curl 命令** (将 :id 替换为实际的 category ID):
```bash
curl -X GET http://localhost:8080/api/v1/categories/{category-uuid}/knowledge
```

**预期返回结果**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1,
    "items": [
      {
        "uuid": "knowledge-uuid",
        "title": "Python 异步编程入门",
        "category": "编程语言",
        "tags": ["python", "async"]
      }
    ]
  },
  "timestamp": "2026-04-17T..."
}
```

**解释**: 返回指定分类下的所有知识列表，验证多对多关联是否正确。

---

## 四、CLI 服务测试

### 4.1 测试 /kb-add 命令

**进入 REPL 后执行**:
```bash
/kb-add
```

按提示输入：
- 标题: `测试知识`
- 内容: `这是用于测试知识库增强功能的内容`

**验证**: 在 server-go 日志或数据库中确认创建的 knowledge 记录的 `source` 字段为 `"cli"`。

---

## 五、边界情况测试

### 5.1 llm-py 不可用时降级测试

**操作**: 停止 llm-py 服务，然后调用创建知识接口

**curl 命令**:
```bash
curl -X POST http://localhost:8080/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试降级",
    "content": "当 llm-py 不可用时，此知识仍应能创建"
  }'
```

**预期结果**:
- 返回 200 成功
- tags 为空数组 `[]`
- category 为空字符串 `""` (因为没有 AI 分析)
- 不会因为 llm-py 不可用而导致整个请求失败

**解释**: 当 AI 分析服务不可用时，系统应该降级处理，不阻止知识创建，只是跳过 AI 分析步骤。

---

### 5.2 并发创建同名分类测试

**操作**: 两个请求同时创建同名分类

**curl 命令**:
```bash
# 请求1
curl -X POST http://localhost:8080/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "测试分类"}' &

# 请求2
curl -X POST http://localhost:8080/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "测试分类"}' &
```

**预期结果**:
- 只有一个分类被创建
- 两个请求都返回成功（后者返回已存在的分类）
- 不会因为唯一索引冲突而报错

---

## 六、回归测试

### 6.1 确认已有功能正常

```bash
# 列出知识
curl -X GET http://localhost:8080/api/v1/knowledge

# 搜索知识
curl -X GET "http://localhost:8080/api/v1/knowledge/search?q=python"

# 删除知识
curl -X POST http://localhost:8080/api/v1/knowledge/{uuid}/delete
```

---

## 七、验证记录

| 时间 | 验证人 | 测试项 | 结果 | 备注 |
|------|--------|--------|------|------|
| | | llm-py /api/analyze | ⏳ | |
| | | server-go 创建知识 + AI分析 | ⏳ | |
| | | server-go 分类列表 | ⏳ | |
| | | CLI kb-add source 字段 | ⏳ | |
| | | 降级测试 | ⏳ | |