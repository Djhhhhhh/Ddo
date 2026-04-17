# CLI Service Rules

> 由 AI 在开发过程中自动维护的规则文件。
> 发现时间：2026-04-14
> 更新时间：2026-04-16

## 架构规则

- CLI 是 Ddo 的入口层，不承载核心业务逻辑，只负责：
  - 命令解析和分发
  - 服务生命周期管理（通过子进程/API 调用）
  - 用户交互（REPL、命令输出）
- 所有业务逻辑通过 API 调用委托给 server-go
- 目录结构：
  - `src/commands/` - CLI 命令实现（init、start、stop、status、logs）
  - `src/services/` - 服务管理模块（PID文件、健康检查、进程管理、NLP）
  - `src/repl/` - REPL 交互模式（命令解析、模式管理、命令注册、意图路由）
    - `src/repl/parser.ts` - 命令解析，支持参数、flags、引号字符串
    - `src/repl/mode.ts` - 模式管理（Default/Chat/Kb/Timer/Mcp）
    - `src/repl/intent-router.ts` - 意图路由器，根据 NLP 结果路由到对应动作
    - `src/repl/commands/` - REPL 命令实现（/exit、/help、/chat、/status、/kb、/timer、/mcp）
    - `src/repl/completer.ts` - Tab 自动补全
  - `src/utils/` - 通用工具函数
  - `src/templates/` - 配置文件模板
  - `src/types/` - TypeScript 类型定义
- REPL 命令架构（发现日期：2026-04-14）：
  - 使用 `registry` 单例注册所有命令
  - 命令定义实现 `ReplCommand` 接口，包含 name、description、aliases、handler
  - 支持子命令模式（/kb、/timer、/mcp），模式内直接输入子命令
  - 解析器支持 `-a`、`-abc` 组合选项、`--long`、`--key=value` 格式

### NLP 集成架构（新增 2026-04-16）

- **NLP Service** (`src/services/nlp.ts`)：
  - 封装与 llm-py `/api/nlp` 接口的通信
  - 提供 `analyzeText()` 和 `parseCommand()` 两个核心方法
  - 支持超时控制和错误处理
  - 降级机制：NLP 服务不可用时自动进入 chat 模式
- **意图路由器** (`src/repl/intent-router.ts`)：
  - 根据 NLP 响应中的 intent 字段路由到对应动作
  - 支持的路由类型：switch_mode、execute_command、chat、show_status、show_help、unknown
  - 意图映射表支持前缀匹配（如 `timer.create.hourly` 匹配 `timer.create`）
  - **参数标准化**：内置 `normalizeKBParams`、`normalizeTimerParams`、`normalizeMCPParams` 函数
  - 参数映射表处理别名：`title`←`name`←`subject`、`content`←`text`←`body` 等
- **自然语言处理流程**：
  1. 用户在默认模式下输入非命令文本
  2. 调用 `handleUnknownCommand` 处理
  3. 调用 NLP Service `analyzeText()` 获取意图
  4. 意图路由器根据 intent 路由到对应动作
  5. 执行动作（切换模式/执行命令/进入聊天等）

### 参数标准化契约（新增 2026-04-16）

意图路由器是参数标准化的统一转换层，确保 NLP 返回的参数格式统一：

| 命令类型 | 标准参数 | 别名映射 |
|----------|----------|----------|
| KB 命令 | title, content, tags | name→title, text→content |
| Timer 命令 | name, cron, url, method | schedule→cron, endpoint→url |
| MCP 命令 | name, type, config | - |

**处理嵌套结构**：自动展平 `{params: {...}}`、`{data: {...}}`、`{metadata: {...}}` 等嵌套格式

**参数验证**（`src/repl/validators.ts`）：
- KB：`validateKBParams()` - 验证 title/content 非空
- Timer：`validateTimerParams()` - 验证 cron 格式（5字段）、url 格式
- MCP：`validateMCPParams()` - 验证 name/type/config 及 type 枚举值

## 代码规范

- 使用 TypeScript + strict 模式
- CLI 命令采用 async/await 编写，统一返回 `{ success, data, error }` 结构
- REPL 命令 handler 返回 `Promise<boolean>`，`true` 表示继续 REPL，`false` 表示退出（发现日期：2026-04-14）
- 用户输出统一使用 `logger.ts`，支持级别控制（debug/info/warn/error）
- 路径处理统一使用 `path.ts` 中的工具函数，支持 Windows/macOS 跨平台
- Docker 操作统一封装在 `docker.ts`，错误处理要友好
- 服务管理统一使用 `services/manager.ts`，包含 PID 文件管理、健康检查、进程启停
- REPL 命令通过 `registry.register()` 注册，支持 name + aliases 多名称映射

## 常见陷阱

- Windows 路径分隔符问题：使用 `path.join()` 而不是字符串拼接
- Docker Compose v1/v2 兼容：`docker compose` vs `docker-compose`，使用 `getComposeCommand()` 自动检测
- 配置文件生成要支持幂等性：允许重复运行 `ddo init` 不报错
- 数据目录优先级：DDO_DATA_DIR 环境变量 > --data-dir 参数 > 默认路径
- PID 文件存储在 `<dataDir>/services/<service-name>.pid`
- 健康检查通过 HTTP 轮询 `/health` 端点，超时 30 秒
- 服务启动失败时自动回滚已启动的服务
- Windows 进程使用 `tasklist`/`taskkill` 管理，Unix 使用 `kill` 信号
- NLP 调用使用动态 import 避免循环依赖
- NLP 服务不可用时必须降级到 chat 模式，不能直接报错退出

## 示例参考

### 添加新命令的标准结构

```typescript
// src/commands/new-cmd.ts
import logger from '../utils/logger';

interface NewCmdOptions {
  // 命令选项
}

export async function newCmdCommand(options: NewCmdOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  logger.section('命令标题');

  try {
    // 1. 参数校验
    // 2. 执行操作
    // 3. 输出结果
    logger.success('操作成功');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// src/index.ts
import { newCmdCommand } from './commands/new-cmd';

program
  .command('new-cmd')
  .description('命令描述')
  .option('--some-opt', '选项说明')
  .action(async (options) => {
    const result = await newCmdCommand(options);
    if (!result.success) {
      logger.error(result.error);
      process.exit(1);
    }
  });
```

### NLP Service 使用示例（新增 2026-04-16）

```typescript
import { getNLPService } from '../services/nlp';

// 获取 NLP Service 实例
const nlpService = getNLPService();

// 意图识别
const response = await nlpService.analyzeText('创建一个每小时的定时任务');
console.log(`意图: ${response.intent}, 置信度: ${response.confidence}`);

// 命令解析
const parseResult = await nlpService.parseCommand(
  '帮我查一下知识库',
  ['kb.add', 'kb.search', 'kb.list']
);
console.log(`解析命令: ${parseResult.command}`);

// 检查服务可用性
const available = await nlpService.isAvailable();
```

### 意图路由器使用示例（新增 2026-04-16）

```typescript
import { getIntentRouter } from '../repl/intent-router';

const router = getIntentRouter();

// 路由 NLP 响应到对应动作
const action = router.route(nlpResponse);

switch (action.type) {
  case 'switch_mode':
    console.log(`切换到 ${action.targetMode} 模式`);
    break;
  case 'execute_command':
    console.log(`执行命令: ${action.targetCommand}`);
    break;
  case 'chat':
    console.log('进入聊天模式');
    break;
}
```
