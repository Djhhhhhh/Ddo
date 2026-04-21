"use strict";
/**
 * ddo status 命令实现
 * 显示所有服务的状态
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
exports.statusCommand = statusCommand;
const yaml_1 = __importDefault(require("yaml"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../utils/logger"));
const paths_1 = require("../utils/paths");
const manager_1 = require("../services/manager");
const pid_file_1 = require("../services/pid-file");
const pid_file_2 = require("../services/pid-file");
const health_check_1 = require("../services/health-check");
/**
 * 执行 status 命令
 */
async function statusCommand(options = {}) {
    logger_1.default.section('Ddo 服务状态');
    logger_1.default.newline();
    // 1. 解析数据目录
    const dataDir = (0, paths_1.resolveDataDir)({
        dataDir: options.dataDir,
        envDataDir: process.env.DDO_DATA_DIR,
    });
    logger_1.default.info(`数据目录: ${logger_1.default.path((0, paths_1.prettyPath)(dataDir))}`);
    logger_1.default.newline();
    // 2. 检查初始化状态
    const paths = (0, paths_1.getPaths)(dataDir);
    if (!(await fs.pathExists(paths.config))) {
        logger_1.default.warn('Ddo 尚未初始化');
        logger_1.default.info('请运行: ddo init');
        return { success: true };
    }
    // 3. 读取配置
    let config;
    try {
        const configContent = await fs.readFile(paths.config, 'utf8');
        config = yaml_1.default.parse(configContent);
    }
    catch (err) {
        logger_1.default.warn(`读取配置文件失败: ${err instanceof Error ? err.message : String(err)}`);
    }
    // 4. 显示数据库状态
    logger_1.default.divider();
    console.log(chalk_1.default.bold.cyan('数据库服务'));
    logger_1.default.divider();
    const databasePath = config?.database?.path || paths.serverGoDb;
    const databaseExists = await fs.pathExists(databasePath);
    const databaseState = databaseExists
        ? chalk_1.default.green('✓ 就绪')
        : chalk_1.default.yellow('○ 未创建');
    console.log(`${databaseState} SQLite`);
    if (config?.database) {
        console.log(`  驱动: ${chalk_1.default.gray(config.database.driver || 'sqlite')}`);
    }
    console.log(`  路径: ${chalk_1.default.gray((0, paths_1.prettyPath)(databasePath))}`);
    // 5. 显示后端服务状态
    logger_1.default.newline();
    logger_1.default.divider();
    console.log(chalk_1.default.bold.cyan('后端服务'));
    logger_1.default.divider();
    const services = [
        {
            name: 'server-go',
            displayName: 'server-go',
            port: config?.endpoints?.serverGo?.split(':').pop() || 8080,
            healthUrl: `${config?.endpoints?.serverGo || 'http://localhost:8080'}/health`,
            command: [],
        },
        {
            name: 'llm-py',
            displayName: 'llm-py',
            port: config?.endpoints?.llmPy?.split(':').pop() || 8000,
            healthUrl: `${config?.endpoints?.llmPy || 'http://localhost:8000'}/health`,
            command: [],
        },
        {
            name: 'web-ui',
            displayName: 'web-ui',
            port: config?.endpoints?.webUi?.split(':').pop() || 3000,
            healthUrl: `${config?.endpoints?.webUi || 'http://localhost:3000'}/health`,
            command: [],
        },
    ];
    const manager = (0, manager_1.createServiceManager)({
        pidDir: paths.services,
        logDir: paths.logs,
        dataDir,
    });
    for (const service of services) {
        const status = manager.getStatus(service);
        if (status.running) {
            // 检查健康状态
            const healthResult = await (0, health_check_1.checkHealth)(service.healthUrl, 2000);
            const healthStatus = healthResult.healthy
                ? chalk_1.default.green('✓ 健康')
                : chalk_1.default.yellow('? 未就绪');
            console.log(`${healthStatus} ${service.displayName}`);
            console.log(`  PID: ${chalk_1.default.gray(status.pid)}`);
            console.log(`  端口: ${chalk_1.default.gray(status.port)}`);
            console.log(`  地址: ${chalk_1.default.gray(service.healthUrl.replace('/health', ''))}`);
        }
        else {
            console.log(`${chalk_1.default.red('✗ 已停止')} ${service.displayName}`);
            console.log(`  端口: ${chalk_1.default.gray(status.port)}`);
        }
    }
    // 6. 显示 PID 目录信息
    logger_1.default.newline();
    logger_1.default.divider();
    console.log(chalk_1.default.bold.cyan('进程管理'));
    logger_1.default.divider();
    const hasPidFiles = await fs.pathExists(paths.services);
    if (hasPidFiles) {
        const pidFiles = (await fs.readdir(paths.services)).filter((f) => f.endsWith('.pid'));
        if (pidFiles.length > 0) {
            console.log(`PID 文件目录: ${chalk_1.default.gray((0, paths_1.prettyPath)(paths.services))}`);
            for (const file of pidFiles) {
                const serviceName = file.replace('.pid', '');
                const pid = (0, pid_file_1.readPid)(paths.services, serviceName);
                const running = pid !== null && (0, pid_file_2.isProcessRunning)(pid);
                const icon = running ? chalk_1.default.green('●') : chalk_1.default.gray('○');
                console.log(`  ${icon} ${file}: ${pid} ${running ? '' : chalk_1.default.gray('(进程不存在)')}`);
            }
        }
        else {
            console.log('无 PID 文件');
        }
    }
    else {
        console.log('服务目录未创建');
    }
    // 7. 总结
    logger_1.default.newline();
    logger_1.default.divider();
    const runningCount = services.filter((s) => manager.getStatus(s).running).length;
    const databaseReady = databaseExists ? 1 : 0;
    const totalServices = services.length + 1;
    const summaryColor = runningCount + databaseReady === totalServices
        ? chalk_1.default.green
        : runningCount + databaseReady > 0
            ? chalk_1.default.yellow
            : chalk_1.default.red;
    console.log(`${summaryColor(`${runningCount + databaseReady}/${totalServices}`)} 服务运行中`);
    logger_1.default.divider();
    return { success: true };
}
//# sourceMappingURL=status.js.map