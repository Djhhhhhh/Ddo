"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const mode_1 = require("../mode");
const api_client_1 = require("../../services/api-client");
exports.chatCommand = {
    name: 'chat',
    description: '与 AI 助手对话',
    usage: '/chat <消息> 或 /chat -m "消息内容"',
    handler: async ({ args, flags, modeManager, setMode }) => {
        // 如果没有参数，进入持续聊天模式
        if (args.length === 0 && Object.keys(flags).length === 0) {
            setMode(mode_1.ReplMode.Chat);
            console.log(chalk_1.default.green('已进入聊天模式，直接输入消息与 AI 对话'));
            console.log(chalk_1.default.gray('提示: 输入 /back 返回默认模式，输入 /exit 退出 REPL'));
            return true;
        }
        // 获取消息内容
        let message;
        if (flags.m || flags.message) {
            message = String(flags.m || flags.message);
        }
        else if (args.length > 0) {
            message = args.join(' ');
        }
        else {
            console.log(chalk_1.default.yellow('请输入对话内容'));
            console.log(chalk_1.default.gray('用法: /chat <消息> 或 /chat -m "消息内容"'));
            return true;
        }
        console.log(chalk_1.default.cyan('你:'), message);
        console.log();
        const apiClient = (0, api_client_1.getApiClient)();
        try {
            console.log(chalk_1.default.gray('正在等待 AI 回复...'));
            console.log();
            const response = await apiClient.chat([
                { role: 'user', content: message }
            ], false);
            console.log(chalk_1.default.green('AI:'), response.content);
            if (response.usage) {
                console.log();
                console.log(chalk_1.default.gray(`(tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out)`));
            }
        }
        catch (err) {
            console.log(chalk_1.default.red('请求失败:'), err instanceof Error ? err.message : String(err));
        }
        console.log();
        return true;
    },
};
//# sourceMappingURL=chat.js.map