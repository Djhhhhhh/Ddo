"use strict";
/**
 * REPL 命令注册中心
 * 统一管理和分发所有 REPL 命令
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
exports.registry = void 0;
exports.executeCommand = executeCommand;
const chalk_1 = __importDefault(require("chalk"));
const mode_1 = require("../mode");
/**
 * 命令注册表
 */
class CommandRegistry {
    constructor() {
        this.commands = new Map();
        this.aliasMap = new Map();
    }
    /**
     * 注册命令
     */
    register(command) {
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
    get(name) {
        // 直接查找
        const cmd = this.commands.get(name);
        if (cmd)
            return cmd;
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
    getAll() {
        return Array.from(this.commands.values());
    }
    /**
     * 获取所有命令名称（包括别名）
     */
    getAllNames() {
        const names = Array.from(this.commands.keys());
        const aliases = Array.from(this.aliasMap.keys());
        return [...names, ...aliases];
    }
    /**
     * 获取适用于指定模式的命令
     */
    getByMode(mode) {
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
    has(name) {
        return this.commands.has(name) || this.aliasMap.has(name);
    }
}
// 导出单例
exports.registry = new CommandRegistry();
/**
   * 执行命令
   */
async function executeCommand(parsed, rl, modeManager) {
    let { name, args, flags } = parsed;
    // 处理命令名：去掉开头的 /（用户在 REPL 中输入 /exit 等价于 exit）
    if (name.startsWith('/')) {
        name = name.slice(1);
    }
    const command = exports.registry.get(name);
    if (!command) {
        // 命令不存在
        const ctx = {
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
    const ctx = {
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
async function handleSubModeInput(input, args, ctx) {
    const mode = ctx.modeManager.mode;
    switch (mode) {
        case mode_1.ReplMode.Chat:
            // 在 chat 模式下，所有输入都视为聊天消息
            console.log(`[Chat] ${input} ${args.join(' ')}`);
            console.log('聊天功能将在后续实现...');
            return true;
        case mode_1.ReplMode.Kb:
            return await handleKbSubCommand(input, args, ctx);
        case mode_1.ReplMode.Timer:
            return await handleTimerSubCommand(input, args, ctx);
        case mode_1.ReplMode.Mcp:
            return await handleMcpSubCommand(input, args, ctx);
        default:
            return await handleUnknownCommand(input, ctx);
    }
}
/**
 * 处理知识库子命令
 */
async function handleKbSubCommand(cmd, args, _ctx) {
    switch (cmd.toLowerCase()) {
        case 'list':
            console.log('知识库列表：');
            console.log('  暂无知识库');
            break;
        case 'add':
            if (args.length < 2) {
                console.log('用法: add <名称> <路径>');
            }
            else {
                console.log(`添加知识库: ${args[0]} -> ${args[1]}`);
                console.log('功能将在后续实现...');
            }
            break;
        case 'search':
            if (args.length === 0) {
                console.log('用法: search <查询内容>');
            }
            else {
                console.log(`搜索: ${args.join(' ')}`);
                console.log('功能将在后续实现...');
            }
            break;
        case 'remove':
        case 'rm':
            if (args.length === 0) {
                console.log('用法: remove <名称>');
            }
            else {
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
async function handleTimerSubCommand(cmd, args, _ctx) {
    switch (cmd.toLowerCase()) {
        case 'list':
            console.log('定时任务列表：');
            console.log('  暂无定时任务');
            break;
        case 'add':
            if (args.length < 2) {
                console.log('用法: add <cron表达式> <命令>');
                console.log('示例: add "0 9 * * *" "echo good morning"');
            }
            else {
                console.log(`添加定时任务: ${args[0]} -> ${args.slice(1).join(' ')}`);
                console.log('功能将在后续实现...');
            }
            break;
        case 'remove':
        case 'rm':
            if (args.length === 0) {
                console.log('用法: remove <任务ID>');
            }
            else {
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
async function handleMcpSubCommand(cmd, args, _ctx) {
    switch (cmd.toLowerCase()) {
        case 'list':
            console.log('MCP 服务列表：');
            console.log('  暂无 MCP 配置');
            break;
        case 'add':
            if (args.length < 2) {
                console.log('用法: add <名称> <URL>');
            }
            else {
                console.log(`添加 MCP: ${args[0]} -> ${args[1]}`);
                console.log('功能将在后续实现...');
            }
            break;
        case 'remove':
        case 'rm':
            if (args.length === 0) {
                console.log('用法: remove <名称>');
            }
            else {
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
 * 使用 NLP 进行意图识别和路由
 */
async function handleUnknownCommand(name, ctx) {
    // 在默认模式下，未知命令视为自然语言输入
    if (ctx.mode === mode_1.ReplMode.Default) {
        const fullText = [name, ...ctx.args].join(' ').trim();
        if (!fullText) {
            console.log('请输入内容');
            return true;
        }
        console.log(chalk_1.default.cyan('正在分析...'));
        try {
            // 调用 NLP 服务进行意图识别
            const nlpService = await Promise.resolve().then(() => __importStar(require('../../services/nlp'))).then(m => m.getNLPService());
            const intentRouter = await Promise.resolve().then(() => __importStar(require('../intent-router'))).then(m => m.getIntentRouter());
            const nlpResponse = await nlpService.analyzeText(fullText);
            console.log(chalk_1.default.gray(`意图: ${nlpResponse.intent} (${Math.round(nlpResponse.confidence * 100)}%)`));
            // 路由到对应动作
            const action = intentRouter.route(nlpResponse);
            // 如果有回复，显示给用户
            if (action.reply) {
                console.log(chalk_1.default.green(action.reply));
            }
            // 执行路由动作
            switch (action.type) {
                case 'switch_mode':
                    if (action.targetMode) {
                        ctx.setMode(action.targetMode);
                        // 显示进入模式的提示
                        const modeNames = {
                            [mode_1.ReplMode.Default]: '默认',
                            [mode_1.ReplMode.Chat]: '聊天',
                            [mode_1.ReplMode.Kb]: '知识库',
                            [mode_1.ReplMode.Timer]: '定时任务',
                            [mode_1.ReplMode.Mcp]: 'MCP',
                        };
                        console.log(chalk_1.default.gray(`已进入 ${modeNames[action.targetMode]} 模式`));
                    }
                    return true;
                case 'execute_command':
                    if (action.targetCommand) {
                        // 递归执行命令
                        const cmd = exports.registry.get(action.targetCommand);
                        if (cmd) {
                            return await cmd.handler(ctx);
                        }
                    }
                    return true;
                case 'chat':
                    // 进入 chat 模式
                    ctx.setMode(mode_1.ReplMode.Chat);
                    return true;
                case 'show_status':
                    // 执行 status 命令
                    const statusCmd = exports.registry.get('status');
                    if (statusCmd) {
                        return await statusCmd.handler(ctx);
                    }
                    return true;
                case 'show_help':
                    // 执行 help 命令
                    const helpCmd = exports.registry.get('help');
                    if (helpCmd) {
                        return await helpCmd.handler(ctx);
                    }
                    return true;
                case 'unknown':
                default:
                    // 无法识别，默认进入聊天模式
                    console.log(chalk_1.default.yellow('无法理解意图，进入聊天模式...'));
                    ctx.setMode(mode_1.ReplMode.Chat);
                    return true;
            }
        }
        catch (err) {
            // NLP 服务调用失败，降级到聊天模式
            console.log(chalk_1.default.yellow('NLP 服务暂时不可用，进入聊天模式...'));
            console.log(chalk_1.default.gray(`错误: ${err instanceof Error ? err.message : String(err)}`));
            ctx.setMode(mode_1.ReplMode.Chat);
            return true;
        }
    }
    console.log(`未知命令: ${name}`);
    console.log('输入 /help 查看可用命令');
    return true;
}
//# sourceMappingURL=index.js.map