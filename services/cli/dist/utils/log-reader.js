"use strict";
/**
 * 日志读取工具
 * 提供日志文件的读取、过滤、实时跟踪功能
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_DISPLAY_NAMES = exports.SUPPORTED_SERVICES = void 0;
exports.isValidService = isValidService;
exports.getLogFilePath = getLogFilePath;
exports.parseSinceTime = parseSinceTime;
exports.parseLogLine = parseLogLine;
exports.matchLogLevel = matchLogLevel;
exports.readLastLines = readLastLines;
exports.highlightLogLevel = highlightLogLevel;
exports.followLogFile = followLogFile;
exports.getMySQLLogs = getMySQLLogs;
exports.readMultipleLogs = readMultipleLogs;
const fs = __importStar(require("fs-extra"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
/** 支持的服务列表 */
exports.SUPPORTED_SERVICES = ['cli', 'server-go', 'llm-py', 'web-ui', 'all'];
/** 服务显示名称映射 */
exports.SERVICE_DISPLAY_NAMES = {
    cli: 'CLI',
    'server-go': 'Server-Go',
    'llm-py': 'LLM-Py',
    'web-ui': 'Web-UI',
};
/** 判断是否为有效的服务名 */
function isValidService(service) {
    return exports.SUPPORTED_SERVICES.includes(service);
}
/** 获取日志文件路径 */
function getLogFilePath(logsDir, service) {
    return `${logsDir}/${service}.log`;
}
/** 解析 since 参数，返回毫秒时间戳 */
function parseSinceTime(since) {
    const now = Date.now();
    // 相对时间格式：1h, 30m, 1d
    const relativeMatch = since.match(/^(\d+)([hmd])$/);
    if (relativeMatch) {
        const value = parseInt(relativeMatch[1], 10);
        const unit = relativeMatch[2];
        const multipliers = {
            h: 60 * 60 * 1000, // 小时
            m: 60 * 1000, // 分钟
            d: 24 * 60 * 60 * 1000, // 天
        };
        return now - value * multipliers[unit];
    }
    // ISO 日期格式
    const date = new Date(since);
    if (!isNaN(date.getTime())) {
        return date.getTime();
    }
    // 默认返回 1 小时前
    return now - 60 * 60 * 1000;
}
/** 尝试从日志行解析时间戳和级别 */
function parseLogLine(line) {
    // 尝试匹配常见日志格式：
    // 2024-01-01 12:00:00 [INFO] message
    // [2024-01-01T12:00:00.000Z] [INFO] message
    // 2024-01-01T12:00:00.000Z INFO message
    const patterns = [
        // ISO 格式带方括号: [2024-01-01T12:00:00.000Z] [LEVEL] message
        /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\]\s*\[(\w+)\]\s*(.+)$/,
        // 标准格式: 2024-01-01 12:00:00 [LEVEL] message
        /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s*\[(\w+)\]\s*(.+)$/,
        // ISO 无方括号: 2024-01-01T12:00:00.000Z LEVEL message
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+(\w+)\s+(.+)$/,
    ];
    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            const timestamp = new Date(match[1]);
            if (!isNaN(timestamp.getTime())) {
                return {
                    timestamp,
                    level: match[2].toUpperCase(),
                    message: match[3],
                };
            }
        }
    }
    // 无法解析，返回原始行
    return { message: line };
}
/** 检查日志级别是否匹配 */
function matchLogLevel(lineLevel, filterLevel) {
    if (!lineLevel)
        return true;
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const lineIndex = levels.indexOf(lineLevel);
    const filterIndex = levels.indexOf(filterLevel);
    // 如果级别有效，则只显示大于等于指定级别的日志
    if (lineIndex !== -1 && filterIndex !== -1) {
        return lineIndex >= filterIndex;
    }
    return true;
}
/** 读取文件最后 N 行 */
async function readLastLines(filePath, lines, since, level) {
    if (!(await fs.pathExists(filePath))) {
        return [];
    }
    const sinceTime = since ? parseSinceTime(since) : 0;
    const result = [];
    const buffer = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    for await (const line of rl) {
        buffer.push(line);
        if (buffer.length > lines * 2) {
            buffer.shift();
        }
    }
    // 从缓冲区筛选
    for (const line of buffer) {
        const parsed = parseLogLine(line);
        // 时间过滤
        if (sinceTime > 0 && parsed.timestamp) {
            if (parsed.timestamp.getTime() < sinceTime) {
                continue;
            }
        }
        // 级别过滤
        if (level && !matchLogLevel(parsed.level, level)) {
            continue;
        }
        result.push(line);
    }
    // 只返回最后 N 行
    return result.slice(-lines);
}
/** 高亮日志级别 */
function highlightLogLevel(line) {
    // 使用 ANSI 颜色高亮不同级别
    // ERROR - 红色
    // WARN - 黄色
    // INFO - 蓝色/青色
    // DEBUG - 灰色
    return line
        .replace(/\b(ERROR|FATAL)\b/g, '\x1b[31m$1\x1b[0m') // 红色
        .replace(/\b(WARN|WARNING)\b/g, '\x1b[33m$1\x1b[0m') // 黄色
        .replace(/\b(INFO)\b/g, '\x1b[36m$1\x1b[0m') // 青色
        .replace(/\b(DEBUG)\b/g, '\x1b[90m$1\x1b[0m'); // 灰色
}
/** 实时跟踪日志文件 */
async function followLogFile(filePath, since, level, onLine, abortSignal) {
    if (!(await fs.pathExists(filePath))) {
        throw new Error(`日志文件不存在: ${filePath}`);
    }
    const sinceTime = since ? parseSinceTime(since) : 0;
    let lastSize = 0;
    // 获取初始文件大小
    const stats = await fs.stat(filePath);
    lastSize = stats.size;
    // 先读取已有内容
    const lines = await readLastLines(filePath, 10, since, level);
    for (const line of lines) {
        onLine?.(line);
    }
    // 持续监听文件变化
    return new Promise((resolve, reject) => {
        const watcher = fs.watch(filePath, async (eventType) => {
            if (eventType === 'change') {
                try {
                    const stats = await fs.stat(filePath);
                    if (stats.size > lastSize) {
                        const newContent = await fs.readFile(filePath, 'utf8');
                        const allLines = newContent.split('\n');
                        const newLines = allLines.slice(Math.max(0, allLines.length - 10));
                        for (const line of newLines) {
                            if (line.trim()) {
                                const parsed = parseLogLine(line);
                                // 时间过滤
                                if (sinceTime > 0 && parsed.timestamp) {
                                    if (parsed.timestamp.getTime() < sinceTime) {
                                        continue;
                                    }
                                }
                                // 级别过滤
                                if (level && !matchLogLevel(parsed.level, level)) {
                                    continue;
                                }
                                onLine?.(line);
                            }
                        }
                        lastSize = stats.size;
                    }
                }
                catch (err) {
                    // 忽略读取错误
                }
            }
        });
        // 处理中止信号
        abortSignal?.addEventListener('abort', () => {
            watcher.close();
            resolve();
        });
        // 优雅退出
        process.on('SIGINT', () => {
            watcher.close();
            resolve();
        });
    });
}
/** 获取 MySQL 容器日志 */
async function getMySQLLogs(containerName, lines, follow, since) {
    const args = ['logs'];
    if (follow) {
        args.push('-f');
    }
    if (lines > 0) {
        args.push('--tail', lines.toString());
    }
    if (since) {
        const sinceSeconds = Math.floor((Date.now() - parseSinceTime(since)) / 1000);
        if (sinceSeconds > 0) {
            args.push('--since', `${sinceSeconds}s`);
        }
    }
    args.push(containerName);
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)('docker', args, {
            stdio: follow ? 'pipe' : 'pipe',
        });
        let output = '';
        proc.stdout?.on('data', (data) => {
            output += data.toString();
        });
        proc.stderr?.on('data', (data) => {
            output += data.toString();
        });
        if (!follow) {
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve({ output });
                }
                else {
                    reject(new Error(`docker logs 失败，退出码: ${code}`));
                }
            });
        }
        else {
            resolve({ output: '', process: proc });
        }
    });
}
/** 读取多个服务的日志 */
async function readMultipleLogs(logsDir, services, lines, since, level) {
    const entries = [];
    for (const service of services) {
        if (service === 'mysql')
            continue; // MySQL 需要特殊处理
        const logPath = getLogFilePath(logsDir, service);
        const lines_content = await readLastLines(logPath, lines, since, level);
        for (const line of lines_content) {
            const parsed = parseLogLine(line);
            entries.push({
                ...parsed,
                service: exports.SERVICE_DISPLAY_NAMES[service] || service,
            });
        }
    }
    // 按时间戳排序
    entries.sort((a, b) => {
        if (!a.timestamp)
            return 1;
        if (!b.timestamp)
            return -1;
        return a.timestamp.getTime() - b.timestamp.getTime();
    });
    return entries;
}
//# sourceMappingURL=log-reader.js.map