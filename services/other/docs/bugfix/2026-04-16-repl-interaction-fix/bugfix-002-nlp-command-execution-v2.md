# Bugfix: REPL 自然语言命令执行失败 - 完整方案

> 创建日期：2026-04-16
> 方案版本：v2（根治方案）

## 问题描述

NLP 能正确识别用户意图（如 `timer.create`、`kb.add`），但在执行相应命令时没有正确传递参数。

### 观察到的日志

```
NLP: intent=kb.add, parameters={...}  ✓ 识别正确
但参数传递链路中存在丢失或格式不匹配问题
```

## 根因分析

### 问题 1：NLP 参数结构不统一

**症状**：NLP 可能返回不同的参数格式：
- `{title: "...", content: "..."}`
- `{name: "...", text: "..."}`
- `{params: {title: "..."}}`
- `{data: {title: "..."}}`

**根本原因**：没有统一的参数契约，NLP 提示词依赖模型自由发挥。

### 问题 2：意图路由器直接透传参数

```typescript
// intent-router.ts - 直接使用 NLP 返回的参数，没有转换
const action: RouteAction = {
  type: mapping.action,
  parameters,  // ← 没有做格式标准化
};
```

### 问题 3：命令处理器参数映射碎片化

每个命令各自实现参数提取逻辑，容易遗漏或不一致。

## 完整解决方案（v2）

### 核心思想：建立参数契约 + 统一转换层

```
NLP Response
    ↓
[参数契约] - 规定 NLP 必须返回的标准格式
    ↓
[意图路由器] - 标准化参数
    ↓
[命令处理器] - 按统一格式读取参数
```

---

### Step 1：建立参数契约（NLP 提示词标准化）

**修改文件**: `services/llm-py/app/core/llm_factory.py`

**修改位置**: `create_nlp_intent_chain()` 的意图提取 prompt

```python
intent_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an intent recognition assistant.
Analyze the user's input and extract:
1. intent: The main intent (e.g., "timer.create", "kb.add", "chat")
2. parameters: Relevant parameters as key-value pairs
3. reply: A friendly response to the user

**IMPORTANT**: All parameters MUST be returned in a FLAT structure:
- Use "title" for knowledge base entry title
- Use "content" for knowledge base entry content
- Use "cron" for cron expression
- Use "url" for callback URL
- Use "name" for entity name
- Use "tags" for tags array (comma-separated)

Never nest parameters inside "params", "data", or "metadata".
Always return a FLAT JSON object.

Respond in JSON format with no markdown formatting."""),
    ("human", "{text}"),
])
```

**关键改进**：
1. 明确规定参数命名（title vs name vs text 等）
2. 要求返回扁平结构，禁止嵌套
3. 强调不要使用 markdown 格式

---

### Step 2：意图路由器标准化参数

**修改文件**: `services/cli/src/repl/intent-router.ts`

**新增文件**: `services/cli/src/repl/intent-router.ts` 中的 `normalizeParameters()` 函数

```typescript
/**
 * 参数标准化工具函数
 * 确保无论 NLP 返回什么格式，输出都是统一的扁平结构
 */

/** 知识库命令的标准参数名 */
const KB_PARAMS = {
  title: ['title', 'name', 'subject', 'heading'],
  content: ['content', 'text', 'body', 'description', 'value'],
  tags: ['tags', 'tag', 'labels', 'categories'],
  category: ['category', 'type', 'kind'],
};

/** 定时任务命令的标准参数名 */
const TIMER_PARAMS = {
  name: ['name', 'title', 'subject'],
  cron: ['cron', 'schedule', 'time', 'interval', 'frequency'],
  url: ['url', 'endpoint', 'webhook', 'callback', 'callback_url'],
  method: ['method', 'http_method', 'verb'],
  headers: ['headers', 'http_headers'],
  body: ['body', 'payload', 'data'],
};

/**
 * 标准化参数
 * @param params NLP 返回的原始参数
 * @param paramMap 参数名映射表
 * @returns 标准化后的参数
 */
function normalizeParams<T extends Record<string, string>>(
  params: Record<string, unknown> | undefined,
  paramMap: Record<string, string[]>
): Partial<T> {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const result: Record<string, string> = {};

  // 遍历目标参数名
  for (const [targetKey, sourceKeys] of Object.entries(paramMap)) {
    // 查找第一个匹配的源参数
    for (const sourceKey of sourceKeys) {
      if (params[sourceKey] !== undefined && params[sourceKey] !== null) {
        const value = params[sourceKey];
        // 处理数组（如 tags）
        if (Array.isArray(value)) {
          result[targetKey] = value.join(',');
        } else {
          result[targetKey] = String(value);
        }
        break;
      }
    }
  }

  return result as Partial<T>;
}

/**
 * 标准化 KB 参数
 */
function normalizeKBParams(params: Record<string, unknown> | undefined): {
  title?: string;
  content?: string;
  tags?: string;
  category?: string;
} {
  return normalizeParams(params, KB_PARAMS);
}

/**
 * 标准化 Timer 参数
 */
function normalizeTimerParams(params: Record<string, unknown> | undefined): {
  name?: string;
  cron?: string;
  url?: string;
  method?: string;
} {
  return normalizeParams(params, TIMER_PARAMS);
}

/**
 * 标准化 MCP 参数
 */
function normalizeMCPParams(params: Record<string, unknown> | undefined): {
  name?: string;
  type?: string;
  config?: string;
} {
  return normalizeParams(params, {
    name: ['name', 'title'],
    type: ['type', 'kind'],
    config: ['config', 'url', 'command', 'endpoint'],
  });
}
```

