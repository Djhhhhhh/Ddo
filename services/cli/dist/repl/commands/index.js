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
exports.registry = exports.CommandType = void 0;
exports.executeCommand = executeCommand;
const chalk_1 = __importDefault(require("chalk"));
const mode_1 = require("../mode");
/**
 * 命令输出类型
 * 用于区分 AI 对话和普通命令，控制提示符换行行为
 */
var CommandType;
(function (CommandType) {
    /** AI 对话 */
    CommandType[CommandType["Chat"] = 0] = "Chat";
    /** 普通命令 */
    CommandType[CommandType["Command"] = 1] = "Command";
})(CommandType || (exports.CommandType = CommandType = {}));
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
            return { shouldContinue: true, outputType: CommandType.Command };
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
                    return { shouldContinue: true, outputType: CommandType.Chat };
                }
                // Chat 模式下不显示"你:"，直接显示 AI 回复
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
async function handleUnknownCommand(name, ctx) {
    // 在默认模式下，未知命令视为自然语言输入
    if (ctx.mode === mode_1.ReplMode.Default) {
        const fullText = [name, ...ctx.args].join(' ').trim();
        if (!fullText) {
            return { shouldContinue: true, outputType: CommandType.Command };
        }
        // 知识库优先模式
        const kbPriority = ctx.modeManager.kbPriorityMode;
        // 立即显示思考状态，让用户感知到正在处理
        process.stdout.write(`${chalk_1.default.cyan('🔍')} 分析中... \n`);
        try {
            const { getApiClient } = await Promise.resolve().then(() => __importStar(require('../../services/api-client')));
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
        }
        catch (err) {
            // 降级到聊天模式
            console.log();
            console.log(chalk_1.default.yellow('⚠️ AI 服务暂时不可用'));
            ctx.setMode(mode_1.ReplMode.Chat);
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
async function processConversationStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // 状态跟踪
    let isStreaming = false;
    let currentEventType = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine)
                    continue;
                // 解析 SSE 事件类型行: event:intent_detected
                if (trimmedLine.startsWith('event:')) {
                    currentEventType = trimmedLine.slice(6).trim();
                    continue;
                }
                // 解析 SSE 数据行: data:{...}
                if (!trimmedLine.startsWith('data:'))
                    continue;
                const data = trimmedLine.slice(5).trim();
                if (data === '[DONE]')
                    continue;
                try {
                    const eventData = JSON.parse(data);
                    switch (currentEventType) {
                        case 'intent_detected':
                            // 简短显示意图类型
                            if (eventData.need_knowledge) {
                                process.stdout.write(`${chalk_1.default.green('✓')} ${chalk_1.default.magenta('📚 知识查询')}\n`);
                            }
                            else {
                                const intentName = getIntentName(eventData.intent);
                                process.stdout.write(`${chalk_1.default.green('✓')} ${chalk_1.default.cyan('💬 ' + intentName)}\n`);
                            }
                            break;
                        case 'retrieving':
                            process.stdout.write(`${chalk_1.default.magenta('📚')} 检索中...\n`);
                            break;
                        case 'docs_found':
                            if (eventData.count > 0) {
                                process.stdout.write(`${chalk_1.default.green('✓')} 找到 ${chalk_1.default.cyan(eventData.count)} 条文档\n`);
                            }
                            else {
                                process.stdout.write(`${chalk_1.default.gray('○')} 知识库暂无相关文档\n`);
                            }
                            break;
                        case 'generating':
                            if (!isStreaming) {
                                isStreaming = true;
                                process.stdout.write(`${chalk_1.default.green('✨')} `);
                            }
                            break;
                        case 'delta':
                            if (!isStreaming) {
                                isStreaming = true;
                                process.stdout.write(`${chalk_1.default.green('✨')} `);
                            }
                            process.stdout.write(eventData.content || '');
                            break;
                        case 'completed':
                            console.log();
                            console.log();
                            // 显示来源（如果有）
                            if (eventData.sources && eventData.sources.length > 0) {
                                console.log(chalk_1.default.gray('─'.repeat(40)));
                                console.log(`${chalk_1.default.gray('📚 参考来源:')}`);
                                for (const source of eventData.sources) {
                                    console.log(`   • ${chalk_1.default.gray(source)}`);
                                }
                                console.log(chalk_1.default.gray('─'.repeat(40)));
                                console.log();
                            }
                            break;
                        case 'clarify':
                            console.log(`${chalk_1.default.yellow('❓')} ${eventData.message || '需要确认...'}`);
                            if (eventData.suggestions) {
                                for (let i = 0; i < eventData.suggestions.length; i++) {
                                    console.log(`   [${i + 1}] ${eventData.suggestions[i]}`);
                                }
                            }
                            break;
                        case 'tool_call':
                            console.log(`${chalk_1.default.cyan('📋')} 执行工具: ${eventData.tool}`);
                            break;
                        case 'error':
                            console.log(`${chalk_1.default.red('⚠️')} 错误: ${eventData.message}`);
                            break;
                    }
                }
                catch (e) {
                    // 忽略解析错误
                }
            }
        }
    }
    finally {
        reader.releaseLock();
    }
}
/**
 * 获取意图显示名称
 */
function getIntentName(intent) {
    const map = {
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
//# sourceMappingURL=index.js.map