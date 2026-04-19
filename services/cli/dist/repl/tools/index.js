"use strict";
/**
 * 工具注册表 - 统一管理所有工具的触发逻辑
 *
 * 当 NLP/意图识别决定需要执行某个工具时，通过此注册表找到对应的处理函数
 * 新增工具只需要在这里注册即可，无需修改其他代码
 *
 * 使用方法：
 * 1. 导入 registerAllTools 并在 REPL 初始化时调用
 * 2. 通过 executeToolByName(toolName, params, ctx) 执行工具
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTool = registerTool;
exports.getTool = getTool;
exports.hasTool = hasTool;
exports.executeTool = executeTool;
exports.commandToToolHandler = commandToToolHandler;
const chalk_1 = __importDefault(require("chalk"));
const commands_1 = require("../commands");
/**
 * 工具注册表
 */
const toolRegistry = new Map();
/**
 * 注册工具
 */
function registerTool(handler) {
    toolRegistry.set(handler.name, handler);
}
/**
 * 获取工具
 */
function getTool(name) {
    return toolRegistry.get(name);
}
/**
 * 检查工具是否存在
 */
function hasTool(name) {
    return toolRegistry.has(name);
}
/**
 * 执行工具
 */
async function executeTool(name, params, ctx) {
    const handler = toolRegistry.get(name);
    if (!handler) {
        console.log(chalk_1.default.red(`[tools] Unknown tool: ${name}`));
        return { shouldContinue: true, outputType: commands_1.CommandType.Command };
    }
    try {
        return await handler.execute(params, ctx);
    }
    catch (err) {
        console.log(chalk_1.default.red(`[tools] Tool execution failed: ${err}`));
        return { shouldContinue: true, outputType: commands_1.CommandType.Command };
    }
}
/**
 * 将 ReplCommand 转换为 ToolHandler
 */
function commandToToolHandler(cmd, description) {
    return {
        name: cmd.name,
        description: description || cmd.description,
        execute: async (params, ctx) => {
            // 将 params 转换为 args 数组
            const args = [];
            if (params.title)
                args.push(String(params.title));
            if (params.content)
                args.push(String(params.content));
            if (params.tags)
                args.push(String(params.tags));
            // 创建新的 CommandContext，合并参数
            const toolCtx = {
                ...ctx,
                args,
                nlpParameters: params,
            };
            return await cmd.handler(toolCtx);
        },
    };
}
//# sourceMappingURL=index.js.map