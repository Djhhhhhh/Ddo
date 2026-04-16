# Bugfix: 通过 CLI 创建知识库词条链路问题

> 修复日期：2026-04-16
> 影响范围：CLI → server-go → llm-py NLP 调用

## 问题描述

CLI 通过自然语言创建知识库词条时，NLP 意图识别请求出现 307 重定向。

### 日志
```
INFO:     127.0.0.1:54936 - "POST /api/nlp/ HTTP/1.1" 200 OK  (带尾部斜杠，直接成功)
INFO:     127.0.0.1:54945 - "POST /api/nlp HTTP/1.1" 307 Temporary Redirect  (不带尾部斜杠，重定向)
2026-04-16 21:32:32 - app.api.nlp - INFO - [nlp_analyze] text_length=7
2026-04-16 21:32:37 - app.api.nlp - INFO - [nlp_complete] intent=kb.add
```

## 根因分析

```
CLI (nlp.ts) → POST /api/v1/chat/nlp
       ↓
server-go (llm_handler.go) → LLMHandler.NLP
       ↓
server-go (llm_proxy.go) → POST http://localhost:8000/api/nlp  ⚠️ 缺少尾部斜杠
       ↓
llm-py (nlp.py) → @router.post("/", prefix="/nlp") = /api/nlp/  ← 307 重定向
```

**问题**：llm-py NLP 路由定义为 `@router.post("/", ...)` + `prefix="/nlp"`，导致完整路径为 `/api/nlp/`（必须带尾部斜杠）。但 server-go 调用 `/api/nlp`（不带斜杠），触发 FastAPI 的 307 重定向。

## 修复方案

**修改文件**: `services/server-go/internal/application/service/llm_proxy.go`

**修改位置**: 第 258 行

```go
// 修改前
httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/nlp", bytes.NewReader(body))

// 修改后
httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/api/nlp/", bytes.NewReader(body))
```

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `services/server-go/internal/application/service/llm_proxy.go` | 修改 | 添加尾部斜杠 |

## 验证步骤

1. 重启 server-go 服务
2. 在 CLI 中执行自然语言命令测试：
   ```bash
   帮我添加一条知识库：标题是"测试"，内容是"测试内容"
   ```
3. 观察 llm-py 日志，应该只有一次 200 请求，不再有 307 重定向
4. 检查知识库是否正确创建到数据库

## 影响范围

- 仅影响 NLP 意图识别的 HTTP 调用
- 不影响其他功能（chat、rag 等）
- 修复后性能略有提升（减少一次重定向）

## 相关文件

- CLI NLP 调用：`services/cli/src/services/nlp.ts`
- server-go NLP 代理：`services/server-go/internal/application/service/llm_proxy.go`
- llm-py NLP 路由：`services/llm-py/app/api/nlp.py`
- REPL 命令处理：`services/cli/src/repl/commands/index.ts`
- KB 命令实现：`services/cli/src/repl/commands/kb-commands.ts`
- 意图路由器：`services/cli/src/repl/intent-router.ts`

---

# Bugfix: llm-py LangChain 提示词模板错误

> 修复日期：2026-04-16
> 影响范围：llm-py NLP 意图识别 API

## 问题描述

llm-py NLP 接口返回 502 错误，日志显示：
```
app.api.nlp - ERROR - [nlp_error] error=Invalid format specifier in f-string template. Nested replacement fields are not allowed.
```

## 根因分析

在 `llm_factory.py` 的 NLP 提示词中，我写了 JSON 示例：
```python
- Example: {"intent": "kb.add", "parameters": {"title": "...", "content": "..."}}
```

这里的大括号 `{` 和 `}` 与 LangChain 的变量替换语法冲突，导致 f-string 解析失败。

## 修复方案

**修改文件**: `services/llm-py/app/core/llm_factory.py`

**修改内容**: 第 195 行

```python
# 修改前（报错）
- Example: {"intent": "kb.add", "parameters": {"title": "...", "content": "..."}}

# 修改后（正常）
- Example: parameters with title and content at top level
```

## 规则沉淀

**文件**: `services/llm-py/.claude/rules/rules.md`

新增章节 **LangChain 提示词模板规则**：

