"use strict";
/**
 * 意图路由器
 * 根据 NLP 识别结果路由到对应的处理函数
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntentRouter = createIntentRouter;
exports.getIntentRouter = getIntentRouter;
const chalk_1 = __importDefault(require("chalk"));
const mode_1 = require("./mode");
/** 意图映射表 */
const INTENT_MAP = [
    // Timer 相关
    { intent: 'timer.create', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.show', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.delete', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'schedule.create', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'schedule.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    // Knowledge Base 相关
    { intent: 'kb.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.search', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.query', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'knowledge.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'knowledge.search', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    // MCP 相关
    { intent: 'mcp.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.config', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.setup', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    // Chat 相关
    { intent: 'chat', action: 'chat' },
    { intent: 'chat.with.ai', action: 'chat' },
    { intent: 'talk', action: 'chat' },
    { intent: '对话', action: 'chat' },
    { intent: '聊天', action: 'chat' },
    // 系统命令
    { intent: 'status', action: 'show_status' },
    { intent: 'show.status', action: 'show_status' },
    { intent: 'system.status', action: 'show_status' },
    { intent: 'help', action: 'show_help' },
    { intent: 'show.help', action: 'show_help' },
    { intent: '帮忙', action: 'show_help' },
    // 通用命令执行
    { intent: 'command.execute', action: 'execute_command' },
];
/** 关键词匹配规则（降级兜底） */
const KEYWORD_FALLBACK = [
    { keywords: ['定时', '定时任务', 'timer', '每小时', '每分钟', 'cron', 'schedule'], action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { keywords: ['知识库', 'kb', 'knowledge', '搜索', '查询', 'search'], action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { keywords: ['mcp', '模型上下文', 'model context'], action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { keywords: ['状态', 'status', '服务状态'], action: 'show_status' },
    { keywords: ['帮助', 'help', '帮忙'], action: 'show_help' },
];
/**
 * 意图路由器
 */
function createIntentRouter() {
    /**
     * 根据意图字符串查找映射
     */
    function findMapping(intent) {
        // 精确匹配
        const exact = INTENT_MAP.find((m) => m.intent === intent);
        if (exact)
            return exact;
        // 前缀匹配（如 'timer.create.hourly' 匹配 'timer.create'）
        const prefix = INTENT_MAP.find((m) => intent.startsWith(m.intent + '.'));
        if (prefix)
            return prefix;
        return undefined;
    }
    /**
     * 根据关键词查找兜底映射
     */
    function findKeywordFallback(text) {
        const lowerText = text.toLowerCase();
        for (const rule of KEYWORD_FALLBACK) {
            if (rule.keywords.some(k => lowerText.includes(k.toLowerCase()))) {
                return { action: rule.action, targetMode: rule.targetMode };
            }
        }
        return undefined;
    }
    /**
     * 根据 NLP 响应路由到对应动作
     */
    function route(nlpResponse) {
        const { intent, parameters, reply } = nlpResponse;
        // 查找意图映射
        const mapping = findMapping(intent);
        if (!mapping) {
            // 尝试关键词兜底匹配
            const keywordFallback = findKeywordFallback(intent);
            if (keywordFallback) {
                console.log(chalk_1.default.gray(`(关键词匹配: ${intent})`));
                const action = {
                    type: keywordFallback.action,
                    parameters,
                    reply: reply || `进入 ${keywordFallback.targetMode} 模式`,
                };
                if (keywordFallback.targetMode) {
                    action.targetMode = keywordFallback.targetMode;
                }
                return action;
            }
            // 没有找到映射，默认进入 chat 模式
            console.log(chalk_1.default.yellow(`未识别到特定意图 (${intent})，进入聊天模式...`));
            return {
                type: 'chat',
                reply: reply || '好的，让我来帮你。',
            };
        }
        // 构建路由动作
        const action = {
            type: mapping.action,
            parameters,
        };
        switch (mapping.action) {
            case 'switch_mode':
                action.targetMode = mapping.targetMode;
                action.reply = reply || `进入 ${mapping.targetMode} 模式`;
                break;
            case 'execute_command':
                action.targetCommand = mapping.targetCommand;
                break;
            case 'chat':
                action.reply = reply || '好的，让我们聊聊。';
                break;
            case 'show_status':
                action.reply = reply || '正在获取服务状态...';
                break;
            case 'show_help':
                action.reply = reply || '显示帮助信息...';
                break;
        }
        return action;
    }
    /**
     * 从 NLP 响应中提取参数
     */
    function extractParameters(nlpResponse) {
        const params = { ...nlpResponse.parameters };
        // 从 entities 中提取常用参数
        for (const entity of nlpResponse.entities) {
            switch (entity.type) {
                case 'time':
                case 'schedule':
                case 'cron':
                    params.schedule = entity.value;
                    break;
                case 'command':
                case 'action':
                    params.action = entity.value;
                    break;
                case 'query':
                case 'search_term':
                    params.query = entity.value;
                    break;
                case 'name':
                case 'title':
                    params.name = entity.value;
                    break;
                case 'url':
                case 'endpoint':
                    params.url = entity.value;
                    break;
                default:
                    // 将实体类型和值作为参数添加
                    params[entity.type] = entity.value;
            }
        }
        return params;
    }
    return {
        route,
        extractParameters,
    };
}
/** 默认意图路由器实例 */
let defaultRouter = null;
/**
 * 获取默认意图路由器
 */
function getIntentRouter() {
    if (!defaultRouter) {
        defaultRouter = createIntentRouter();
    }
    return defaultRouter;
}
//# sourceMappingURL=intent-router.js.map