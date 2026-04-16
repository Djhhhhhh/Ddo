# Bugfix: REPL 自然语言命令执行失败

> 创建日期：2026-04-16
> 影响范围：CLI REPL 自然语言意图路由

## 问题描述

NLP 能正确识别用户意图（如 `timer.create`、`kb.add`），但在执行相应命令时没有正确调用 API。

### 日志观察

```
NLP: intent=kb.add, parameters={title: "测试", content: "内容"}  ✓ 识别正确
但实际创建知识库词条时没有正确传递参数
```

## 根因分析

### 问题 1：参数传递链路断裂

**当前流程**：

```
handleUnknownCommand()  →  nlpService.analyzeText()
                                    ↓
                            intentRouter.route(nlpResponse)
                                    ↓
                           action.parameters (应该包含 title, content)
                                    ↓
                           ctx.nlpParameters = action.parameters
                                    ↓
                           registry.get('kb-add').handler(ctx)
                                    ↓
                           ctx.nlpParameters 传递给 kbAddCommand
```

**问题点**：在 `intent-router.ts` 的 `route()` 函数中，`parameters` 直接从 `nlpResponse.parameters` 获取：

```typescript
// services/cli/src/repl/intent-router.ts:131-161
function route(nlpResponse: NLPResponse): RouteAction {
    const { intent, parameters, reply } = nlpResponse;

    // 查找意图映射
    const mapping = findMapping(intent);

    // ...

    const action: RouteAction = {
        type: mapping.action,
        parameters,  // ← 直接使用 nlpResponse.parameters，没有做转换
    };
    // ...
}
```

如果 NLP 返回的参数名（如 `title`）与命令期望的参数名匹配，应该能正常工作。但问题可能在于：

1. **NLP 返回的参数结构与命令期望不一致**
   - NLP 可能返回 `{title: "...", content: "..."}`
   - 但命令可能期望 `{title: "..."}` 或者参数名不同

2. **参数传递被忽略**
   - `ctx.nlpParameters` 被设置但 `kb-add` 命令可能没有正确读取

### 问题 2：参数映射不完整

**kb-commands.ts 中参数收集逻辑**：

```typescript
// services/cli/src/repl/commands/kb-commands.ts:81-84
if (nlpParameters) {
  if (!initialValues.title && nlpParameters.title) initialValues.title = String(nlpParameters.title);
  if (!initialValues.content && nlpParameters.content) initialValues.content = String(nlpParameters.content);
}
```

**潜在问题**：
1. 只检查了 `title` 和 `content` 两个参数
2. 如果 NLP 返回的参数名是 `name` 而不是 `title`，就不会被使用
3. 如果 NLP 返回的参数在嵌套对象中（如 `{params: {title: "..."}}`），就不会被读取

### 问题 3：InteractivePrompt 只会跳过已有值的参数

**prompt-helper.ts 中 `collectRequiredParams`**：

```typescript
async collectRequiredParams(
  paramDefs: ParameterDef[],
  initialValues?: Record<string, string>
): Promise<{ params: Record<string, string | null>; allCollected: boolean }> {
  // ...
  for (const def of paramDefs) {
    // 只处理必填参数或已有初始值的参数
    if (!def.required && !initial[def.name]) {
      continue;  // ← 跳过非必填且没有初始值的参数
    }
    // ...
  }
}
```

这意味着如果 `nlpParameters.title` 没有被正确提取到 `initialValues.title`，用户会被要求重新输入。

## 修复方案

### 方案 A：增强意图路由器的参数提取（推荐）

**修改文件**: `services/cli/src/repl/intent-router.ts`

**修改位置**: `route()` 函数

