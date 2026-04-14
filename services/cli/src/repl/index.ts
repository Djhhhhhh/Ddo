/**
 * REPL 交互模式
 * Ddo CLI 的主交互界面
 */

import * as readline from 'readline';
import chalk from 'chalk';
import logger from '../utils/logger';
import { parseCommand } from './parser';
import { ModeManager, ModeInfo } from './mode';
import { registry, executeCommand } from './commands';
import { createCompleter } from './completer';

// 导入并注册所有命令
import { exitCommand, backCommand } from './commands/exit';
import { helpCommand } from './commands/help';
import { chatCommand } from './commands/chat';
import { clearCommand } from './commands/clear';
import { statusCommand } from './commands/status';
import { kbCommand, timerCommand, mcpCommand } from './commands/mode-switch';

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

  // 处理输入
  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

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
    const shouldContinue = await executeCommand(parsed, rl, modeManager);

    // 更新提示符（模式可能已改变）
    rl.setPrompt(modeManager.getPrompt());

    if (shouldContinue) {
      rl.prompt();
    }
  });

  // 处理退出
  rl.on('close', () => {
    console.log('\n' + chalk.gray('再见! 👋'));
    process.exit(0);
  });

  // 保持进程运行
  return new Promise(() => {});
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

  console.log(chalk.gray('可用命令:'));
  console.log(`  ${chalk.yellow('/chat <msg>')}     与 AI 助手对话`);
  console.log(`  ${chalk.yellow('/kb')}             进入知识库管理模式`);
  console.log(`  ${chalk.yellow('/timer')}          进入定时任务管理模式`);
  console.log(`  ${chalk.yellow('/mcp')}            进入 MCP 管理模式`);
  console.log(`  ${chalk.yellow('/status')}         查看服务状态`);
  console.log(`  ${chalk.yellow('/exit')}           退出 REPL`);
  console.log();
  console.log(chalk.gray('直接输入自然语言描述任务，AI 将自动理解并执行'));
  console.log(chalk.gray('按 Tab 键可查看命令补全提示'));
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
