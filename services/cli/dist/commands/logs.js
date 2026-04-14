"use strict";
/**
 * ddo logs 命令实现
 * 查看服务日志
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
exports.logsCommand = logsCommand;
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../utils/logger"));
const paths_1 = require("../utils/paths");
const log_reader_1 = require("../utils/log-reader");
const docker_1 = require("../utils/docker");
/**
 * 执行 logs 命令
 */
async function logsCommand(service, options) {
    // 1. 解析参数
    const targetService = service || 'cli';
    const lines = options.lines ? parseInt(options.lines, 10) : 100;
    const follow = options.follow || false;
    const since = options.since;
    const level = options.level?.toUpperCase();
    // 验证服务名称
    if (!(0, log_reader_1.isValidService)(targetService)) {
        return {
            success: false,
            error: `未知的服务: ${targetService}\n支持的服务: ${log_reader_1.SUPPORTED_SERVICES.join(', ')}`,
        };
    }
    // 验证级别
    if (level && !['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
        return {
            success: false,
            error: `无效的日志级别: ${level}\n支持的级别: DEBUG, INFO, WARN, ERROR`,
        };
    }
    // 2. 解析数据目录
    const dataDir = (0, paths_1.resolveDataDir)({
        dataDir: options.dataDir,
        envDataDir: process.env.DDO_DATA_DIR,
    });
    const paths = (0, paths_1.getPaths)(dataDir);
    // 3. 输出日志信息头
    if (!follow) {
        logger_1.default.section('查看日志');
        logger_1.default.info(`数据目录: ${logger_1.default.path((0, paths_1.prettyPath)(dataDir))}`);
        logger_1.default.info(`服务: ${chalk_1.default.cyan(log_reader_1.SERVICE_DISPLAY_NAMES[targetService] || targetService)}`);
        logger_1.default.info(`行数: ${lines}`);
        if (since) {
            logger_1.default.info(`时间过滤: ${since}`);
        }
        if (level) {
            logger_1.default.info(`级别过滤: ${level}`);
        }
        logger_1.default.newline();
    }
    try {
        // 4. 处理不同服务的日志
        if (targetService === 'mysql') {
            await showMySQLLogs(lines, follow, since);
        }
        else if (targetService === 'all') {
            await showAllLogs(paths.logs, lines, since, level);
        }
        else {
            await showServiceLogs(paths.logs, targetService, lines, follow, since, level);
        }
        return { success: true };
    }
    catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
/**
 * 显示单个服务的日志
 */
async function showServiceLogs(logsDir, service, lines, follow, since, level) {
    const logPath = (0, log_reader_1.getLogFilePath)(logsDir, service);
    // 检查日志文件是否存在
    const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
    if (!(await fs.pathExists(logPath))) {
        console.log(chalk_1.default.yellow(`⚠ 日志文件不存在: ${(0, paths_1.prettyPath)(logPath)}`));
        console.log(chalk_1.default.gray('服务可能尚未启动或无日志输出'));
        return;
    }
    if (follow) {
        // 实时跟踪模式
        console.log(chalk_1.default.cyan(`⏺ 正在跟踪 ${log_reader_1.SERVICE_DISPLAY_NAMES[service]} 日志（按 Ctrl+C 停止）...`));
        console.log();
        const abortController = new AbortController();
        // 处理 Ctrl+C
        process.on('SIGINT', () => {
            abortController.abort();
            console.log();
            console.log(chalk_1.default.gray('✓ 已停止跟踪'));
            process.exit(0);
        });
        await (0, log_reader_1.followLogFile)(logPath, since, level, (line) => {
            console.log((0, log_reader_1.highlightLogLevel)(line));
        }, abortController.signal);
    }
    else {
        // 一次性读取模式
        const lines_content = await (0, log_reader_1.readLastLines)(logPath, lines, since, level);
        if (lines_content.length === 0) {
            console.log(chalk_1.default.gray('（无日志内容）'));
            return;
        }
        for (const line of lines_content) {
            console.log((0, log_reader_1.highlightLogLevel)(line));
        }
        console.log();
        console.log(chalk_1.default.gray(`✓ 共显示 ${lines_content.length} 行`));
    }
}
/**
 * 显示所有服务的日志
 */
async function showAllLogs(logsDir, lines, since, level) {
    const services = ['cli', 'server-go', 'llm-py', 'web-ui'];
    // 读取多个服务的日志
    const entries = await (0, log_reader_1.readMultipleLogs)(logsDir, services, lines, since, level);
    if (entries.length === 0) {
        console.log(chalk_1.default.yellow('⚠ 无日志内容'));
        return;
    }
    // 获取最大服务名长度用于对齐
    const maxNameLen = Math.max(...entries.map(e => e.service.length));
    // 输出日志
    for (const entry of entries.slice(-lines)) {
        const serviceTag = chalk_1.default.dim(`[${entry.service.padEnd(maxNameLen)}]`);
        const levelTag = entry.level ? formatLevelTag(entry.level) : '';
        console.log(`${serviceTag} ${levelTag}${entry.message}`);
    }
    console.log();
    console.log(chalk_1.default.gray(`✓ 共显示 ${entries.length} 条日志`));
}
/**
 * 格式化日志级别标签
 */
function formatLevelTag(level) {
    const colors = {
        ERROR: chalk_1.default.red,
        FATAL: chalk_1.default.red,
        WARN: chalk_1.default.yellow,
        WARNING: chalk_1.default.yellow,
        INFO: chalk_1.default.cyan,
        DEBUG: chalk_1.default.gray,
    };
    const color = colors[level] || chalk_1.default.gray;
    return color(`[${level}] `);
}
/**
 * 显示 MySQL 容器日志
 */
async function showMySQLLogs(lines, follow, since) {
    try {
        const { output, process: proc } = await (0, log_reader_1.getMySQLLogs)(docker_1.MYSQL_CONTAINER_NAME, lines, follow, since);
        if (follow && proc) {
            // 实时跟踪模式
            console.log(chalk_1.default.cyan(`⏺ 正在跟踪 MySQL 日志（按 Ctrl+C 停止）...`));
            console.log();
            proc.stdout?.on('data', (data) => {
                process.stdout.write(data);
            });
            proc.stderr?.on('data', (data) => {
                process.stderr.write(data);
            });
            // 处理 Ctrl+C
            process.on('SIGINT', () => {
                proc.kill();
                console.log();
                console.log(chalk_1.default.gray('✓ 已停止跟踪'));
                process.exit(0);
            });
            // 等待进程结束
            await new Promise((resolve) => {
                proc.on('close', resolve);
            });
        }
        else {
            // 一次性输出
            if (output.trim()) {
                console.log(output.trim());
            }
            else {
                console.log(chalk_1.default.gray('（无日志内容）'));
            }
        }
    }
    catch (err) {
        console.log(chalk_1.default.red(`✗ 获取 MySQL 日志失败: ${err instanceof Error ? err.message : String(err)}`));
        console.log(chalk_1.default.gray('提示: 请确保 Docker 正在运行且 MySQL 容器已启动'));
    }
}
//# sourceMappingURL=logs.js.map