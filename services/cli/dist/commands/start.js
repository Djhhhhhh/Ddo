"use strict";
/**
 * ddo start 命令实现
 * 启动所有 Ddo 服务并进入 REPL
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
exports.startCommand = startCommand;
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../utils/logger"));
const paths_1 = require("../utils/paths");
const config_1 = require("../utils/config");
const manager_1 = require("../services/manager");
const service_runtime_1 = require("../services/service-runtime");
const repl_1 = require("../repl");
/**
 * 执行 start 命令
 */
async function startCommand(options = {}) {
    logger_1.default.section('启动 Ddo 服务');
    logger_1.default.newline();
    // 1. 解析数据目录
    const dataDir = (0, paths_1.resolveDataDir)({
        dataDir: options.dataDir,
        envDataDir: process.env.DDO_DATA_DIR,
    });
    logger_1.default.info(`数据目录: ${logger_1.default.path((0, paths_1.prettyPath)(dataDir))}`);
    // 2. 检查初始化状态
    const paths = (0, paths_1.getPaths)(dataDir);
    if (!(await fs.pathExists(paths.config))) {
        return {
            success: false,
            error: `Ddo 尚未初始化。请先运行: ddo init`,
        };
    }
    // 3. 读取配置
    let config;
    try {
        config = await (0, config_1.loadDdoConfig)(dataDir);
    }
    catch (err) {
        return {
            success: false,
            error: `读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
    process.env.DDO_SERVER_GO_URL = config.endpoints.serverGo;
    process.env.DDO_WEB_UI_URL = config.endpoints.webUi;
    const allServices = await (0, service_runtime_1.getServiceDefinitions)(config, dataDir);
    // 如果没有任何服务，给出提示但仍继续进入 REPL
    let noBackendServices = false;
    if (allServices.length === 0) {
        logger_1.default.warn('未找到可启动的服务产物或源码目录');
        logger_1.default.info('当前仅 CLI 可用，部分功能受限');
        logger_1.default.newline();
        noBackendServices = true;
    }
    const services = allServices;
    // 6. 创建服务管理器
    const manager = (0, manager_1.createServiceManager)({
        pidDir: paths.services,
        logDir: paths.logs,
        dataDir,
    });
    // 7. 检查已有运行状态
    logger_1.default.section('检查服务状态');
    const statuses = [];
    for (const service of services) {
        const status = manager.getStatus(service);
        statuses.push(status);
        if (status.running) {
            logger_1.default.info(`${service.displayName}: ${logger_1.default.success('已在运行')} (PID: ${status.pid})`);
        }
        else {
            logger_1.default.info(`${service.displayName}: ${logger_1.default.warn('未运行')}`);
        }
    }
    // 8. 启动服务（如果有的话）
    let runningStatuses = [];
    if (!noBackendServices) {
        logger_1.default.newline();
        logger_1.default.section('启动服务');
        // 只启动未运行的服务
        const servicesToStart = services.filter((s) => {
            const status = manager.getStatus(s);
            return !status.running;
        });
        if (servicesToStart.length === 0) {
            logger_1.default.success('所有服务已在运行');
        }
        else {
            const startResult = await manager.startAll(servicesToStart);
            if (!startResult.success) {
                return {
                    success: false,
                    error: '部分服务启动失败，请查看日志',
                };
            }
            logger_1.default.newline();
            logger_1.default.success('所有服务已启动');
        }
        // 9. 输出服务信息
        logger_1.default.newline();
        logger_1.default.divider();
        logger_1.default.section('服务访问地址');
        runningStatuses = services.map((s) => manager.getStatus(s));
        for (const service of runningStatuses) {
            const status = service.running ? chalk_1.default.green('● 运行中') : chalk_1.default.red('● 已停止');
            const definition = services.find((item) => item.name === service.name);
            if (definition?.startupStrategy === 'process' || !service.healthUrl) {
                console.log(`  ${status} ${service.displayName.padEnd(12)}`);
            }
            else {
                console.log(`  ${status} ${service.displayName.padEnd(12)} ${chalk_1.default.cyan(service.healthUrl)}`);
            }
        }
        logger_1.default.divider();
        logger_1.default.newline();
    }
    // 10. 进入 REPL 或退出
    if (options.skipRepl) {
        logger_1.default.info('skip-repl 模式，不进入交互界面');
        return { success: true };
    }
    logger_1.default.info('正在进入 REPL 交互模式...');
    logger_1.default.newline();
    // 准备服务状态列表（只显示 go、llm-py、CLI，不显示 MySQL）
    // 通过 API 健康检查逐个检测服务状态
    const replServices = [];
    // 始终包含 CLI
    replServices.push({ name: 'cli', displayName: 'CLI', running: true, port: 0 });
    // 通过 API 健康检查检测 server-go 和 llm-py
    try {
        const { getApiClient } = await Promise.resolve().then(() => __importStar(require('../services/api-client')));
        const apiClient = getApiClient();
        const [healthResult, metricsResult] = await Promise.allSettled([
            apiClient.getHealth(),
            apiClient.getMetrics(),
        ]);
        if (healthResult.status === 'fulfilled') {
            replServices.push({
                name: 'server-go',
                displayName: 'server-go',
                running: true,
                port: config.services.serverGo.port,
            });
        }
        if (metricsResult.status === 'fulfilled') {
            const m = metricsResult.value;
            if (m.services?.llm_py === 'running') {
                replServices.push({
                    name: 'llm-py',
                    displayName: 'llm-py',
                    running: true,
                    port: config.services.llmPy.port,
                });
            }
        }
    }
    catch {
        // 健康检查失败，忽略
    }
    // 进入 REPL
    await (0, repl_1.startRepl)({
        services: replServices,
    });
    return { success: true };
}
//# sourceMappingURL=start.js.map