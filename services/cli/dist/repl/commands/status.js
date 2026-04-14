"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
exports.statusCommand = {
    name: 'status',
    description: '查看所有服务状态',
    usage: '/status',
    handler: async () => {
        console.log(chalk_1.default.cyan('\n服务状态:'));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        const services = [
            { name: 'CLI', status: 'running', version: '0.1.0' },
            { name: 'MySQL', status: 'unknown', version: '-' },
            { name: 'server-go', status: 'unknown', version: '-' },
            { name: 'llm-py', status: 'unknown', version: '-' },
            { name: 'web-ui', status: 'unknown', version: '-' },
        ];
        for (const svc of services) {
            const statusColor = svc.status === 'running'
                ? chalk_1.default.green
                : svc.status === 'stopped'
                    ? chalk_1.default.red
                    : chalk_1.default.gray;
            const statusIcon = svc.status === 'running' ? '●' : svc.status === 'stopped' ? '○' : '?';
            console.log(`  ${statusColor(statusIcon)} ${svc.name.padEnd(12)} ${statusColor(svc.status.padEnd(8))} ${chalk_1.default.gray(svc.version)}`);
        }
        console.log();
        console.log(chalk_1.default.gray('提示: 状态检查功能将在后续完善'));
        console.log();
        return true;
    },
};
//# sourceMappingURL=status.js.map