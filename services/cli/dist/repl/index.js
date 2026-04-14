"use strict";
/**
 * REPL 交互模式
 * Ddo CLI 的主交互界面
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRepl = startRepl;
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 启动 REPL 交互模式
 */
async function startRepl(options) {
    const { services } = options;
    // 显示欢迎信息
    showWelcome(services);
    // 创建 readline 接口
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk_1.default.cyan('ddo> '),
    });
    // 设置提示符
    rl.prompt();
    // 处理输入
    rl.on('line', async (input) => {
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
        console.log('\n' + chalk_1.default.gray('再见! 👋'));
        process.exit(0);
    });
    // 保持进程运行
    return new Promise(() => { });
}
/**
 * 显示欢迎信息
 */
function showWelcome(services) {
    console.clear();
    logger_1.default.divider();
    console.log(chalk_1.default.bold.cyan('  Ddo - 个人智能工作空间'));
    logger_1.default.divider();
    console.log();
    console.log(chalk_1.default.gray('运行中的服务:'));
    for (const svc of services) {
        const status = svc.running ? chalk_1.default.green('●') : chalk_1.default.red('●');
        console.log(`  ${status} ${svc.displayName} ${chalk_1.default.gray(`(端口 ${svc.port})`)}`);
    }
    console.log();
    console.log(chalk_1.default.gray('可用命令:'));
    console.log(`  ${chalk_1.default.yellow('/chat <message>')}  与 AI 助手对话`);
    console.log(`  ${chalk_1.default.yellow('/status')}         查看服务状态`);
    console.log(`  ${chalk_1.default.yellow('/web')}            打开 Web Dashboard`);
    console.log(`  ${chalk_1.default.yellow('/exit')}           退出 REPL`);
    console.log();
    console.log(chalk_1.default.gray('直接输入自然语言描述任务，AI 将自动理解并执行'));
    console.log();
    logger_1.default.divider();
    console.log();
}
/**
 * 处理命令
 */
async function handleCommand(input, rl) {
    // 命令模式（以 / 开头）
    if (input.startsWith('/')) {
        const parts = input.slice(1).split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        switch (cmd) {
            case 'exit':
            case 'quit':
            case 'q':
                console.log(chalk_1.default.gray('正在退出...'));
                rl.close();
                break;
            case 'status':
                await showStatus();
                break;
            case 'web':
                console.log(chalk_1.default.yellow('Web Dashboard 尚未实现'));
                break;
            case 'chat':
                if (args.length === 0) {
                    console.log(chalk_1.default.yellow('请输入对话内容，例如: /chat 你好'));
                }
                else {
                    console.log(chalk_1.default.gray('正在发送请求到 llm-py...'));
                    console.log(chalk_1.default.yellow('chat 命令尚未完整实现'));
                }
                break;
            case 'kb':
                console.log(chalk_1.default.yellow('知识库管理命令尚未实现'));
                break;
            case 'timer':
                console.log(chalk_1.default.yellow('定时任务命令尚未实现'));
                break;
            case 'mcp':
                console.log(chalk_1.default.yellow('MCP 管理命令尚未实现'));
                break;
            case 'help':
            case 'h':
                showHelp();
                break;
            case 'clear':
                console.clear();
                break;
            default:
                console.log(chalk_1.default.red(`未知命令: /${cmd}`));
                console.log(chalk_1.default.gray('输入 /help 查看可用命令'));
        }
    }
    else {
        // 自然语言模式
        await handleNaturalLanguage(input);
    }
}
/**
 * 处理自然语言输入
 */
async function handleNaturalLanguage(input) {
    console.log(chalk_1.default.gray('正在理解您的意图...'));
    console.log(chalk_1.default.yellow('自然语言处理尚未完整实现，请使用 /chat 命令'));
    console.log();
    console.log(chalk_1.default.gray('您输入的是:'), input);
}
/**
 * 显示服务状态
 */
async function showStatus() {
    console.log(chalk_1.default.cyan('\n服务状态:'));
    console.log(chalk_1.default.gray('  状态检查功能将在后续完善\n'));
}
/**
 * 显示帮助信息
 */
function showHelp() {
    console.log();
    console.log(chalk_1.default.bold.cyan('Ddo REPL 帮助'));
    console.log();
    console.log(chalk_1.default.gray('自然语言模式:'));
    console.log('  直接输入任务描述，AI 将自动解析并执行');
    console.log();
    console.log(chalk_1.default.gray('命令模式:'));
    console.log(`  ${chalk_1.default.yellow('/chat <message>')}  与 AI 助手对话`);
    console.log(`  ${chalk_1.default.yellow('/kb')}             进入知识库管理模式`);
    console.log(`  ${chalk_1.default.yellow('/timer')}          进入定时任务管理模式`);
    console.log(`  ${chalk_1.default.yellow('/mcp')}            进入 MCP 管理模式`);
    console.log(`  ${chalk_1.default.yellow('/status')}         查看所有服务状态`);
    console.log(`  ${chalk_1.default.yellow('/web')}            打开 Web Dashboard`);
    console.log(`  ${chalk_1.default.yellow('/clear')}          清屏`);
    console.log(`  ${chalk_1.default.yellow('/exit')}           退出 REPL`);
    console.log(`  ${chalk_1.default.yellow('/help')}           显示帮助`);
    console.log();
}
//# sourceMappingURL=index.js.map