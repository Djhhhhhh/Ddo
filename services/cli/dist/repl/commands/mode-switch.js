"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpCommand = exports.timerCommand = exports.kbCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
/**
 * 创建快捷命令（不切换模式，只是执行对应子命令）
 * 这些命令原本是模式切换命令，现在改为直接执行对应操作
 */
function createQuickCommand(name, subCommand, description) {
    return {
        name,
        description,
        usage: `/${name}`,
        handler: async (ctx) => {
            // 直接执行对应子命令
            const cmd = index_1.registry.get(subCommand);
            if (cmd) {
                return await cmd.handler(ctx);
            }
            console.log(chalk_1.default.red(`命令 ${subCommand} 不存在`));
            return true;
        },
    };
}
/** 知识库快捷命令 */
exports.kbCommand = createQuickCommand('kb', 'kb-list', '查看知识库列表');
/** 定时任务快捷命令 */
exports.timerCommand = createQuickCommand('timer', 'timer-list', '查看定时任务列表');
/** MCP 快捷命令 */
exports.mcpCommand = createQuickCommand('mcp', 'mcp-list', '查看 MCP 配置列表');
//# sourceMappingURL=mode-switch.js.map