/**
 * REPL 命令注册中心
 * 统一管理和分发所有 REPL 命令
 */

import * as readline from 'readline';
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
   * @returns 返回 true 表示继续 REPL，返回 false 表示退出
   */
  handler: (ctx: CommandContext) => Promise<boolean>;
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
): Promise<boolean> {
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
      return true;
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
 */
async function handleSubModeInput(
  input: string,
  args: string[],
  ctx: CommandContext
): Promise<boolean> {
  const mode = ctx.modeManager.mode;

  switch (mode) {
    case ReplMode.Chat:
      // 在 chat 模式下，所有输入都视为聊天消息
      console.log(`[Chat] ${input} ${args.join(' ')}`);
      console.log('聊天功能将在后续实现...');
      return true;

    case ReplMode.Kb:
      return await handleKbSubCommand(input, args, ctx);

    case ReplMode.Timer:
      return await handleTimerSubCommand(input, args, ctx);

    case ReplMode.Mcp:
      return await handleMcpSubCommand(input, args, ctx);

    default:
      return await handleUnknownCommand(input, ctx);
  }
}

/**
 * 处理知识库子命令
 */
async function handleKbSubCommand(
  cmd: string,
  args: string[],
  _ctx: CommandContext
): Promise<boolean> {
  switch (cmd.toLowerCase()) {
    case 'list':
      console.log('知识库列表：');
      console.log('  暂无知识库');
      break;
    case 'add':
      if (args.length < 2) {
        console.log('用法: add <名称> <路径>');
      } else {
        console.log(`添加知识库: ${args[0]} -> ${args[1]}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'search':
      if (args.length === 0) {
        console.log('用法: search <查询内容>');
      } else {
        console.log(`搜索: ${args.join(' ')}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'remove':
    case 'rm':
      if (args.length === 0) {
        console.log('用法: remove <名称>');
      } else {
        console.log(`删除知识库: ${args[0]}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'help':
    case 'h':
      console.log('知识库管理命令：');
      console.log('  list           - 列出所有知识库');
      console.log('  add <n> <p>    - 添加知识库');
      console.log('  search <q>     - 搜索知识库');
      console.log('  remove <n>     - 删除知识库');
      console.log('  help           - 显示帮助');
      break;
    default:
      console.log(`未知命令: ${cmd}`);
      console.log('输入 "help" 查看可用命令');
  }
  return true;
}

/**
 * 处理定时任务子命令
 */
async function handleTimerSubCommand(
  cmd: string,
  args: string[],
  _ctx: CommandContext
): Promise<boolean> {
  switch (cmd.toLowerCase()) {
    case 'list':
      console.log('定时任务列表：');
      console.log('  暂无定时任务');
      break;
    case 'add':
      if (args.length < 2) {
        console.log('用法: add <cron表达式> <命令>');
        console.log('示例: add "0 9 * * *" "echo good morning"');
      } else {
        console.log(`添加定时任务: ${args[0]} -> ${args.slice(1).join(' ')}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'remove':
    case 'rm':
      if (args.length === 0) {
        console.log('用法: remove <任务ID>');
      } else {
        console.log(`删除定时任务: ${args[0]}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'help':
    case 'h':
      console.log('定时任务管理命令：');
      console.log('  list           - 列出所有定时任务');
      console.log('  add <c> <cmd>  - 添加定时任务');
      console.log('  remove <id>    - 删除定时任务');
      console.log('  help           - 显示帮助');
      break;
    default:
      console.log(`未知命令: ${cmd}`);
      console.log('输入 "help" 查看可用命令');
  }
  return true;
}

/**
 * 处理 MCP 子命令
 */
async function handleMcpSubCommand(
  cmd: string,
  args: string[],
  _ctx: CommandContext
): Promise<boolean> {
  switch (cmd.toLowerCase()) {
    case 'list':
      console.log('MCP 服务列表：');
      console.log('  暂无 MCP 配置');
      break;
    case 'add':
      if (args.length < 2) {
        console.log('用法: add <名称> <URL>');
      } else {
        console.log(`添加 MCP: ${args[0]} -> ${args[1]}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'remove':
    case 'rm':
      if (args.length === 0) {
        console.log('用法: remove <名称>');
      } else {
        console.log(`删除 MCP: ${args[0]}`);
        console.log('功能将在后续实现...');
      }
      break;
    case 'help':
    case 'h':
      console.log('MCP 管理命令：');
      console.log('  list           - 列出所有 MCP 服务');
      console.log('  add <n> <url>  - 添加 MCP 服务');
      console.log('  remove <n>     - 删除 MCP 服务');
      console.log('  help           - 显示帮助');
      break;
    default:
      console.log(`未知命令: ${cmd}`);
      console.log('输入 "help" 查看可用命令');
  }
  return true;
}

/**
 * 处理未知命令（默认模式）
 */
async function handleUnknownCommand(
  name: string,
  ctx: CommandContext
): Promise<boolean> {
  // 在默认模式下，未知命令视为自然语言输入
  if (ctx.mode === ReplMode.Default) {
    console.log(`理解输入: "${name} ${ctx.args.join(' ')}"`);
    console.log('自然语言处理功能将在后续实现...');
    return true;
  }

  console.log(`未知命令: ${name}`);
  console.log('输入 /help 查看可用命令');
  return true;
}