```typescript
function route(nlpResponse: NLPResponse): RouteAction {
  const { intent, parameters, reply } = nlpResponse;

  // 查找意图映射
  const mapping = findMapping(intent);

  // ...

  // 规范化参数：确保参数是扁平的
  let normalizedParams = parameters;

  // 如果参数在 nested 对象中，展开它
  if (parameters && typeof parameters === 'object') {
    // 处理 { params: { title: "..." } } 或 { data: { title: "..." } }
    if (parameters.params && typeof parameters.params === 'object') {
      normalizedParams = { ...parameters.params };
    }
    if (parameters.data && typeof parameters.data === 'object') {
      normalizedParams = { ...parameters.data };
    }
    // 如果参数在 nested.metadata 中
    if (parameters.metadata && typeof parameters.metadata === 'object') {
      normalizedParams = { ...normalizedParams, ...parameters.metadata };
    }
  }

  const action: RouteAction = {
    type: mapping.action,
    parameters: normalizedParams,  // 使用规范化后的参数
  };
  // ...
}
```

### 方案 B：增强 kb-commands.ts 和 timer-commands.ts 的参数映射

**修改文件**: `services/cli/src/repl/commands/kb-commands.ts`

**修改位置**: `kbAddCommand.handler`

```typescript
// 增强参数提取逻辑
if (nlpParameters) {
  // 直接参数
  if (!initialValues.title && nlpParameters.title) initialValues.title = String(nlpParameters.title);
  if (!initialValues.content && nlpParameters.content) initialValues.content = String(nlpParameters.content);

  // 别名参数（NLP 可能使用不同的命名）
  if (!initialValues.title && nlpParameters.name) initialValues.title = String(nlpParameters.name);
  if (!initialValues.title && nlpParameters.subject) initialValues.title = String(nlpParameters.subject);
  if (!initialValues.content && nlpParameters.text) initialValues.content = String(nlpParameters.text);
  if (!initialValues.content && nlpParameters.body) initialValues.content = String(nlpParameters.body);
  if (!initialValues.content && nlpParameters.description) initialValues.content = String(nlpParameters.description);

  // 处理嵌套参数 { params: { title: "..." } }
  const params = (nlpParameters as any).params || (nlpParameters as any).data || {};
  if (!initialValues.title && params.title) initialValues.title = String(params.title);
  if (!initialValues.content && params.content) initialValues.content = String(params.content);

  // 处理 metadata 嵌套
  const metadata = (nlpParameters as any).metadata || {};
  if (!initialValues.title && metadata.title) initialValues.title = String(metadata.title);
  if (!initialValues.content && metadata.content) initialValues.content = String(metadata.content);
}
```

**修改文件**: `services/cli/src/repl/commands/timer-commands.ts`

**修改位置**: `timerAddCommand.handler`

```typescript
// 增强参数提取逻辑
if (nlpParameters) {
  // 直接参数
  if (!initialValues.cron && nlpParameters.cron) initialValues.cron = String(nlpParameters.cron);
  if (!initialValues.url && nlpParameters.url) initialValues.url = String(nlpParameters.url);
  if (!initialValues.method && nlpParameters.method) initialValues.method = String(nlpParameters.method);
  if (!initialValues.name && nlpParameters.name) initialValues.name = String(nlpParameters.name);

  // 别名参数
  if (!initialValues.cron && nlpParameters.schedule) initialValues.cron = String(nlpParameters.schedule);
  if (!initialValues.cron && nlpParameters.time) initialValues.cron = String(nlpParameters.time);
  if (!initialValues.url && nlpParameters.callback_url) initialValues.url = String(nlpParameters.callback_url);
  if (!initialValues.url && nlpParameters.endpoint) initialValues.url = String(nlpParameters.endpoint);
  if (!initialValues.url && nlpParameters.webhook) initialValues.url = String(nlpParameters.webhook);

  // 处理嵌套参数
  const params = (nlpParameters as any).params || (nlpParameters as any).data || {};
  if (!initialValues.cron && params.cron) initialValues.cron = String(params.cron);
  if (!initialValues.url && params.url) initialValues.url = String(params.url);

  // 处理 metadata 嵌套
  const metadata = (nlpParameters as any).metadata || {};
  if (!initialValues.cron && metadata.cron) initialValues.cron = String(metadata.cron);
  if (!initialValues.url && metadata.url) initialValues.url = String(metadata.url);
}
```

### 方案 C：添加调试日志（诊断用）

**修改文件**: `services/cli/src/repl/commands/index.ts`

在 `handleUnknownCommand` 中添加调试日志：

