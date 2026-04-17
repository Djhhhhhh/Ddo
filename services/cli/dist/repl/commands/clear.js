"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCommand = void 0;
const index_1 = require("./index");
const index_2 = require("../index");
exports.clearCommand = {
    name: 'clear',
    description: '清屏（保留首页提示）',
    aliases: ['cls'],
    usage: '/clear',
    handler: async () => {
        // 重新显示首页信息（包含 clear），而不是单纯的清屏
        (0, index_2.showWelcomeAgain)();
        return { shouldContinue: true, outputType: index_1.CommandType.Command };
    },
};
//# sourceMappingURL=clear.js.map