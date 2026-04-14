# CLI Service Rules

> 由 AI 在开发过程中自动维护的规则文件。
> 发现时间：2026-04-14

## 架构规则

- CLI 是 Ddo 的入口层，不承载核心业务逻辑，只负责：
  - 命令解析和分发
  - 服务生命周期管理（通过子进程/API 调用）
  - 用户交互（REPL、命令输出）
- 所有业务逻辑通过 API 调用委托给 server-go 或 llm-py
- 目录结构：
  - `src/commands/` - CLI 命令实现
  - `src/utils/` - 通用工具函数
  - `src/templates/` - 配置文件模板
  - `src/types/` - TypeScript 类型定义

## 代码规范

- 使用 TypeScript + strict 模式
- CLI 命令采用 async/await 编写，统一返回 `{ success, data, error }` 结构
- 用户输出统一使用 `logger.ts`，支持级别控制（debug/info/warn/error）
- 路径处理统一使用 `path.ts` 中的工具函数，支持 Windows/macOS 跨平台
- Docker 操作统一封装在 `docker.ts`，错误处理要友好

## 常见陷阱

- Windows 路径分隔符问题：使用 `path.join()` 而不是字符串拼接
- Docker Compose v1/v2 兼容：`docker compose` vs `docker-compose`，使用 `getComposeCommand()` 自动检测
- 配置文件生成要支持幂等性：允许重复运行 `ddo init` 不报错
- 数据目录优先级：DDO_DATA_DIR 环境变量 > --data-dir 参数 > 默认路径

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
