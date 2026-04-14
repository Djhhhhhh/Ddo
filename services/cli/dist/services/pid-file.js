"use strict";
/**
 * PID 文件操作模块
 * 管理服务的进程 ID 文件读写
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
exports.writePid = writePid;
exports.readPid = readPid;
exports.removePid = removePid;
exports.isProcessRunning = isProcessRunning;
exports.killProcess = killProcess;
exports.isServiceRunning = isServiceRunning;
exports.cleanAllPids = cleanAllPids;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 写入 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @param pid 进程 ID
 */
function writePid(pidDir, serviceName, pid) {
    const pidFile = path.join(pidDir, `${serviceName}.pid`);
    fs.writeFileSync(pidFile, pid.toString(), 'utf8');
    logger_1.default.debug(`写入 PID 文件: ${pidFile} = ${pid}`);
}
/**
 * 读取 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @returns 进程 ID，如果不存在返回 null
 */
function readPid(pidDir, serviceName) {
    const pidFile = path.join(pidDir, `${serviceName}.pid`);
    if (!fs.existsSync(pidFile)) {
        return null;
    }
    try {
        const content = fs.readFileSync(pidFile, 'utf8').trim();
        const pid = parseInt(content, 10);
        return isNaN(pid) ? null : pid;
    }
    catch {
        return null;
    }
}
/**
 * 删除 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 */
function removePid(pidDir, serviceName) {
    const pidFile = path.join(pidDir, `${serviceName}.pid`);
    if (fs.existsSync(pidFile)) {
        fs.removeSync(pidFile);
        logger_1.default.debug(`删除 PID 文件: ${pidFile}`);
    }
}
/**
 * 检查进程是否存活
 * @param pid 进程 ID
 * @returns 是否存活
 */
function isProcessRunning(pid) {
    try {
        // Windows 使用 tasklist，Unix 使用 kill -0
        if (process.platform === 'win32') {
            const { spawnSync } = require('child_process');
            const result = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], {
                encoding: 'utf8',
                timeout: 5000,
            });
            return result.stdout && result.stdout.includes(pid.toString());
        }
        else {
            // Unix-like: kill -0 检查进程是否存在
            process.kill(pid, 0);
            return true;
        }
    }
    catch {
        return false;
    }
}
/**
 * 终止进程
 * @param pid 进程 ID
 * @param force 是否强制终止
 * @returns 是否成功终止
 */
function killProcess(pid, force = false) {
    try {
        if (process.platform === 'win32') {
            const { spawnSync } = require('child_process');
            const args = force ? ['/F', '/PID', pid.toString()] : ['/PID', pid.toString()];
            const result = spawnSync('taskkill', args, {
                encoding: 'utf8',
                timeout: 10000,
            });
            return result.status === 0;
        }
        else {
            const signal = force ? 'SIGKILL' : 'SIGTERM';
            process.kill(pid, signal);
            return true;
        }
    }
    catch (err) {
        logger_1.default.debug(`终止进程 ${pid} 失败: ${err}`);
        return false;
    }
}
/**
 * 检查服务是否正在运行
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @returns 是否正在运行
 */
function isServiceRunning(pidDir, serviceName) {
    const pid = readPid(pidDir, serviceName);
    if (pid === null) {
        return false;
    }
    return isProcessRunning(pid);
}
/**
 * 清理所有 PID 文件
 * @param pidDir PID 文件目录
 */
function cleanAllPids(pidDir) {
    if (!fs.existsSync(pidDir)) {
        return;
    }
    const files = fs.readdirSync(pidDir);
    for (const file of files) {
        if (file.endsWith('.pid')) {
            fs.removeSync(path.join(pidDir, file));
        }
    }
    logger_1.default.debug('清理所有 PID 文件');
}
//# sourceMappingURL=pid-file.js.map