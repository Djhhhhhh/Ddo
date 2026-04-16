#!/bin/bash
# 知识库功能链路完整测试脚本
# 执行顺序：创建 -> 列表查询 -> 详情获取 -> 搜索 -> RAG问答 -> 删除

BASE_URL="http://localhost:8080/api/v1"

echo "================== Step 1: 创建知识条目 =================="
# 创建第一个知识条目
curl -X POST "${BASE_URL}/knowledge" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Go 语言并发编程指南",
    "content": "Go 语言通过 goroutine 和 channel 实现并发编程。goroutine 是轻量级线程，由 Go 运行时管理。channel 用于 goroutine 之间的通信和同步。select 语句可以监听多个 channel 的操作。",
    "category": "编程语言",
    "tags": ["Go", "并发", "goroutine", "channel"],
    "source": "官方文档"
  }'

echo -e "\n\n"

# 创建第二个知识条目
curl -X POST "${BASE_URL}/knowledge" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python FastAPI 框架介绍",
    "content": "FastAPI 是一个现代、高性能的 Python Web 框架，基于 Starlette 和 Pydantic。它支持异步编程、自动 API 文档生成（OpenAPI/Swagger）、类型提示和依赖注入系统。",
    "category": "Web框架",
    "tags": ["Python", "FastAPI", "异步", "API"],
    "source": "FastAPI 官网"
  }'

echo -e "\n\n"

# 创建第三个知识条目
curl -X POST "${BASE_URL}/knowledge" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "RAG 检索增强生成技术",
    "content": "RAG（Retrieval-Augmented Generation）是一种结合信息检索和文本生成的技术。它首先从知识库中检索相关文档，然后将这些文档作为上下文输入给大语言模型，生成更准确、更可靠的回答。",
    "category": "AI技术",
    "tags": ["RAG", "LLM", "向量检索", "语义搜索"],
    "source": "AI 研究论文"
  }'

echo -e "\n\n================== Step 2: 查询知识列表 =================="
# 查询所有知识（第一页）
curl "${BASE_URL}/knowledge?page=1&page_size=10"

echo -e "\n\n"

# 按分类筛选
curl "${BASE_URL}/knowledge?category=编程语言"

echo -e "\n\n"

# 按标签筛选
curl "${BASE_URL}/knowledge?tag=Go"

echo -e "\n\n"

# 关键词搜索
curl "${BASE_URL}/knowledge?keyword=并发"

echo -e "\n\n================== Step 3: 获取知识详情 =================="
# 假设 UUID 为测试值，实际应该从前面的响应中获取
echo "注意：请将 <uuid> 替换为实际创建返回的 UUID"
curl "${BASE_URL}/knowledge/<uuid>"

echo -e "\n\n================== Step 4: 语义搜索知识 =================="
# 语义搜索 - 查询与 Go 语言相关的内容
curl "${BASE_URL}/knowledge/search?q=Go语言并发编程&limit=5"

echo -e "\n\n"

# 语义搜索 - 查询 RAG 技术
curl "${BASE_URL}/knowledge/search?q=什么是RAG技术&limit=3"

echo -e "\n\n"

# 语义搜索 - 查询 Web 框架
curl "${BASE_URL}/knowledge/search?q=Python Web框架&limit=5"

echo -e "\n\n================== Step 5: RAG 问答 =================="
# RAG 问答 - 关于 Go 并发
curl -X POST "${BASE_URL}/knowledge/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Go 语言的 goroutine 是什么？",
    "context_limit": 3
  }'

echo -e "\n\n"

# RAG 问答 - 关于 FastAPI
curl -X POST "${BASE_URL}/knowledge/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "FastAPI 有什么特点？",
    "context_limit": 5
  }'

echo -e "\n\n"

# RAG 问答 - 关于 RAG 技术本身
curl -X POST "${BASE_URL}/knowledge/ask" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "RAG 技术如何工作？",
    "context_limit": 5
  }'

echo -e "\n\n================== Step 6: 删除知识 =================="
echo "注意：请将 <uuid> 替换为实际要删除的 UUID"
curl -X DELETE "${BASE_URL}/knowledge/<uuid>"

echo -e "\n\n================== 验证：再次查询列表确认删除 =================="
curl "${BASE_URL}/knowledge?page=1&page_size=10"

echo -e "\n\n测试完成！"
