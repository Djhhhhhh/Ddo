"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backCommand = exports.exitCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("./index");
exports.exitCommand = {
    name: 'exit',
    description: '退出 REPL',
    aliases: ['quit', 'q'],
    usage: '/exit 或 /quit 或 /q',
    handler: async ({ rl }) => {
        console.log(chalk_1.default.gray('再见! 👋'));
        rl.close();
        return { shouldContinue: false, outputType: index_1.CommandType.Command }; // 返回 false 表示退出 REPL
    },
};
exports.backCommand = {
    name: 'back',
    description: '返回默认模式（从子命令模式）',
    aliases: ['b', 'home'],
    usage: '/back',
    handler: async ({ modeManager, setMode }) => {
        if (modeManager.isInSubMode()) {
            setMode(modeManager.mode);
            modeManager.backToDefault();
            console.log(chalk_1.default.gray('已返回默认模式'));
        }
        else {
            console.log(chalk_1.default.gray('已在默认模式下'));
        }
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
//# sourceMappingURL=exit.js.map