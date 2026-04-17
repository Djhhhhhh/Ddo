/**
 * REPL 命令注册中心
 * 统一管理和分发所有 REPL 命令
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { ReplMode, ModeManager } from '../mode';
import { ParsedCommand } from '../parser';

/**
 * 命令上下文
 */
export interface CommandContext {
  /** 位置参数 */
  args: string[];
  /** 选项（flags） */
  flags: Record<string, string | boolean>;
  /** readline 接口 */
  rl: readline.Interface;
  /** 当前模式 */
  mode: ReplMode;
  /** 模式管理器 */
  modeManager: ModeManager;
  /** 设置模式 */
  setMode: (mode: ReplMode) => void;
  /** 原始解析后的命令 */
  parsed: ParsedCommand;
  /** NLP 提取的参数（用于自然语言命令） */
  nlpParameters?: Record<string, unknown>;
}

/**
 * 命令输出类型
 * 用于区分 AI 对话和普通命令，控制提示符换行行为
 */
export enum CommandType {
  /** AI 对话 */
  Chat,
  /** 普通命令 */
  Command,
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 是否继续 REPL */
  shouldContinue: boolean;
  /** 输出类型 */
  outputType: CommandType;
  /** 命令输出（可选） */
  response?: string;
}

/**
 * 命令定义接口
 */
export interface ReplCommand {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 使用示例 */
  usage?: string;
  /** 命令别名 */
  aliases?: string[];
  /** 适用的模式（如果不指定，则所有模式都可用） */
  modes?: ReplMode[];
  /**
   * 命令处理器
   * @returns 返回 CommandResult 控制 REPL 行为和输出类型
   */
  handler: (ctx: CommandContext) => Promise<CommandResult>;
}

/**
 * 命令注册表
 */
class CommandRegistry {
  private commands = new Map<string, ReplCommand>();
  private aliasMap = new Map<string, string>();

  /**
   * 注册命令
   */
  register(command: ReplCommand): void {
    this.commands.set(command.name, command);

    // 注册别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.set(alias, command.name);
      }
    }
  }

  /**
   * 获取命令
   */
  get(name: string): ReplCommand | undefined {
    // 直接查找
    const cmd = this.commands.get(name);
    if (cmd) return cmd;

    // 通过别名查找
    const realName = this.aliasMap.get(name);
    if (realName) {
      return this.commands.get(realName);
    }

    return undefined;
  }

  /**
   * 获取所有命令
   */
  getAll(): ReplCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 获取所有命令名称（包括别名）
   */
  getAllNames(): string[] {
    const names = Array.from(this.commands.keys());
    const aliases = Array.from(this.aliasMap.keys());
    return [...names, ...aliases];
  }

  /**
   * 获取适用于指定模式的命令
   */
  getByMode(mode: ReplMode): ReplCommand[] {
    return this.getAll().filter((cmd) => {
      // 如果没有指定 modes，则所有模式都可用
      if (!cmd.modes || cmd.modes.length === 0) {
        return true;
      }
      return cmd.modes.includes(mode);
    });
  }

  /**
   * 检查命令名称是否存在
   */
  has(name: string): boolean {
    return this.commands.has(name) || this.aliasMap.has(name);
  }
}

// 导出单例
export const registry = new CommandRegistry();

/**
   * 执行命令
   */
export async function executeCommand(
  parsed: ParsedCommand,
  rl: readline.Interface,
  modeManager: ModeManager
): Promise<CommandResult> {
  let { name, args, flags } = parsed;

  // 处理命令名：去掉开头的 /（用户在 REPL 中输入 /exit 等价于 exit）
  if (name.startsWith('/')) {
    name = name.slice(1);
  }

  const command = registry.get(name);

  if (!command) {
    // 命令不存在
    const ctx: CommandContext = {
      args,
      flags,
      rl,
      mode: modeManager.mode,
      modeManager,
      setMode: (mode) => modeManager.setMode(mode),
      parsed,
    };

    // 尝试在子命令模式下处理自然语言输入
    if (modeManager.isInSubMode()) {
      return await handleSubModeInput(name, args, ctx);
    }

    return await handleUnknownCommand(name, ctx);
  }

  // 检查模式支持
  if (command.modes && command.modes.length > 0) {
    if (!command.modes.includes(modeManager.mode)) {
      console.log(`命令 "${name}" 在当前模式下不可用`);
      return { shouldContinue: true, outputType: CommandType.Command };
    }
  }

  const ctx: CommandContext = {
    args,
    flags,
    rl,
    mode: modeManager.mode,
    modeManager,
    setMode: (mode) => modeManager.setMode(mode),
    parsed,
  };

  return await command.handler(ctx);
}

/**
 * 处理子命令模式下的输入
 * 现在只处理 Chat 模式，其他模式已统一为对话模式
 */
async function handleSubModeInput(
  input: string,
  args: string[],
  ctx: CommandContext
): Promise<CommandResult> {
  const mode = ctx.modeManager.mode;

  switch (mode) {
    case ReplMode.Chat:
      // 在 chat 模式下，所有输入都视为聊天消息
      {
        const fullText = [input, ...args].join(' ').trim();
        if (!fullText) {
          return { shouldContinue: true, outputType: CommandType.Chat };
        }

        // Chat 模式下不显示"你:"，直接显示 AI 回复
        try {
          const { getApiClient } = await import('../../services/api-client');
          const apiClient = getApiClient();

          console.log(chalk.gray('正在等待 AI 回复...'));
          console.log();

          const response = await apiClient.chat([
            { role: 'user', content: fullText }
          ], false);

          console.log(chalk.green('AI:'), response.content);
        } catch (err) {
          console.log(chalk.red('请求失败:'), err instanceof Error ? err.message : String(err));
        }

        console.log();
        return { shouldContinue: true, outputType: CommandType.Chat };
      }

    default:
      return await handleUnknownCommand(input, ctx);
  }
}