**修改 `route()` 函数**：

```typescript
function route(nlpResponse: NLPResponse): RouteAction {
  const { intent, parameters, reply } = nlpResponse;

  // 查找意图映射
  const mapping = findMapping(intent);

  if (!mapping) {
    // 尝试关键词兜底匹配
    const keywordFallback = findKeywordFallback(intent);
    if (keywordFallback) {
      return {
        type: keywordFallback.action,
        parameters: parameters,
        targetMode: keywordFallback.targetMode,
      };
    }
    return { type: 'chat' };
  }

  // 根据意图类型标准化参数
  let normalizedParams: Record<string, unknown> = {};

  switch (mapping.action) {
    case 'switch_mode':
      if (mapping.targetMode === ReplMode.Kb) {
        normalizedParams = normalizeKBParams(parameters);
      } else if (mapping.targetMode === ReplMode.Timer) {
        normalizedParams = normalizeTimerParams(parameters);
      } else if (mapping.targetMode === ReplMode.Mcp) {
        normalizedParams = normalizeMCPParams(parameters);
      }
      break;
    default:
      normalizedParams = parameters || {};
  }

  const action: RouteAction = {
    type: mapping.action,
    parameters: normalizedParams,
  };

  // ... 其他代码不变
  return action;
}
```

---

### Step 3：命令处理器简化

**修改文件**: `services/cli/src/repl/commands/kb-commands.ts`

```typescript
export const kbAddCommand: ReplCommand = {
  name: 'kb-add',
  aliases: ['ka', 'kb:create'],
  description: '添加知识库词条',
  usage: '/kb-add [title] [content]',
  handler: async (ctx) => {
    const { args, nlpParameters, rl } = ctx;
    const prompt = new InteractivePrompt(rl);

    // 定义参数
    const paramDefs: ParameterDef[] = [
      { name: 'title', label: '标题', required: true, help: '词条标题' },
      { name: 'content', label: '内容', required: true, help: '词条内容' },
      { name: 'tags', label: '标签', required: false, help: '逗号分隔的标签' },
    ];

    // 从命令行参数提取
    const initialValues: Record<string, string> = {};
    if (args.length >= 1) initialValues.title = args[0];
    if (args.length >= 2) initialValues.content = args.slice(1).join(' ');

    // 从 NLP 参数提取（使用标准化后的参数名）
    if (nlpParameters) {
      // 由于参数已经标准化，直接使用目标参数名即可
      if (!initialValues.title && nlpParameters.title) {
        initialValues.title = String(nlpParameters.title);
      }
      if (!initialValues.content && nlpParameters.content) {
        initialValues.content = String(nlpParameters.content);
      }
      if (!initialValues.tags && nlpParameters.tags) {
        initialValues.tags = String(nlpParameters.tags);
      }
    }

    // 收集参数并执行
    const { params: collected, allCollected } = await prompt.collectRequiredParams(paramDefs, initialValues);

    if (allCollected) {
      const tags = collected.tags ? collected.tags.split(',').map(t => t.trim()) : [];

      const confirmed = await prompt.confirmSummary('词条信息', {
        标题: collected.title,
        内容: collected.content,
        标签: tags.join(', ') || '(无)',
      });

      if (!confirmed) {
        console.log(chalk.yellow('\n已取消添加'));
        return true;
      }

      const apiClient = getApiClient();

      try {
        const result = await apiClient.createKnowledge({
          title: collected.title!,
          content: collected.content!,
          tags,
        });

        console.log(chalk.green('\n✓ 知识库词条添加成功!'));
        console.log(chalk.gray(`  UUID: ${result.uuid}`));
        console.log();
      } catch (err) {
        console.log(chalk.red('\n✗ 添加知识库失败:'), err instanceof Error ? err.message : String(err));
      }
    }

    return true;
  },
};
```

---

### Step 4：添加端到端参数验证

**新增文件**: `services/cli/src/repl/validators.ts`

