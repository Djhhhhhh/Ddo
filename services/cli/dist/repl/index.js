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
exports.registry = exports.ReplMode = exports.ModeManager = exports.parseCommand = void 0;
exports.startRepl = startRepl;
exports.showWelcomeAgain = showWelcomeAgain;
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../utils/logger"));
const parser_1 = require("./parser");
const mode_1 = require("./mode");
const commands_1 = require("./commands");
const completer_1 = require("./completer");
// 导入并注册所有命令
const exit_1 = require("./commands/exit");
const help_1 = require("./commands/help");
const chat_1 = require("./commands/chat");
const clear_1 = require("./commands/clear");
const status_1 = require("./commands/status");
const mode_switch_1 = require("./commands/mode-switch");
// KB 子命令
const kb_commands_1 = require("./commands/kb-commands");
// Timer 子命令
const timer_commands_1 = require("./commands/timer-commands");
// MCP 子命令
const mcp_commands_1 = require("./commands/mcp-commands");
// 注册命令
commands_1.registry.register(exit_1.exitCommand);
commands_1.registry.register(exit_1.backCommand);
commands_1.registry.register(help_1.helpCommand);
commands_1.registry.register(chat_1.chatCommand);
commands_1.registry.register(clear_1.clearCommand);
commands_1.registry.register(status_1.statusCommand);
commands_1.registry.register(mode_switch_1.kbCommand);
commands_1.registry.register(mode_switch_1.timerCommand);
commands_1.registry.register(mode_switch_1.mcpCommand);
// 注册 KB 子命令
commands_1.registry.register(kb_commands_1.kbListCommand);
commands_1.registry.register(kb_commands_1.kbAddCommand);
commands_1.registry.register(kb_commands_1.kbSearchCommand);
commands_1.registry.register(kb_commands_1.kbRemoveCommand);
commands_1.registry.register(kb_commands_1.kbHelpCommand);
// 注册 Timer 子命令
commands_1.registry.register(timer_commands_1.timerListCommand);
commands_1.registry.register(timer_commands_1.timerAddCommand);
commands_1.registry.register(timer_commands_1.timerPauseCommand);
commands_1.registry.register(timer_commands_1.timerResumeCommand);
commands_1.registry.register(timer_commands_1.timerRemoveCommand);
commands_1.registry.register(timer_commands_1.timerHelpCommand);
// 注册 MCP 子命令
commands_1.registry.register(mcp_commands_1.mcpListCommand);
commands_1.registry.register(mcp_commands_1.mcpAddCommand);
commands_1.registry.register(mcp_commands_1.mcpTestCommand);
commands_1.registry.register(mcp_commands_1.mcpRemoveCommand);
commands_1.registry.register(mcp_commands_1.mcpHelpCommand);
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
let replInstance = null;
/**
 * 启动 REPL 交互模式
 */
async function startRepl(options) {
    const { services } = options;
    // 保存实例供 clear 命令使用
    replInstance = { services };
    // 创建模式管理器
    const modeManager = new mode_1.ModeManager();
    // 显示欢迎信息
    showWelcome(services);
    // 创建自动补全器
    const completer = (0, completer_1.createCompleter)(modeManager);
    // 创建 readline 接口
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: modeManager.getPrompt(),
        completer: (line) => {
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
    process.stdin.on('keypress', (str, key) => {
        // Shift+Tab: 切换知识库优先模式
        if (key.name === 'tab' && key.shift) {
            modeManager.toggleKbPriority();
            // 不要用 rl.write('\r\n') 触发 line 事件，这会导致当前输入被提交
            // 只清除当前行并显示状态
            const status = modeManager.kbPriorityMode ? '开启' : '关闭';
            console.log(chalk_1.default.magenta(`\r📚 知识库优先模式: ${status}`));
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
    rl.on('line', async (input) => {
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
        const parsed = (0, parser_1.parseCommand)(trimmed);
        // 如果有解析错误，显示警告
        if (parsed.errors.length > 0) {
            console.log(chalk_1.default.yellow('警告:'), parsed.errors.join(', '));
        }
        // 执行命令
        const result = await (0, commands_1.executeCommand)(parsed, rl, modeManager);
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
    // 显示 ASCII 艺术字
    console.log(chalk_1.default.cyan(ASCII_ART));
    logger_1.default.divider();
    console.log(chalk_1.default.bold.cyan('  个人智能工作空间'));
    logger_1.default.divider();
    console.log();
    console.log(chalk_1.default.gray('运行中的服务:'));
    for (const svc of services) {
        const status = svc.running ? chalk_1.default.green('●') : chalk_1.default.red('●');
        console.log(`  ${status} ${svc.displayName} ${chalk_1.default.gray(`(端口 ${svc.port})`)}`);
    }
    console.log();
    console.log();
    console.log(chalk_1.default.cyan(' ~ '), chalk_1.default.gray('像跟人聊天一样说话，或者直接丢个任务给我，也可以输入 '), chalk_1.default.yellow('/help'), chalk_1.default.gray(' 看看我能做什么'));
    console.log();
    logger_1.default.divider();
    console.log();
}
/**
 * 重新显示欢迎信息（用于 clear 命令）
 */
function showWelcomeAgain() {
    if (replInstance) {
        showWelcome(replInstance.services);
    }
}
// 导出组件供外部使用
var parser_2 = require("./parser");
Object.defineProperty(exports, "parseCommand", { enumerable: true, get: function () { return parser_2.parseCommand; } });
var mode_2 = require("./mode");
Object.defineProperty(exports, "ModeManager", { enumerable: true, get: function () { return mode_2.ModeManager; } });
Object.defineProperty(exports, "ReplMode", { enumerable: true, get: function () { return mode_2.ReplMode; } });
var commands_2 = require("./commands");
Object.defineProperty(exports, "registry", { enumerable: true, get: function () { return commands_2.registry; } });
//# sourceMappingURL=index.js.map