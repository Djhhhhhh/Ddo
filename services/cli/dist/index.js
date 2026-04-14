#!/usr/bin/env node
"use strict";
/**
 * Ddo CLI 入口文件
 * 个人智能工作空间命令行工具
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const init_1 = require("./commands/init");
const start_1 = require("./commands/start");
const logger_1 = __importDefault(require("./utils/logger"));
const paths_1 = require("./utils/paths");
const program = new commander_1.Command();
// CLI 基本信息
program
    .name('ddo')
    .description('Ddo - 个人智能工作空间 CLI')
    .version('0.1.0', '-v, --version', '显示版本号')
    .helpOption('-h, --help', '显示帮助信息');
// 全局选项
program.option('-d, --data-dir <path>', '指定数据目录路径');
program.option('--silent', '静默模式，减少输出');
program.option('--verbose', '详细模式，显示调试信息');
// init 命令
program
    .command('init')
    .description('初始化 Ddo 工作空间')
    .option('-d, --data-dir <path>', '指定数据目录路径')
    .option('--skip-docker', '跳过 Docker 检查和 MySQL 启动')
    .option('--force', '强制重新生成配置文件')
    .action(async (options) => {
    try {
        // 设置日志级别
        if (options.verbose) {
            logger_1.default.setLevel('debug');
        }
        else if (options.silent) {
            logger_1.default.setSilent(true);
        }
        // 获取全局选项中的 dataDir
        const globalOpts = program.opts();
        const dataDir = options.dataDir || globalOpts.dataDir;
        const result = await (0, init_1.initCommand)({
            dataDir,
            skipDocker: options.skipDocker,
            force: options.force,
        });
        if (!result.success) {
            logger_1.default.error(result.error || '初始化失败');
            process.exit(1);
        }
        process.exit(0);
    }
    catch (err) {
        logger_1.default.error(`初始化过程出错: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
});
// start 命令
program
    .command('start')
    .description('启动所有 Ddo 服务')
    .option('-d, --data-dir <path>', '指定数据目录路径')
    .option('--skip-repl', '启动后不进入 REPL 模式')
    .option('-v, --verbose', '显示详细日志')
    .option('--silent', '静默模式')
    .action(async (options) => {
    try {
        // 设置日志级别
        if (options.verbose) {
            logger_1.default.setLevel('debug');
        }
        else if (options.silent) {
            logger_1.default.setSilent(true);
        }
        const result = await (0, start_1.startCommand)({
            dataDir: options.dataDir,
            skipRepl: options.skipRepl,
        });
        if (!result.success) {
            logger_1.default.error(result.error || '启动失败');
            process.exit(1);
        }
        // 如果跳过 REPL，直接退出
        if (options.skipRepl) {
            process.exit(0);
        }
    }
    catch (err) {
        logger_1.default.error(`启动过程出错: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
});
// stop 命令
program
    .command('stop')
    .description('停止所有 Ddo 服务')
    .option('-d, --data-dir <path>', '指定数据目录路径')
    .option('--include-mysql', '同时停止 MySQL 容器')
    .option('-v, --verbose', '显示详细日志')
    .option('--silent', '静默模式')
    .action(async (options) => {
    try {
        // 设置日志级别
        if (options.verbose) {
            logger_1.default.setLevel('debug');
        }
        else if (options.silent) {
            logger_1.default.setSilent(true);
        }
        const { stopCommand } = await Promise.resolve().then(() => __importStar(require('./commands/stop')));
        const result = await stopCommand({
            dataDir: options.dataDir,
            includeMysql: options.includeMysql,
        });
        if (!result.success) {
            logger_1.default.error(result.error || '停止失败');
            process.exit(1);
        }
        process.exit(0);
    }
    catch (err) {
        logger_1.default.error(`停止过程出错: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
});
// status 命令
program
    .command('status')
    .description('显示服务状态')
    .option('-d, --data-dir <path>', '指定数据目录路径')
    .option('-v, --verbose', '显示详细日志')
    .action(async (options) => {
    try {
        // 设置日志级别
        if (options.verbose) {
            logger_1.default.setLevel('debug');
        }
        const { statusCommand } = await Promise.resolve().then(() => __importStar(require('./commands/status')));
        const result = await statusCommand({
            dataDir: options.dataDir,
        });
        if (!result.success) {
            logger_1.default.error(result.error || '查询状态失败');
            process.exit(1);
        }
        process.exit(0);
    }
    catch (err) {
        logger_1.default.error(`查询状态出错: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
});
// logs 命令
program
    .command('logs [service]')
    .description('查看服务日志 (cli|server-go|llm-py|web-ui|mysql|all)')
    .option('-d, --data-dir <path>', '指定数据目录路径')
    .option('-n, --lines <number>', '显示最后 N 行', '100')
    .option('-f, --follow', '实时跟踪日志')
    .option('--since <time>', '显示某时间之后的日志（如 1h, 30m, 2024-01-01）')
    .option('--level <level>', '按日志级别过滤（DEBUG, INFO, WARN, ERROR）')
    .action(async (service, options) => {
    try {
        const { logsCommand } = await Promise.resolve().then(() => __importStar(require('./commands/logs')));
        const result = await logsCommand(service, options);
        if (!result.success) {
            logger_1.default.error(result.error || '查看日志失败');
            process.exit(1);
        }
        process.exit(0);
    }
    catch (err) {
        logger_1.default.error(`查看日志出错: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
});
// config 命令（占位）
program
    .command('config')
    .description('管理配置')
    .action(() => {
    const dataDir = (0, paths_1.resolveDataDir)({ envDataDir: process.env.DDO_DATA_DIR });
    logger_1.default.info(chalk_1.default.yellow('config 命令尚未实现'));
    logger_1.default.info(`配置文件位置: ${(0, paths_1.prettyPath)(`${dataDir}/config.yaml`)}`);
});
// 解析命令行参数
program.parse(process.argv);
// 如果没有提供命令，显示帮助
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map