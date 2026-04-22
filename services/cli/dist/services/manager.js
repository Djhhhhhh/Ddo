"use strict";
/**
 * 服务管理器
 * 负责启动、停止和管理后台服务
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
exports.createServiceManager = createServiceManager;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const child_process_1 = require("child_process");
const logger_1 = __importDefault(require("../utils/logger"));
const pid_file_1 = require("./pid-file");
const health_check_1 = require("./health-check");
/**
 * 创建服务管理器
 */
function createServiceManager(config) {
    const { pidDir, logDir, dataDir } = config;
    // 确保目录存在
    fs.ensureDirSync(pidDir);
    fs.ensureDirSync(logDir);
    /**
     * 启动单个服务
     */
    async function startService(service) {
        // 检查是否已在运行
        if ((0, pid_file_1.isServiceRunning)(pidDir, service.name)) {
            const existingPid = (0, pid_file_1.readPid)(pidDir, service.name);
            logger_1.default.warn(`${service.displayName} 已在运行 (PID: ${existingPid})`);
            return { success: true, pid: existingPid ?? undefined };
        }
        // 准备日志文件
        const logFile = path.join(logDir, `${service.name}.log`);
        const logStream = fs.createWriteStream(logFile, { flags: 'a' });
        // 准备环境变量
        const env = {
            ...process.env,
            DDO_DATA_DIR: dataDir,
            ...service.env,
        };
        // 准备启动选项
        // Windows 不支持 stdio 传入流，使用 'pipe' 然后手动重定向
        const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(service.command[0]);
        const spawnOptions = {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env,
            shell: needsShell,
            windowsHide: true,
        };
        if (service.cwd) {
            spawnOptions.cwd = service.cwd;
        }
        try {
            logger_1.default.info(`启动 ${service.displayName}...`);
            // 启动进程
            const child = (0, child_process_1.spawn)(service.command[0], service.command.slice(1), spawnOptions);
            // 处理启动错误
            if (!child.pid) {
                logStream.end();
                return {
                    success: false,
                    error: `无法启动 ${service.displayName}: 进程创建失败`,
                };
            }
            // 重定向输出到日志文件
            if (child.stdout) {
                child.stdout.pipe(logStream, { end: false });
            }
            if (child.stderr) {
                child.stderr.pipe(logStream, { end: false });
            }
            // 写入 PID 文件
            (0, pid_file_1.writePid)(pidDir, service.name, child.pid);
            // 分离进程
            child.unref();
            logger_1.default.debug(`${service.displayName} 进程已启动，PID: ${child.pid}`);
            const startupStrategy = service.startupStrategy || 'health';
            if (startupStrategy === 'process') {
                const timeoutMs = service.startupTimeoutMs ?? 5000;
                await sleep(timeoutMs);
                if (!(0, pid_file_1.isProcessRunning)(child.pid)) {
                    (0, pid_file_1.removePid)(pidDir, service.name);
                    logStream.end();
                    return {
                        success: false,
                        error: `${service.displayName} 启动后立即退出，请检查日志: ${logFile}`,
                    };
                }
                logger_1.default.success(`${service.displayName} 已启动 (PID: ${child.pid})`);
                return { success: true, pid: child.pid };
            }
            // 等待服务就绪
            const healthy = await (0, health_check_1.waitForHealthy)(service.healthUrl, service.startupTimeoutMs ?? 30000, 1000);
            if (!healthy) {
                // 启动失败，清理
                (0, pid_file_1.killProcess)(child.pid, true);
                (0, pid_file_1.removePid)(pidDir, service.name);
                logStream.end();
                return {
                    success: false,
                    error: `${service.displayName} 启动超时，请检查日志: ${logFile}`,
                };
            }
            logger_1.default.success(`${service.displayName} 已就绪 (PID: ${child.pid}, 端口: ${service.port})`);
            return { success: true, pid: child.pid };
        }
        catch (err) {
            logStream.end();
            return {
                success: false,
                error: `启动 ${service.displayName} 失败: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    }
    /**
     * 停止单个服务
     */
    async function stopService(serviceName, displayName) {
        const pid = (0, pid_file_1.readPid)(pidDir, serviceName);
        if (pid === null) {
            logger_1.default.debug(`${displayName} 未运行（无 PID 文件）`);
            return { success: true };
        }
        if (!(0, pid_file_1.isProcessRunning)(pid)) {
            logger_1.default.debug(`${displayName} 进程已不存在，清理 PID 文件`);
            (0, pid_file_1.removePid)(pidDir, serviceName);
            return { success: true };
        }
        // Windows 下 detached 进程无法优雅终止，直接强制终止
        logger_1.default.info(`停止 ${displayName} (PID: ${pid})...`);
        (0, pid_file_1.killProcess)(pid, process.platform === 'win32');
        await sleep(1000);
        // 清理 PID 文件
        (0, pid_file_1.removePid)(pidDir, serviceName);
        // 再次确认进程是否已停止
        if ((0, pid_file_1.isProcessRunning)(pid)) {
            logger_1.default.warn(`${displayName} 未响应，再次强制终止...`);
            (0, pid_file_1.killProcess)(pid, true);
            await sleep(500);
            (0, pid_file_1.removePid)(pidDir, serviceName);
        }
        logger_1.default.success(`${displayName} 已停止`);
        return { success: true };
    }
    /**
     * 获取服务状态
     */
    function getStatus(service) {
        const pid = (0, pid_file_1.readPid)(pidDir, service.name);
        const running = pid !== null && (0, pid_file_1.isProcessRunning)(pid);
        return {
            name: service.name,
            displayName: service.displayName,
            running,
            pid: running ? pid ?? undefined : undefined,
            port: service.port,
            healthUrl: service.healthUrl,
        };
    }
    /**
     * 启动所有服务
     */
    async function startAll(services) {
        const results = [];
        for (const service of services) {
            const result = await startService(service);
            results.push({ service: service.name, result });
            if (!result.success) {
                // 如果某个服务启动失败，停止已启动的服务
                logger_1.default.error(`${service.displayName} 启动失败: ${result.error}`);
                logger_1.default.info('正在回滚已启动的服务...');
                // 停止之前已启动的服务（逆序）
                const startedServices = results
                    .filter((r) => r.result.success && r.result.pid)
                    .reverse();
                for (const started of startedServices) {
                    const svc = services.find((s) => s.name === started.service);
                    if (svc) {
                        await stopService(svc.name, svc.displayName);
                    }
                }
                return { success: false, results };
            }
        }
        return { success: true, results };
    }
    /**
     * 停止所有服务
     */
    async function stopAll(services) {
        const results = [];
        let allSuccess = true;
        // 逆序停止服务
        for (const service of [...services].reverse()) {
            const result = await stopService(service.name, service.displayName);
            results.push({ service: service.name, result });
            if (!result.success) {
                allSuccess = false;
            }
        }
        return { success: allSuccess, results };
    }
    return {
        startService,
        stopService,
        getStatus,
        startAll,
        stopAll,
    };
}
/**
 * 睡眠函数
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=manager.js.map