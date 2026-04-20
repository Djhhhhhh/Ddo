"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kbWebCommand = exports.mcpWebCommand = exports.timerWebCommand = exports.statusWebCommand = exports.webCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
const open_url_1 = require("../../utils/open-url");
const WEB_SHORTCUT_ROUTES = {
    web: '',
    'status-web': '/dashboard',
    'timer-web': '/timer',
    'mcp-web': '/mcp',
    'kb-web': '/knowledge',
};
function createWebShortcutCommand(name, description) {
    return {
        name,
        description,
        usage: `/${name}`,
        handler: async () => {
            const result = await (0, open_url_1.openWebPage)({
                route: WEB_SHORTCUT_ROUTES[name],
            });
            if (result.success) {
                console.log(chalk_1.default.green(`已打开 Web 页面: ${result.url}`));
            }
            else {
                console.log(chalk_1.default.yellow('打开浏览器失败，请手动访问以下地址:'));
                console.log(chalk_1.default.cyan(result.url));
                if (result.error) {
                    console.log(chalk_1.default.gray(`原因: ${result.error}`));
                }
            }
            return { shouldContinue: true, outputType: index_1.CommandType.Command };
        },
    };
}
exports.webCommand = createWebShortcutCommand('web', '打开 Dashboard 首页');
exports.statusWebCommand = createWebShortcutCommand('status-web', '打开 Dashboard 状态页');
exports.timerWebCommand = createWebShortcutCommand('timer-web', '打开 Dashboard 定时任务页');
exports.mcpWebCommand = createWebShortcutCommand('mcp-web', '打开 Dashboard MCP 配置页');
exports.kbWebCommand = createWebShortcutCommand('kb-web', '打开 Dashboard 知识库页');
//# sourceMappingURL=web-shortcuts.js.map