- 禁止在提示词中直接使用 JSON 示例
- 用文字描述代替 JSON 结构
- 变量占位符只用 `{variable_name}` 格式，不要嵌套大括号

## 验证步骤

1. 重启 llm-py 服务
2. 测试 NLP 接口：
   ```bash
   curl -X POST http://localhost:8000/api/nlp \
     -H "Content-Type: application/json" \
     -d '{"text": "添加知识库"}'
   ```
3. 应该返回 200 而不是 502

---

# Bugfix: llm-py Chat API 524 超时错误处理

> 修复日期：2026-04-16
> 影响范围：llm-py Chat API `/api/chat/completions`

## 问题描述

OpenRouter API 调用超时（524 错误）时，llm-py 返回的响应是错误 JSON：
```json
{"error": {"message": "Gateway Timeout", "code": 524}}
```

但 llm-py 期望的响应格式是：
```json
{"id": "...", "model": "...", "choices": [...], "usage": {...}}
```

这导致 Pydantic 验证失败，错误信息：
```
Response validation failed: 6 validation errors for Unmarshaller
body.choices - Field required
body.created - Field required
...
```

## 根因分析

1. LangChain 的 `ChatOpenRouter` 或 `ChatOpenAI` 调用 OpenRouter 时超时
2. OpenRouter 返回错误 JSON（而不是标准响应格式）
3. LangChain 直接返回这个错误响应
4. llm-py 的 `chat_completions` 函数返回 `Dict[str, Any]`
5. FastAPI 尝试将其序列化为 `ChatResponse`（定义在 chat.py 中）
6. Pydantic 验证失败，抛出 `Response validation failed` 错误

## 修复方案

### 修复 1：添加 LangChain timeout 配置

**修改文件**: `services/llm-py/app/core/llm_factory.py`

**修改位置**: `_create_chat_model` 方法

```python
# 修改前 - ChatOpenRouter 和 ChatOpenAI 都没有 timeout 参数
chat_model = ChatOpenRouter(
    model=model_id,
    api_key=self.settings.openrouter_api_key,
    temperature=temperature,
)

chat_model = ChatOpenAI(
    model=model_id,
    api_key=self.settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1",
    temperature=temperature,
)

# 修改后 - 添加 timeout 参数
chat_model = ChatOpenRouter(
    model=model_id,
    api_key=self.settings.openrouter_api_key,
    temperature=temperature,
    timeout=self.settings.llm_timeout,  # 新增
)

chat_model = ChatOpenAI(
    model=model_id,
    api_key=self.settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1",
    temperature=temperature,
    timeout=self.settings.llm_timeout,  # 新增
)
```

**说明**：配置中的 `llm_timeout` 默认值是 30 秒。

### 修复 2：增强错误处理

**修改文件**: `services/llm-py/app/api/chat.py`

**修改位置**: `chat_completions` 函数的异常处理

```python
# 修改前
except Exception as e:
    logger.error(f"[chat_error] error={str(e)}")
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Unexpected error: {str(e)}",
    )

# 修改后
except Exception as e:
    error_str = str(e)
    # 处理 OpenRouter 错误响应（如 524 超时）
    if "Response validation failed" in error_str or "validation errors" in error_str:
        logger.error(f"[chat_openrouter_error] error={error_str}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="LLM service timeout or unavailable. Please try again later.",
        )
    # 处理其他异常
    logger.error(f"[chat_error] error={error_str}")
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Unexpected error: {error_str}",
    )
```

**说明**：识别 Pydantic 验证错误并返回更友好的 504 错误信息。

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `services/llm-py/app/core/llm_factory.py` | 修改 | 添加 timeout 参数 |
| `services/llm-py/app/api/chat.py` | 修改 | 增强错误处理 |

## 验证步骤

1. 重启 llm-py 服务
2. 模拟 OpenRouter 超时场景
3. 验证返回的是 504 错误而不是 Pydantic 验证错误
4. 检查日志是否正确记录 `[chat_openrouter_error]`

## 影响范围

- Chat API（`/api/chat/completions`）
- NLP API（使用同一个 ChatModel）
- 修复后用户会看到更友好的错误信息

## 相关文件

- LLM Factory：`services/llm-py/app/core/llm_factory.py`
- Chat API：`services/llm-py/app/api/chat.py`
- 配置：`services/llm-py/app/core/config.py`