/**
 * 处理未知命令（默认模式）
 * 使用 NLP 进行意图识别和路由
 */
async function handleUnknownCommand(
  name: string,
  ctx: CommandContext
): Promise<CommandResult> {
  // 在默认模式下，未知命令视为自然语言输入
  if (ctx.mode === ReplMode.Default) {
    const fullText = [name, ...ctx.args].join(' ').trim();

    if (!fullText) {
      console.log('请输入内容');
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    // 知识库优先模式：只显示检索中提示，不显示用户输入
    if (ctx.modeManager.kbPriorityMode) {
      try {
        const { getApiClient } = await import('../../services/api-client');
        const apiClient = getApiClient();

        console.log(chalk.magenta('📚 正在检索知识库...'));

        const kbResult = await apiClient.askKnowledge(fullText);
        if (kbResult && kbResult.answer) {
          console.log(chalk.magenta('📚 知识库回复:'), kbResult.answer);
          console.log();
          return { shouldContinue: true, outputType: CommandType.Chat };
        }
      } catch (err) {
        // 知识库检索失败，继续正常的意图识别流程
        console.log(chalk.gray('知识库检索失败，继续分析意图...'));
        console.log();
      }
    }

    console.log(chalk.cyan('正在分析...'));

    try {
      // 调用 NLP 服务进行意图识别
      const nlpService = await import('../../services/nlp').then(m => m.getNLPService());
      const intentRouter = await import('../intent-router').then(m => m.getIntentRouter());

      const nlpResponse = await nlpService.analyzeText(fullText);

      // 路由到对应动作
      const action = intentRouter.route(nlpResponse);

      // 执行路由动作
      switch (action.type) {
        case 'switch_mode':
          if (action.targetMode) {
            // 保存 NLP 参数到上下文
            ctx.nlpParameters = action.parameters;

            // Timer/Kb/Mcp 模式直接路由到对应命令，不切换显示模式
            if (action.targetMode === ReplMode.Timer) {
              const cmd = registry.get('timer-add');
              if (cmd) {
                return await cmd.handler(ctx);
              }
            } else if (action.targetMode === ReplMode.Kb) {
              const cmd = registry.get('kb-add');
              if (cmd) {
                return await cmd.handler(ctx);
              }
            } else if (action.targetMode === ReplMode.Mcp) {
              const cmd = registry.get('mcp-add');
              if (cmd) {
                return await cmd.handler(ctx);
              }
            }

            // Chat 和 Default 模式正常处理
            ctx.setMode(action.targetMode);
          }
          return { shouldContinue: true, outputType: CommandType.Command };

        case 'execute_command':
          if (action.targetCommand) {
            // 递归执行命令
            const cmd = registry.get(action.targetCommand);
            if (cmd) {
              return await cmd.handler(ctx);
            }
          }
          return { shouldContinue: true, outputType: CommandType.Command };

        case 'chat':
          // chat 意图时调用 chat API 进行对话
          // 不显示"你: xxx"，直接显示思考中和AI回复
          {
            const fullText = [name, ...ctx.args].join(' ').trim();

            try {
              const { getApiClient } = await import('../../services/api-client');
              const apiClient = getApiClient();

              console.log(chalk.gray('正在思考...'));

              const response = await apiClient.chat([
                { role: 'user', content: fullText }
              ], false);

              console.log(chalk.cyan(' ◆ '), response.content);
            } catch (err) {
              console.log(chalk.red('请求失败:'), err instanceof Error ? err.message : String(err));
            }

            console.log();
            return { shouldContinue: true, outputType: CommandType.Chat };
          }

        case 'show_status':
          // 执行 status 命令
          const statusCmd = registry.get('status');
          if (statusCmd) {
            return await statusCmd.handler(ctx);
          }
          return { shouldContinue: true, outputType: CommandType.Command };

        case 'show_help':
          // 执行 help 命令
          const helpCmd = registry.get('help');
          if (helpCmd) {
            return await helpCmd.handler(ctx);
          }
          return { shouldContinue: true, outputType: CommandType.Command };

        case 'unknown':
        default:
          // 无法识别，默认进入聊天模式
          console.log(chalk.yellow('无法理解意图，进入聊天模式...'));
          ctx.setMode(ReplMode.Chat);
          return { shouldContinue: true, outputType: CommandType.Chat };
      }
    } catch (err) {
      // NLP 服务调用失败，降级到聊天模式
      console.log(chalk.yellow('NLP 服务暂时不可用，进入聊天模式...'));
      console.log(chalk.gray(`错误: ${err instanceof Error ? err.message : String(err)}`));
      ctx.setMode(ReplMode.Chat);
      return { shouldContinue: true, outputType: CommandType.Chat };
    }
  }

  console.log(`未知命令: ${name}`);
  console.log('输入 /help 查看可用命令');
  return { shouldContinue: true, outputType: CommandType.Command };
}
