"use strict";
/**
 * 工具注册 - 在应用启动时注册所有可用的工具
 *
 * 使用方法：
 * 1. 在 commands/index.ts 或相关文件中导入 registerAllTools
 * 2. 在 REPL 初始化时调用 registerAllTools()
 * 3. 通过 executeTool(toolName, params, ctx) 执行工具
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveToolName = resolveToolName;
exports.registerAllTools = registerAllTools;
exports.executeToolByName = executeToolByName;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
const kb_commands_1 = require("../commands/kb-commands");
const timer_commands_1 = require("../commands/timer-commands");
const mcp_commands_1 = require("../commands/mcp-commands");
const commands_1 = require("../commands");
/**
 * 工具名称别名映射
 * 支持 NLP/意图识别返回的各种命名格式
 */
const TOOL_ALIASES = {
    // 知识库
    'knowledge.add': 'kb-add',
    'kb.add': 'kb-add',
    'knowledge.search': 'kb-search',
    'kb.search': 'kb-search',
    'knowledge.list': 'kb-list',
    'kb.list': 'kb-list',
    'knowledge.remove': 'kb-remove',
    'kb.remove': 'kb-remove',
    // 定时任务
    'timer.create': 'timer-add',
    'timer.add': 'timer-add',
    'timer.create.interval': 'timer-add-interval',
    'timer.add.interval': 'timer-add-interval',
    'timer.create.delay': 'timer-add-delay',
    'timer.add.delay': 'timer-add-delay',
    'timer.list': 'timer-list',
    // MCP
    'mcp.setup': 'mcp-add',
    'mcp.add': 'mcp-add',
    'mcp.list': 'mcp-list',
};
/**
 * 解析工具名称（支持别名）
 */
function resolveToolName(name) {
    return TOOL_ALIASES[name] || name;
}
/**
 * 注册所有工具
 */
function registerAllTools() {
    console.log(chalk_1.default.gray('[tools] Registering all tools...'));
    // === 知识库工具 ===
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(kb_commands_1.kbAddCommand, '添加知识库词条'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(kb_commands_1.kbSearchCommand, '搜索知识库'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(kb_commands_1.kbListCommand, '列出知识库'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(kb_commands_1.kbRemoveCommand, '删除知识库'));
    // === 定时任务工具 ===
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(timer_commands_1.timerAddCommand, '创建定时任务'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(timer_commands_1.timerAddIntervalCommand, '创建间隔重复任务'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(timer_commands_1.timerAddDelayCommand, '创建一次性延迟任务'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(timer_commands_1.timerListCommand, '列出定时任务'));
    // === MCP 工具 ===
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(mcp_commands_1.mcpAddCommand, '添加 MCP 配置'));
    (0, index_1.registerTool)((0, index_1.commandToToolHandler)(mcp_commands_1.mcpListCommand, '列出 MCP 配置'));
    console.log(chalk_1.default.gray(`[tools] All tools registered`));
}
/**
 * 执行工具（支持别名）
 */
async function executeToolByName(name, params, ctx) {
    const resolvedName = resolveToolName(name);
    const handler = (0, index_1.getTool)(resolvedName);
    if (!handler) {
        console.log(chalk_1.default.red(`[tools] Unknown tool: ${name} (resolved: ${resolvedName})`));
        return { shouldContinue: true, outputType: commands_1.CommandType.Command };
    }
    return await handler.execute(params, ctx);
}
//# sourceMappingURL=registry.js.map