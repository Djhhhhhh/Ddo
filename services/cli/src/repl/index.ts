/**
 * REPL 交互模式
 * Ddo CLI 的主交互界面
 */

import * as readline from 'readline';
import chalk from 'chalk';
import logger from '../utils/logger';

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

/**
 * 启动 REPL 交互模式
 */
export async function startRepl(options: ReplOptions): Promise<void> {
  const { services } = options;

  // 显示欢迎信息
  showWelcome(services);

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('ddo> '),
  });

  // 设置提示符
  rl.prompt();

  // 处理输入
  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

    if (trimmed === '') {
      rl.prompt();
      return;
    }

    // 处理命令
    await handleCommand(trimmed, rl);

    rl.prompt();
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
  logger.divider();
  console.log(chalk.bold.cyan('  Ddo - 个人智能工作空间'));
  logger.divider();
  console.log();

  console.log(chalk.gray('运行中的服务:'));
  for (const svc of services) {
    const status = svc.running ? chalk.green('●') : chalk.red('●');
    console.log(`  ${status} ${svc.displayName} ${chalk.gray(`(端口 ${svc.port})`)}`);
  }
  console.log();

  console.log(chalk.gray('可用命令:'));
  console.log(`  ${chalk.yellow('/chat <message>')}  与 AI 助手对话`);
  console.log(`  ${chalk.yellow('/status')}         查看服务状态`);
  console.log(`  ${chalk.yellow('/web')}            打开 Web Dashboard`);
  console.log(`  ${chalk.yellow('/exit')}           退出 REPL`);
  console.log();
  console.log(chalk.gray('直接输入自然语言描述任务，AI 将自动理解并执行'));
  console.log();
  logger.divider();
  console.log();
}

/**
 * 处理命令
 */
async function handleCommand(input: string, rl: readline.Interface): Promise<void> {
  // 命令模式（以 / 开头）
  if (input.startsWith('/')) {
    const parts = input.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'exit':
      case 'quit':
      case 'q':
        console.log(chalk.gray('正在退出...'));
        rl.close();
        break;

      case 'status':
        await showStatus();
        break;

      case 'web':
        console.log(chalk.yellow('Web Dashboard 尚未实现'));
        break;

      case 'chat':
        if (args.length === 0) {
          console.log(chalk.yellow('请输入对话内容，例如: /chat 你好'));
        } else {
          console.log(chalk.gray('正在发送请求到 llm-py...'));
          console.log(chalk.yellow('chat 命令尚未完整实现'));
        }
        break;

      case 'kb':
        console.log(chalk.yellow('知识库管理命令尚未实现'));
        break;

      case 'timer':
        console.log(chalk.yellow('定时任务命令尚未实现'));
        break;

      case 'mcp':
        console.log(chalk.yellow('MCP 管理命令尚未实现'));
        break;

      case 'help':
      case 'h':
        showHelp();
        break;

      case 'clear':
        console.clear();
        break;

      default:
        console.log(chalk.red(`未知命令: /${cmd}`));
        console.log(chalk.gray('输入 /help 查看可用命令'));
    }
  } else {
    // 自然语言模式
    await handleNaturalLanguage(input);
  }
}

/**
 * 处理自然语言输入
 */
async function handleNaturalLanguage(input: string): Promise<void> {
  console.log(chalk.gray('正在理解您的意图...'));
  console.log(chalk.yellow('自然语言处理尚未完整实现，请使用 /chat 命令'));
  console.log();
  console.log(chalk.gray('您输入的是:'), input);
}

/**
 * 显示服务状态
 */
async function showStatus(): Promise<void> {
  console.log(chalk.cyan('\n服务状态:'));
  console.log(chalk.gray('  状态检查功能将在后续完善\n'));
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log();
  console.log(chalk.bold.cyan('Ddo REPL 帮助'));
  console.log();
  console.log(chalk.gray('自然语言模式:'));
  console.log('  直接输入任务描述，AI 将自动解析并执行');
  console.log();
  console.log(chalk.gray('命令模式:'));
  console.log(`  ${chalk.yellow('/chat <message>')}  与 AI 助手对话`);
  console.log(`  ${chalk.yellow('/kb')}             进入知识库管理模式`);
  console.log(`  ${chalk.yellow('/timer')}          进入定时任务管理模式`);
  console.log(`  ${chalk.yellow('/mcp')}            进入 MCP 管理模式`);
  console.log(`  ${chalk.yellow('/status')}         查看所有服务状态`);
  console.log(`  ${chalk.yellow('/web')}            打开 Web Dashboard`);
  console.log(`  ${chalk.yellow('/clear')}          清屏`);
  console.log(`  ${chalk.yellow('/exit')}           退出 REPL`);
  console.log(`  ${chalk.yellow('/help')}           显示帮助`);
  console.log();
}
