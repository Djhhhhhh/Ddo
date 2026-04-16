"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const api_client_1 = require("../../services/api-client");
exports.statusCommand = {
    name: 'status',
    description: '查看所有服务状态',
    usage: '/status',
    handler: async () => {
        const apiClient = (0, api_client_1.getApiClient)();
        console.log(chalk_1.default.cyan('\n服务状态:'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        // 并行调用健康检查和综合指标
        const [healthResult, metricsResult] = await Promise.allSettled([
            apiClient.getHealth(),
            apiClient.getMetrics(),
        ]);
        // server-go 健康状态
        if (healthResult.status === 'fulfilled') {
            console.log(`  ${chalk_1.default.green('●')} server-go  ${chalk_1.default.green('running')}`);
        }
        else {
            console.log(`  ${chalk_1.default.red('●')} server-go  ${chalk_1.default.red('stopped')}`);
        }
        // llm-py 状态（通过 metrics）
        if (metricsResult.status === 'fulfilled') {
            const m = metricsResult.value;
            const llmPyStatus = m.services?.llm_py;
            console.log(`  ${llmPyStatus === 'running' ? chalk_1.default.green('●') : chalk_1.default.red('●')} llm-py   ${llmPyStatus ? chalk_1.default.green(llmPyStatus) : chalk_1.default.red('stopped')}`);
        }
        else {
            console.log(`  ${chalk_1.default.red('●')} llm-py   ${chalk_1.default.red('unknown')}`);
        }
        // CLI 状态（始终 running，因为 REPL 在运行）
        console.log(`  ${chalk_1.default.green('●')} CLI       ${chalk_1.default.green('running')}`);
        console.log();
        return true;
    },
};
//# sourceMappingURL=status.js.map