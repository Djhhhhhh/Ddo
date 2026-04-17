"use strict";
/**
 * 意图路由器
 * 根据 NLP 识别结果路由到对应的处理函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntentRouter = createIntentRouter;
exports.getIntentRouter = getIntentRouter;
const mode_1 = require("./mode");
/** 意图映射表 */
const INTENT_MAP = [
    // === Timer 相关 ===
    { intent: 'timer.create', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.show', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.delete', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.pause', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.resume', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'timer.remove', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'schedule.create', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: 'schedule.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: '定时任务.创建', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { intent: '定时任务.添加', action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    // === Knowledge Base 相关 ===
    { intent: 'kb.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.search', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.query', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'kb.remove', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'knowledge.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'knowledge.search', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: 'knowledge.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: '知识库.添加', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: '知识库.搜索', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: '知识库.查询', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { intent: '知识库.列表', action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    // === MCP 相关 ===
    { intent: 'mcp.add', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.list', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.config', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.setup', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.remove', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { intent: 'mcp.test', action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    // === Chat 相关 ===
    { intent: 'chat', action: 'chat' },
    { intent: 'chat.with.ai', action: 'chat' },
    { intent: 'talk', action: 'chat' },
    { intent: '对话', action: 'chat' },
    { intent: '聊天', action: 'chat' },
    // === 系统命令 ===
    { intent: 'status', action: 'show_status' },
    { intent: 'show.status', action: 'show_status' },
    { intent: 'system.status', action: 'show_status' },
    { intent: '服务状态', action: 'show_status' },
    { intent: 'help', action: 'show_help' },
    { intent: 'show.help', action: 'show_help' },
    { intent: '帮忙', action: 'show_help' },
    { intent: '帮助', action: 'show_help' },
    // === 通用命令 ===
    { intent: 'command.execute', action: 'execute_command' },
    { intent: 'clear', action: 'execute_command', targetCommand: 'clear' },
    { intent: 'exit', action: 'execute_command', targetCommand: 'exit' },
    { intent: 'quit', action: 'execute_command', targetCommand: 'exit' },
    { intent: '退出', action: 'execute_command', targetCommand: 'exit' },
    { intent: '再见', action: 'execute_command', targetCommand: 'exit' },
];
/** 关键词匹配规则（降级兜底） */
const KEYWORD_FALLBACK = [
    { keywords: ['定时', '定时任务', 'timer', '每小时', '每分钟', 'cron', 'schedule', '创建定时', '添加定时'], action: 'switch_mode', targetMode: mode_1.ReplMode.Timer },
    { keywords: ['知识库', 'kb', 'knowledge', '搜索', '查询', 'search', '知识', '词条', '添加知识'], action: 'switch_mode', targetMode: mode_1.ReplMode.Kb },
    { keywords: ['mcp', '模型上下文', 'model context', 'MCP配置', '配置MCP'], action: 'switch_mode', targetMode: mode_1.ReplMode.Mcp },
    { keywords: ['状态', 'status', '服务状态', '看看服务', '检查服务'], action: 'show_status' },
    { keywords: ['帮助', 'help', '帮忙', '有什么命令', '能做什么', '命令列表'], action: 'show_help' },
    { keywords: ['清除', 'clear', '清屏', '清理屏幕'], action: 'execute_command' },
    { keywords: ['退出', 'exit', 'quit', '再见', '关闭'], action: 'execute_command' },
];
/**
 * 参数标准化映射
 * 定义各类型命令的标准参数名和别名
 */
/** 知识库命令参数映射 */
const KB_PARAM_MAP = {
    title: ['title', 'name', 'subject', 'heading', '标题'],
    content: ['content', 'text', 'body', 'description', 'value', '内容'],
    tags: ['tags', 'tag', 'labels', 'categories', '标签'],
    category: ['category', 'type', 'kind', '分类'],
};
/** 定时任务命令参数映射 */
const TIMER_PARAM_MAP = {
    name: ['name', 'title', 'subject', '名称'],
    cron: ['cron', 'schedule', 'time', 'interval', 'frequency', 'cron表达式'],
    url: ['url', 'endpoint', 'webhook', 'callback', 'callback_url', '回调', '地址'],
    method: ['method', 'http_method', 'verb', 'http方法'],
};
/** MCP 命令参数映射 */
const MCP_PARAM_MAP = {
    name: ['name', 'title', '名称'],
    type: ['type', 'kind', '类型'],
    config: ['config', 'url', 'command', 'endpoint', '配置'],
};
/**
 * 参数标准化函数
 * 将 NLP 返回的各种格式参数转换为标准格式
 */
function normalizeParams(params, paramMap) {
    if (!params || typeof params !== 'object') {
        return {};
    }
    const result = {};
    // 处理嵌套结构：params, data, metadata
    let flatParams = { ...params };
    if (params.params && typeof params.params === 'object') {
        flatParams = { ...flatParams, ...params.params };
    }
    if (params.data && typeof params.data === 'object') {
        flatParams = { ...flatParams, ...params.data };
    }
    if (params.metadata && typeof params.metadata === 'object') {
        flatParams = { ...flatParams, ...params.metadata };
    }
    // 遍历目标参数名，查找第一个匹配的源参数
    for (const [targetKey, sourceKeys] of Object.entries(paramMap)) {
        for (const sourceKey of sourceKeys) {
            if (flatParams[sourceKey] !== undefined && flatParams[sourceKey] !== null) {
                const value = flatParams[sourceKey];
                // 处理数组（如 tags）
                if (Array.isArray(value)) {
                    result[targetKey] = value.map(v => String(v)).join(',');
                }
                else {
                    result[targetKey] = String(value);
                }
                break;
            }
        }
    }
    return result;
}
/**
 * 标准化知识库参数
 */
function normalizeKBParams(params) {
    return normalizeParams(params, KB_PARAM_MAP);
}
/**
 * 标准化定时任务参数
 */
function normalizeTimerParams(params) {
    return normalizeParams(params, TIMER_PARAM_MAP);
}
/**
 * 标准化 MCP 参数
 */
function normalizeMCPParams(params) {
    return normalizeParams(params, MCP_PARAM_MAP);
}
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
                const action = {
                    type: keywordFallback.action,
                    parameters,
                };
                if (keywordFallback.targetMode) {
                    action.targetMode = keywordFallback.targetMode;
                }
                return action;
            }
            // 没有找到映射，默认进入 chat 模式（静默处理，不显示技术性信息）
            return {
                type: 'chat',
            };
        }
        // 根据意图类型标准化参数
        let normalizedParams = {};
        switch (mapping.action) {
            case 'switch_mode':
                if (mapping.targetMode === mode_1.ReplMode.Kb) {
                    normalizedParams = normalizeKBParams(parameters);
                }
                else if (mapping.targetMode === mode_1.ReplMode.Timer) {
                    normalizedParams = normalizeTimerParams(parameters);
                }
                else if (mapping.targetMode === mode_1.ReplMode.Mcp) {
                    normalizedParams = normalizeMCPParams(parameters);
                }
                else {
                    normalizedParams = parameters || {};
                }
                break;
            default:
                normalizedParams = parameters || {};
        }
        // 构建路由动作
        const action = {
            type: mapping.action,
            parameters: normalizedParams,
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