```typescript
case 'switch_mode':
  if (action.targetMode) {
    console.log(chalk.gray(`[DEBUG] switch_mode target=${action.targetMode}`));
    console.log(chalk.gray(`[DEBUG] parameters=${JSON.stringify(action.parameters)}`));

    // 保存 NLP 参数到上下文
    ctx.nlpParameters = action.parameters;
    console.log(chalk.gray(`[DEBUG] ctx.nlpParameters=${JSON.stringify(ctx.nlpParameters)}`));

    // ...
  }
```

**修改文件**: `services/cli/src/repl/commands/kb-commands.ts`

```typescript
handler: async (ctx) => {
  const { args, nlpParameters, rl } = ctx;

  console.log(chalk.gray(`[DEBUG] kb-add received nlpParameters=${JSON.stringify(nlpParameters)}`));
  console.log(chalk.gray(`[DEBUG] kb-add received args=${JSON.stringify(args)}`));

  // ...
}
```

## 完整修复（组合方案 A + B + C）

### Step 1：添加调试日志（诊断）

**修改文件**: `services/cli/src/repl/commands/index.ts:268-295`

```typescript
case 'switch_mode':
  if (action.targetMode) {
    // 调试日志
    console.log(chalk.cyan('[意图路由]'), `targetMode=${action.targetMode}`);
    console.log(chalk.gray('[意图路由]'), `parameters=${JSON.stringify(action.parameters)}`);

    // 保存 NLP 参数到上下文
    ctx.nlpParameters = action.parameters;

    // Timer/Kb/Mcp 模式直接路由到对应命令，不切换显示模式
    if (action.targetMode === ReplMode.Timer) {
      const cmd = registry.get('timer-add');
      if (cmd) {
        console.log(chalk.green('[执行命令]'), 'timer-add');
        return await cmd.handler(ctx);
      }
    } else if (action.targetMode === ReplMode.Kb) {
      const cmd = registry.get('kb-add');
      if (cmd) {
        console.log(chalk.green('[执行命令]'), 'kb-add');
        return await cmd.handler(ctx);
      }
    } else if (action.targetMode === ReplMode.Mcp) {
      const cmd = registry.get('mcp-add');
      if (cmd) {
        console.log(chalk.green('[执行命令]'), 'mcp-add');
        return await cmd.handler(ctx);
      }
    }

    // Chat 和 Default 模式正常处理
    ctx.setMode(action.targetMode);
  }
  return true;
```

**修改文件**: `services/cli/src/repl/commands/kb-commands.ts:53-90`

```typescript
handler: async (ctx) => {
  const { args, nlpParameters, rl } = ctx;
  const prompt = new InteractivePrompt(rl);

  // 调试日志
  console.log(chalk.gray(`[kb-add] nlpParameters=${JSON.stringify(nlpParameters)}`));
  console.log(chalk.gray(`[kb-add] args=${JSON.stringify(args)}`));

  // 定义参数
  const paramDefs: ParameterDef[] = [
    // ...
  ];

  // 从命令行参数和 NLP 参数中提取初始值
  const initialValues: Record<string, string> = {};

  if (args.length >= 1) initialValues.title = args[0];
  if (args.length >= 2) initialValues.content = args.slice(1).join(' ');

  // 增强 NLP 参数提取
  if (nlpParameters) {
    console.log(chalk.gray(`[kb-add] processing nlpParameters`));

    // 直接参数
    if (!initialValues.title && nlpParameters.title) {
      initialValues.title = String(nlpParameters.title);
      console.log(chalk.green('[kb-add]'), `extracted title from nlpParameters.title`);
    }
    if (!initialValues.content && nlpParameters.content) {
      initialValues.content = String(nlpParameters.content);
      console.log(chalk.green('[kb-add]'), `extracted content from nlpParameters.content`);
    }

    // 别名参数
    if (!initialValues.title && nlpParameters.name) initialValues.title = String(nlpParameters.name);
    if (!initialValues.content && nlpParameters.text) initialValues.content = String(nlpParameters.text);
    if (!initialValues.content && nlpParameters.body) initialValues.content = String(nlpParameters.body);

    // 处理嵌套参数
    const params = (nlpParameters as any).params || {};
    if (!initialValues.title && params.title) initialValues.title = String(params.title);
    if (!initialValues.content && params.content) initialValues.content = String(params.content);
  }

  console.log(chalk.gray(`[kb-add] initialValues=${JSON.stringify(initialValues)}`));

  // 渐进式收集参数
  // ...
}
```

