/**
 * REPL 交互模式
 * Ddo CLI 的主交互界面
 */

import * as readline from 'readline';
import chalk from 'chalk';
import logger from '../utils/logger';
import { parseCommand } from './parser';
import { ModeManager, ModeInfo } from './mode';
import { registry, executeCommand, CommandResult, CommandType } from './commands';
import { createCompleter } from './completer';

// 导入并注册所有命令
import { exitCommand, backCommand } from './commands/exit';
import { helpCommand } from './commands/help';
import { chatCommand } from './commands/chat';
import { clearCommand } from './commands/clear';
import { statusCommand } from './commands/status';
import { kbCommand, timerCommand, mcpCommand } from './commands/mode-switch';
import { webCommand, statusWebCommand, timerWebCommand, mcpWebCommand, kbWebCommand } from './commands/web-shortcuts';

// KB 子命令
import { kbListCommand, kbAddCommand, kbSearchCommand, kbRemoveCommand, kbHelpCommand } from './commands/kb-commands';
// Timer 子命令
import { timerListCommand, timerAddCommand, timerAddIntervalCommand, timerAddDelayCommand, timerPauseCommand, timerResumeCommand, timerRemoveCommand, timerHelpCommand } from './commands/timer-commands';
// MCP 子命令
import { mcpListCommand, mcpAddCommand, mcpTestCommand, mcpToolsCommand, mcpCallCommand, mcpRemoveCommand, mcpConnectCommand, mcpDisconnectCommand, mcpHelpCommand } from './commands/mcp-commands';

// 注册命令
registry.register(exitCommand);
registry.register(backCommand);
registry.register(helpCommand);
registry.register(chatCommand);
registry.register(clearCommand);
registry.register(statusCommand);
registry.register(kbCommand);
registry.register(timerCommand);
registry.register(mcpCommand);
registry.register(webCommand);
registry.register(statusWebCommand);
registry.register(timerWebCommand);
registry.register(mcpWebCommand);
registry.register(kbWebCommand);

// 注册 KB 子命令
registry.register(kbListCommand);
registry.register(kbAddCommand);
registry.register(kbSearchCommand);
registry.register(kbRemoveCommand);
registry.register(kbHelpCommand);

// 注册 Timer 子命令
registry.register(timerListCommand);
registry.register(timerAddCommand);
registry.register(timerAddIntervalCommand);
registry.register(timerAddDelayCommand);
registry.register(timerPauseCommand);
registry.register(timerResumeCommand);
registry.register(timerRemoveCommand);
registry.register(timerHelpCommand);

// 注册 MCP 子命令
registry.register(mcpListCommand);
registry.register(mcpAddCommand);
registry.register(mcpTestCommand);
registry.register(mcpConnectCommand);
registry.register(mcpDisconnectCommand);
registry.register(mcpToolsCommand);
registry.register(mcpCallCommand);
registry.register(mcpRemoveCommand);
registry.register(mcpHelpCommand);

// 注册工具（用于 NLP/意图识别触发的工具调用）
import { registerAllTools } from './tools/registry';
registerAllTools();

/**
 * REPL 选项
 */
export interface ReplOptions {
  /** 服务状态信息 */
  services: {
    name: string;
    displayName: string;
    running: boolean;
    port: number;
  }[];
}

// ASCII 艺术字
const ASCII_ART = `
 /$$$$$$$        /$$
| $$__  $$      | $$
| $$  \\ $$  /$$$$$$$  /$$$$$$
| $$  | $$ /$$__  $$ /$$__  $$
| $$  | $$| $$  | $$| $$  \\ $$
| $$  | $$| $$  | $$| $$  | $$
| $$$$$$$/|  $$$$$$$|  $$$$$$/
|_______/  \\_______/ \\______/
`;

// 保存 REPL 实例用于 clear 命令
let replInstance: {
  services: ReplOptions['services'];
} | null = null;

/**
 * 启动 REPL 交互模式
 */
