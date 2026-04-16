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
 * 现在只处理 Chat 模式，其他模式已统一为对话模式
 */
async function handleSubModeInput(input, args, ctx) {
    const mode = ctx.modeManager.mode;
    switch (mode) {
        case mode_1.ReplMode.Chat:
            // 在 chat 模式下，所有输入都视为聊天消息
            {
                const fullText = [input, ...args].join(' ').trim();
                if (!fullText) {
                    return true;
                }
                console.log(chalk_1.default.cyan('你:'), fullText);
                console.log();
                try {
                    const { getApiClient } = await Promise.resolve().then(() => __importStar(require('../../services/api-client')));
                    const apiClient = getApiClient();
                    console.log(chalk_1.default.gray('正在等待 AI 回复...'));
                    console.log();
                    const response = await apiClient.chat([
                        { role: 'user', content: fullText }
                    ], false);
                    console.log(chalk_1.default.green('AI:'), response.content);
                }
                catch (err) {
                    console.log(chalk_1.default.red('请求失败:'), err instanceof Error ? err.message : String(err));
                }
                console.log();
                return true;
            }
        default:
            return await handleUnknownCommand(input, ctx);
    }
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
            // 路由到对应动作
            const action = intentRouter.route(nlpResponse);
            // 执行路由动作
            switch (action.type) {
                case 'switch_mode':
                    if (action.targetMode) {
                        // 保存 NLP 参数到上下文
                        ctx.nlpParameters = action.parameters;
                        // Timer/Kb/Mcp 模式直接路由到对应命令，不切换显示模式
                        if (action.targetMode === mode_1.ReplMode.Timer) {
                            const cmd = exports.registry.get('timer-add');
                            if (cmd) {
                                return await cmd.handler(ctx);
                            }
                        }
                        else if (action.targetMode === mode_1.ReplMode.Kb) {
                            const cmd = exports.registry.get('kb-add');
                            if (cmd) {
                                return await cmd.handler(ctx);
                            }
                        }
                        else if (action.targetMode === mode_1.ReplMode.Mcp) {
                            const cmd = exports.registry.get('mcp-add');
                            if (cmd) {
                                return await cmd.handler(ctx);
                            }
                        }
                        // Chat 和 Default 模式正常处理
                        ctx.setMode(action.targetMode);
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
                    // chat 意图时调用 chat API 进行对话
                    // 不显示"你: xxx"，直接显示思考中和AI回复
                    {
                        const fullText = [name, ...ctx.args].join(' ').trim();
                        try {
                            const { getApiClient } = await Promise.resolve().then(() => __importStar(require('../../services/api-client')));
                            const apiClient = getApiClient();
                            console.log(chalk_1.default.gray('正在思考...'));
                            const response = await apiClient.chat([
                                { role: 'user', content: fullText }
                            ], false);
                            console.log(chalk_1.default.cyan(' ◆ '), response.content);
                        }
                        catch (err) {
                            console.log(chalk_1.default.red('请求失败:'), err instanceof Error ? err.message : String(err));
                        }
                        console.log();
                        return true;
                    }
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