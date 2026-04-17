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
 * 使用统一的 conversation/chat API 进行意图识别、路由决策和对话生成
 */
async function handleUnknownCommand(
  name: string,
  ctx: CommandContext
): Promise<CommandResult> {
  // 在默认模式下，未知命令视为自然语言输入
  if (ctx.mode === ReplMode.Default) {
    const fullText = [name, ...ctx.args].join(' ').trim();

    if (!fullText) {
      return { shouldContinue: true, outputType: CommandType.Command };
    }

    // 知识库优先模式
    const kbPriority = ctx.modeManager.kbPriorityMode;

    // 立即显示思考状态，让用户感知到正在处理
    process.stdout.write(`${chalk.cyan('🔍')} 分析中... \n`);

    try {
      const { getApiClient } = await import('../../services/api-client');
      const apiClient = getApiClient();

      // 调用统一的流式对话接口
      // Go 层处理：意图识别 → 路由决策 → RAG 检索 → LLM 生成
      const response = await apiClient.conversationChatStream({
        query: fullText,
        stream: true,
        kb_priority: kbPriority,
      });

      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      // 处理 SSE 流式响应
      await processConversationStream(response.body);

      return { shouldContinue: true, outputType: CommandType.Chat };

    } catch (err) {
      // 降级到聊天模式
      console.log();
      console.log(chalk.yellow('⚠️ AI 服务暂时不可用'));
      ctx.setMode(ReplMode.Chat);
      return { shouldContinue: true, outputType: CommandType.Chat };
    }
  }

  console.log(`未知命令: ${name}`);
  console.log('输入 /help 查看可用命令');
  return { shouldContinue: true, outputType: CommandType.Command };
}

/**
 * 处理统一的对话流式响应
 * 接收 Go 层的 SSE 事件并展示状态变化和流式输出
 */
async function processConversationStream(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // 状态跟踪
  let isStreaming = false;
  let currentEventType = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) continue;

        // 解析 SSE 事件类型行: event:intent_detected
        if (trimmedLine.startsWith('event:')) {
          currentEventType = trimmedLine.slice(6).trim();
          continue;
        }

        // 解析 SSE 数据行: data:{...}
        if (!trimmedLine.startsWith('data:')) continue;

        const data = trimmedLine.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const eventData = JSON.parse(data);

          switch (currentEventType) {
            case 'intent_detected':
              // 简短显示意图类型
              if (eventData.need_knowledge) {
                process.stdout.write(`${chalk.green('✓')} ${chalk.magenta('📚 知识查询')}\n`);
              } else {
                const intentName = getIntentName(eventData.intent);
                process.stdout.write(`${chalk.green('✓')} ${chalk.cyan('💬 ' + intentName)}\n`);
              }
              break;

            case 'retrieving':
              process.stdout.write(`${chalk.magenta('📚')} 检索中...\n`);
              break;

            case 'docs_found':
              if (eventData.count > 0) {
                process.stdout.write(`${chalk.green('✓')} 找到 ${chalk.cyan(eventData.count)} 条文档\n`);
              } else {
                process.stdout.write(`${chalk.gray('○')} 知识库暂无相关文档\n`);
              }
              break;

            case 'generating':
              if (!isStreaming) {
                isStreaming = true;
                process.stdout.write(`${chalk.green('✨')} `);
              }
              break;

            case 'delta':
              if (!isStreaming) {
                isStreaming = true;
                process.stdout.write(`${chalk.green('✨')} `);
              }
              process.stdout.write(eventData.content || '');
              break;

            case 'completed':
              console.log();
              console.log();

              // 显示来源（如果有）
              if (eventData.sources && eventData.sources.length > 0) {
                console.log(chalk.gray('─'.repeat(40)));
                console.log(`${chalk.gray('📚 参考来源:')}`);
                for (const source of eventData.sources) {
                  console.log(`   • ${chalk.gray(source)}`);
                }
                console.log(chalk.gray('─'.repeat(40)));
                console.log();
              }
              break;

            case 'clarify':
              console.log(`${chalk.yellow('❓')} ${eventData.message || '需要确认...'}`);
              if (eventData.suggestions) {
                for (let i = 0; i < eventData.suggestions.length; i++) {
                  console.log(`   [${i + 1}] ${eventData.suggestions[i]}`);
                }
              }
              break;

            case 'tool_call':
              console.log(`${chalk.cyan('📋')} 执行工具: ${eventData.tool}`);
              break;

            case 'error':
              console.log(`${chalk.red('⚠️')} 错误: ${eventData.message}`);
              break;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 获取意图显示名称
 */
function getIntentName(intent: string): string {
  const map: Record<string, string> = {
    'chat': '闲聊',
    'chat.greeting': '问候',
    'chat.farewell': '告别',
    'knowledge.query': '知识查询',
    'knowledge.search': '知识搜索',
    'knowledge.add': '添加知识',
    'timer.add': '创建定时任务',
    'timer.list': '查看定时任务',
    'unknown': '闲聊',
  };
  return map[intent] || intent;
}