export async function startRepl(options: ReplOptions): Promise<void> {
  const { services } = options;

  // 保存实例供 clear 命令使用
  replInstance = { services };

  // 创建模式管理器
  const modeManager = new ModeManager();

  // 显示欢迎信息
  showWelcome(services);

  // 创建自动补全器
  const completer = createCompleter(modeManager);

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: modeManager.getPrompt(),
    completer: (line: string) => {
      const result = completer(line);
      return [result.completions, result.matched];
    },
  });

  // 监听模式变化，更新提示符
  const originalSetMode = modeManager.setMode.bind(modeManager);
  modeManager.setMode = (mode) => {
    originalSetMode(mode);
    rl.setPrompt(modeManager.getPrompt());
  };

  // 设置提示符
  rl.prompt();

  // 输入去重：避免重复处理相同输入
  let lastInput = '';
  let lastInputTime = 0;
  const INPUT_DEDUP_INTERVAL = 100; // ms

  // Tab 键监听：切换知识库优先模式
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode?.(true);
  }

  process.stdin.on('keypress', (str: string, key: { name: string; shift: boolean }) => {
    // Shift+Tab: 切换知识库优先模式
    if (key.name === 'tab' && key.shift) {
      modeManager.toggleKbPriority();
      // 不要用 rl.write('\r\n') 触发 line 事件，这会导致当前输入被提交
      // 只清除当前行并显示状态
      const status = modeManager.kbPriorityMode ? '开启' : '关闭';
      console.log(chalk.magenta(`\r📚 知识库优先模式: ${status}`));
      rl.setPrompt(modeManager.getPrompt());
      // 不调用 rl.prompt() 保持当前输入不被提交
      return;
    }

    // 普通 Tab: 保持自动补全功能（不切换模式）
    if (key.name === 'tab' && !key.shift) {
      // 自动补全功能由 readline 接口的 completer 处理
      // 此处不做额外处理
    }
  });

  // 处理输入
  rl.on('line', async (input: string) => {
    const trimmed = input.trim();
    const now = Date.now();

    // 去重：相同输入且间隔小于阈值
    if (trimmed !== '' && input === lastInput && now - lastInputTime < INPUT_DEDUP_INTERVAL) {
      rl.prompt();
      return;
    }

    // 更新去重状态
    lastInput = input;
    lastInputTime = now;

    if (trimmed === '') {
      rl.prompt();
      return;
    }

    // 解析命令
    const parsed = parseCommand(trimmed);

    // 如果有解析错误，显示警告
    if (parsed.errors.length > 0) {
      console.log(chalk.yellow('警告:'), parsed.errors.join(', '));
    }

    // 执行命令
    const result: CommandResult = await executeCommand(parsed, rl, modeManager);

    // 更新提示符（模式可能已改变）
    rl.setPrompt(modeManager.getPrompt());

    if (result.shouldContinue) {
      // 根据输出类型决定是否换行
      // AI 对话答复时直接显示提示符（命令输出已有换行）
      // 普通命令：直接显示提示符，不额外换行
      rl.prompt();
    }
  });

  // 处理退出
  rl.on('close', () => {
    console.log('\n' + chalk.gray('再见! 👋'));
    process.exit(0);
  });

  // 保持进程运行
  return new Promise(() => { });
}

/**
 * 显示欢迎信息
 */
function showWelcome(services: ReplOptions['services']): void {
  console.clear();

  // 显示 ASCII 艺术字
  console.log(chalk.cyan(ASCII_ART));

  logger.divider();
  console.log(chalk.bold.cyan('  个人智能工作空间'));
  logger.divider();
  console.log();

  console.log(chalk.gray('运行中的服务:'));
  for (const svc of services) {
    const status = svc.running ? chalk.green('●') : chalk.red('●');
    console.log(`  ${status} ${svc.displayName} ${chalk.gray(`(端口 ${svc.port})`)}`);
  }
  console.log();

  console.log();
  console.log(chalk.cyan(' ~ '), chalk.gray('像跟人聊天一样说话，或者直接丢个任务给我，也可以输入 '), chalk.yellow('/help'), chalk.gray(' 看看我能做什么'));
  console.log();
  logger.divider();
  console.log();
}

/**
 * 重新显示欢迎信息（用于 clear 命令）
 */
export function showWelcomeAgain(): void {
  if (replInstance) {
    showWelcome(replInstance.services);
  }
}

// 导出组件供外部使用
export { parseCommand } from './parser';
export { ModeManager, ReplMode, type ModeInfo } from './mode';
export { registry, type CommandContext, type ReplCommand } from './commands';