```typescript
/**
 * 参数验证工具
 * 在参数传递给 API 之前进行验证
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证知识库参数
 */
export function validateKBParams(params: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!params.title || String(params.title).trim() === '') {
    errors.push('标题不能为空');
  }

  if (!params.content || String(params.content).trim() === '') {
    errors.push('内容不能为空');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证定时任务参数
 */
export function validateTimerParams(params: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!params.cron || String(params.cron).trim() === '') {
    errors.push('Cron 表达式不能为空');
  } else {
    // 简单验证：5个字段用空格分隔
    const parts = String(params.cron).trim().split(/\s+/);
    if (parts.length !== 5) {
      errors.push('Cron 表达式需要 5 个字段（分 时 日 月 周）');
    }
  }

  if (!params.url || String(params.url).trim() === '') {
    errors.push('回调 URL 不能为空');
  } else {
    try {
      new URL(String(params.url));
    } catch {
      errors.push('回调 URL 格式不正确');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证 MCP 参数
 */
export function validateMCPParams(params: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!params.name || String(params.name).trim() === '') {
    errors.push('名称不能为空');
  }

  const validTypes = ['stdio', 'http', 'sse'];
  if (!params.type || !validTypes.includes(String(params.type))) {
    errors.push(`类型必须是 ${validTypes.join('|')} 之一`);
  }

  if (!params.config || String(params.config).trim() === '') {
    errors.push('配置不能为空');
  }

  return { valid: errors.length === 0, errors };
}
```

**在 kb-commands.ts 中使用验证**：

```typescript
import { validateKBParams } from '../validators';

// 在调用 API 之前验证
const validation = validateKBParams(collected as Record<string, unknown>);
if (!validation.valid) {
  console.log(chalk.red('参数验证失败:'));
  for (const error of validation.errors) {
    console.log(chalk.red(`  - ${error}`));
  }
  return true;
}
```

---

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NLP Layer (llm-py)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  llm_factory.py - create_nlp_intent_chain()                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Prompt: "All parameters MUST be returned in a FLAT structure"       │   │
│  │         "Use 'title' for knowledge base, 'cron' for timer, etc."    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  返回标准格式: { intent: "kb.add", parameters: { title: "...", content: "..." } }
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLI Layer                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  intent-router.ts                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ normalizeKBParams() / normalizeTimerParams()                        │   │
│  │ - 处理参数别名（title←name, content←text）                         │   │
│  │ - 展平嵌套结构                                                       │   │
│  │ - 类型转换（array→string）                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  kb-commands.ts / timer-commands.ts                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ - 直接使用标准化参数名                                              │   │
│  │ - 调用 validateKBParams() / validateTimerParams() 验证              │   │
│  │ - 调用 API.createKnowledge() / API.createTimer()                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `services/llm-py/app/core/llm_factory.py` | 修改 | 标准化 NLP 提示词 |
| `services/cli/src/repl/intent-router.ts` | 修改 | 添加参数标准化函数 |
| `services/cli/src/repl/commands/kb-commands.ts` | 修改 | 使用标准化参数 |
| `services/cli/src/repl/commands/timer-commands.ts` | 修改 | 使用标准化参数 |
| `services/cli/src/repl/validators.ts` | 新增 | 参数验证工具 |

---

## 验证步骤

### 1. NLP 层验证

```bash
# 测试 NLP 返回的参数格式
curl -X POST http://localhost:8000/api/nlp \
  -H "Content-Type: application/json" \
  -d '{"text": "帮我添加一条知识库，标题是\"测试\"，内容是\"测试内容\""}'
```

**预期输出**：
```json
{
  "intent": "kb.add",
  "parameters": {
    "title": "测试",
    "content": "测试内容"
  },
  "reply": "好的，我来帮你添加知识库"
}
```

### 2. CLI 层验证

```bash
# 启动 CLI
ddo

# 输入自然语言命令
帮我添加一条知识库，标题是"测试"，内容是"测试内容"
```

**预期输出**：
```
[意图路由] targetMode=Kb, parameters={"title":"测试","content":"测试内容"}
[kb-add] initialValues={"title":"测试","content":"测试内容"}
  标题: 测试 (已提供)
  内容: 测试内容 (已提供)
  标签 (可选)

词条信息
────────────────────────────────────
  标题: 测试
  内容: 测试内容
  标签: (无)

确认创建? (y/n)
```

### 3. 端到端验证

- [ ] 知识库词条正确创建到数据库
- [ ] 定时任务正确创建
- [ ] 参数验证能正确拦截无效输入

---

## 为什么这个方案能防止未来问题

### 1. 参数契约明确

- NLP 提示词明确规定参数命名
- 参数必须扁平结构，禁止嵌套
- 消除歧义：`title` vs `name` vs `subject` 不再混淆

### 2. 统一转换层

- 意图路由器统一处理参数标准化
- 所有命令处理器共享相同的转换逻辑
- 避免每个命令各自实现导致的不一致

### 3. 参数验证

- API 调用前进行验证
- 错误信息友好
- 防止无效数据进入系统

### 4. 可测试性

- `normalizeKBParams()` 可单元测试
- `validateKBParams()` 可单元测试
- 每个步骤可独立验证

---

## 回滚计划

如果出现问题，可以快速回滚：

1. **回滚 NLP 提示词**：恢复原来的提示词
2. **回滚意图路由器**：删除标准化函数，使用原来的直接透传
3. **回滚命令处理器**：使用原来的参数提取逻辑

每个步骤都是独立的，可以单独回滚。