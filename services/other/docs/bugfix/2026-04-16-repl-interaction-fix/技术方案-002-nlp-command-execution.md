# Bugfix: REPL 自然语言命令执行失败 - 技术方案

> 创建日期：2026-04-16
> 状态：已实施

## 问题描述

NLP 能正确识别用户意图（如 `timer.create`、`kb.add`），但在执行相应命令时没有正确传递参数。

### 根因分析

```
NLP 返回参数格式不统一
  ↓
意图路由器直接透传参数
  ↓
命令处理器参数映射碎片化
  ↓
参数丢失或格式不匹配
```

## 解决方案

### 核心思想：建立参数契约 + 统一转换层

```
NLP Response
    ↓
[参数契约] - 规定 NLP 必须返回的标准格式（llm-py）
    ↓
[意图路由器] - 标准化参数（CLI）
    ↓
[命令处理器] - 按统一格式读取参数（CLI）
```

---

## 实施内容

### 1. NLP 层：标准化提示词

**文件**: `services/llm-py/app/core/llm_factory.py`

**修改内容**: `create_nlp_intent_chain()` 方法的意图提取 prompt

```python
intent_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an intent recognition assistant.
...
**IMPORTANT - Parameter Naming Convention**:
- Use "title" for knowledge base entry title
- Use "content" for knowledge base entry content
- Use "tags" for tags array (comma-separated string)
- Use "cron" for cron expression (e.g., "0 * * * *")
- Use "url" for callback URL
- Use "name" for entity name
- Use "method" for HTTP method (GET/POST/PUT/DELETE)

**IMPORTANT - Return a FLAT JSON object only**:
- Do NOT nest parameters inside "params", "data", or "metadata"
- Always return parameters directly in the top-level object
...
"""),
    ("human", "{text}"),
])
```

### 2. CLI 层：参数标准化函数

**文件**: `services/cli/src/repl/intent-router.ts`

**新增内容**:
- `KB_PARAM_MAP` - KB 命令参数映射表
- `TIMER_PARAM_MAP` - Timer 命令参数映射表
- `MCP_PARAM_MAP` - MCP 命令参数映射表
- `normalizeParams()` - 通用标准化函数
- `normalizeKBParams()` - KB 参数标准化
- `normalizeTimerParams()` - Timer 参数标准化
- `normalizeMCPParams()` - MCP 参数标准化

**参数映射示例**:
```typescript
const KB_PARAM_MAP = {
  title: ['title', 'name', 'subject', 'heading', '标题'],
  content: ['content', 'text', 'body', 'description', 'value', '内容'],
  tags: ['tags', 'tag', 'labels', 'categories', '标签'],
};
```

### 3. CLI 层：参数验证工具

**新增文件**: `services/cli/src/repl/validators.ts`

```typescript
export function validateKBParams(params): ValidationResult {...}
export function validateTimerParams(params): ValidationResult {...}
export function validateMCPParams(params): ValidationResult {...}
```

---

## 文档沉淀

### CLI 服务规则更新

**文件**: `services/cli/.claude/rules/rules.md`

新增章节：
- **参数标准化契约**：意图路由器是参数标准化的统一转换层
- **参数映射表**：KB/Timer/MCP 命令的标准参数和别名映射
- **参数验证**：validators.ts 提供的验证函数

### llm-py 服务规则更新

**文件**: `services/llm-py/.claude/rules/rules.md`

新增章节：
- **NLP 参数契约**：意图识别参数命名规范
- 提示词编写要求：扁平 JSON、禁止嵌套

### AGENTS.md 更新

- `services/cli/AGENTS.md`: 新增 `validators.ts` 文件说明
- `services/llm-py/AGENTS.md`: 更新最后时间

---

## 验证步骤

### 1. NLP 层验证

```bash
curl -X POST http://localhost:8000/api/nlp \
  -H "Content-Type: application/json" \
  -d '{"text": "帮我添加一条知识库，标题是\"测试\"，内容是\"测试内容\""}'
```

**预期输出**:
```json
{
  "intent": "kb.add",
  "parameters": {
    "title": "测试",
    "content": "测试内容"
  }
}
```

### 2. CLI 层验证

```bash
ddo
# 输入
帮我添加一条知识库，标题是"测试"，内容是"测试内容"
```

**预期行为**: 标题和内容自动填充，直接进入确认环节

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `services/llm-py/app/core/llm_factory.py` | 修改 | NLP 提示词标准化 |
| `services/cli/src/repl/intent-router.ts` | 修改 | 参数标准化函数 |
| `services/cli/src/repl/validators.ts` | 新增 | 参数验证工具 |
| `services/cli/.claude/rules/rules.md` | 修改 | 新增参数契约章节 |
| `services/llm-py/.claude/rules/rules.md` | 修改 | 新增 NLP 参数规范 |
| `services/cli/AGENTS.md` | 修改 | 更新目录结构 |
| `services/llm-py/AGENTS.md` | 修改 | 更新最后时间 |