"use strict";
/**
 * 日志输出工具
 * 提供统一的终端输出格式和颜色
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
/** 日志级别数值 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class Logger {
    constructor() {
        this.level = 'info';
        this.silent = false;
    }
    setLevel(level) {
        this.level = level;
    }
    setSilent(silent) {
        this.silent = silent;
    }
    shouldLog(level) {
        if (this.silent)
            return false;
        return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
    }
    debug(message) {
        if (this.shouldLog('debug')) {
            console.log(chalk_1.default.gray(`[debug] ${message}`));
        }
    }
    info(message) {
        if (this.shouldLog('info')) {
            console.log(chalk_1.default.blue(message));
        }
    }
    success(message) {
        if (this.shouldLog('info')) {
            console.log(chalk_1.default.green(`✓ ${message}`));
        }
    }
    warn(message) {
        if (this.shouldLog('warn')) {
            console.log(chalk_1.default.yellow(`⚠ ${message}`));
        }
    }
    error(message) {
        if (this.shouldLog('error')) {
            console.error(chalk_1.default.red(`✗ ${message}`));
        }
    }
    /** 输出带标题的信息块 */
    section(title) {
        if (this.shouldLog('info')) {
            console.log('\n' + chalk_1.default.bold.cyan(`▸ ${title}`));
        }
    }
    /** 输出分隔线 */
    divider() {
        if (this.shouldLog('info')) {
            console.log(chalk_1.default.gray('─'.repeat(50)));
        }
    }
    /** 输出空行 */
    newline() {
        if (!this.silent) {
            console.log();
        }
    }
    /** 格式化路径输出 */
    path(p) {
        return chalk_1.default.cyan(p);
    }
    /** 格式化命令输出 */
    command(cmd) {
        return chalk_1.default.yellow(`\`${cmd}\``);
    }
    /** 格式化代码/文件名输出 */
    code(text) {
        return chalk_1.default.magenta(text);
    }
}
exports.logger = new Logger();
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map