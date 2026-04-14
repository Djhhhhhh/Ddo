"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpCommand = exports.timerCommand = exports.kbCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const mode_1 = require("../mode");
/**
 * 模式切换命令工厂
 */
function createModeCommand(name, mode, description, welcomeMessage) {
    return {
        name,
        description,
        usage: `/${name}`,
        handler: async ({ setMode, modeManager }) => {
            if (modeManager.mode === mode) {
                console.log(chalk_1.default.gray(`已在 ${name} 模式`));
                return true;
            }
            setMode(mode);
            console.log();
            console.log(chalk_1.default.cyan(welcomeMessage));
            console.log(chalk_1.default.gray('提示: 输入 /back 返回默认模式，/help 查看可用命令'));
            console.log();
            return true;
        },
    };
}
/** 知识库模式 */
exports.kbCommand = createModeCommand('kb', mode_1.ReplMode.Kb, '进入知识库管理模式', '📚 已进入知识库管理模式\n\n可用命令:\n  list           - 列出知识库\n  add <n> <p>    - 添加知识库\n  search <q>     - 搜索\n  remove <n>     - 删除知识库');
/** 定时任务模式 */
exports.timerCommand = createModeCommand('timer', mode_1.ReplMode.Timer, '进入定时任务管理模式', '⏰ 已进入定时任务管理模式\n\n可用命令:\n  list           - 列出定时任务\n  add <c> <cmd>  - 添加定时任务\n  remove <id>    - 删除定时任务');
/** MCP 模式 */
exports.mcpCommand = createModeCommand('mcp', mode_1.ReplMode.Mcp, '进入 MCP 管理模式', '🔌 已进入 MCP 管理模式\n\n可用命令:\n  list           - 列出 MCP 服务\n  add <n> <url>  - 添加 MCP 服务\n  remove <n>     - 删除 MCP 服务');
//# sourceMappingURL=mode-switch.js.map