### Step 2：增强意图路由器参数规范化

**修改文件**: `services/cli/src/repl/intent-router.ts:128-165`

```typescript
function route(nlpResponse: NLPResponse): RouteAction {
  const { intent, parameters, reply } = nlpResponse;

  // 查找意图映射
  const mapping = findMapping(intent);

  if (!mapping) {
    // 尝试关键词兜底匹配
    const keywordFallback = findKeywordFallback(intent);
    if (keywordFallback) {
      const action: RouteAction = {
        type: keywordFallback.action,
        parameters,
      };
      if (keywordFallback.targetMode) {
        action.targetMode = keywordFallback.targetMode;
      }
      return action;
    }

    return { type: 'chat' };
  }

  // 规范化参数：确保参数是扁平的
  let normalizedParams = parameters || {};

  // 如果参数在 nested 对象中，展开它
  if (typeof parameters === 'object' && parameters !== null) {
    // 处理常见嵌套结构
    if ((parameters as any).params && typeof (parameters as any).params === 'object') {
      normalizedParams = { ...normalizedParams, ...(parameters as any).params };
    }
    if ((parameters as any).data && typeof (parameters as any).data === 'object') {
      normalizedParams = { ...normalizedParams, ...(parameters as any).data };
    }
    // 处理 metadata
    if ((parameters as any).metadata && typeof (parameters as any).metadata === 'object') {
      normalizedParams = { ...normalizedParams, ...(parameters as any).metadata };
    }
  }

  const action: RouteAction = {
    type: mapping.action,
    parameters: normalizedParams,
  };

  switch (mapping.action) {
    case 'switch_mode':
      action.targetMode = mapping.targetMode;
      action.reply = reply || `进入 ${mapping.targetMode} 模式`;
      break;
    case 'execute_command':
      action.targetCommand = mapping.targetCommand;
      break;
    case 'chat':
      action.reply = reply || '好的，让我们聊聊。';
      break;
    // ...
  }

  return action;
}
```

### Step 3：增强 kb-commands.ts 和 timer-commands.ts 的参数映射

（同方案 B 的修改）

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `services/cli/src/repl/commands/index.ts` | 修改 | 添加调试日志 |
| `services/cli/src/repl/commands/kb-commands.ts` | 修改 | 增强参数提取、调试日志 |
| `services/cli/src/repl/commands/timer-commands.ts` | 修改 | 增强参数提取、调试日志 |
| `services/cli/src/repl/intent-router.ts` | 修改 | 参数规范化 |

## 验证步骤

1. 重启 CLI 服务
2. 执行自然语言命令：`帮我添加一条知识库，标题是"测试知识"，内容是"这是测试内容"`
3. 观察日志输出：
   - `[意图路由] targetMode=Kb` - 意图路由正确
   - `[意图路由] parameters={...}` - 参数传递正确
   - `[kb-add] nlpParameters={...}` - 命令收到正确参数
   - `[kb-add] initialValues={...}` - 初始值提取正确
4. 检查知识库是否正确创建

## 预期修复后的行为

```
用户: 帮我添加一条知识库，标题是"测试知识"，内容是"这是测试内容"

CLI 输出:
[意图路由] targetMode=Kb
[意图路由] parameters={"title":"测试知识","content":"这是测试内容"}
[kb-add] nlpParameters={"title":"测试知识","content":"这是测试内容"}
[kb-add] initialValues={"title":"测试知识","content":"这是测试内容"}
  标题: 测试知识 (已提供)
  内容: 这是测试内容 (已提供)
  标签 (可选)

词条信息
────────────────────────────────────
  标题: 测试知识
  内容: 这是测试内容
  标签: (无)

确认创建? (y/n)
```

## 影响范围

- CLI REPL 意图路由
- KB/Timer/MCP 命令的参数提取
- 修复后自然语言命令能正确传递参数给 API