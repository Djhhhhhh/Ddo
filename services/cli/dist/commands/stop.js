"use strict";
/**
 * ddo stop 命令实现
 * 停止所有 Ddo 服务
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
exports.stopCommand = stopCommand;
const yaml_1 = __importDefault(require("yaml"));
const fs = __importStar(require("fs-extra"));
const logger_1 = __importDefault(require("../utils/logger"));
const paths_1 = require("../utils/paths");
const manager_1 = require("../services/manager");
/**
 * 执行 stop 命令
 */
async function stopCommand(options = {}) {
    logger_1.default.section('停止 Ddo 服务');
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
        logger_1.default.warn('Ddo 尚未初始化，无需停止');
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
        logger_1.default.info('将继续尝试停止服务...');
    }
    // 4. 定义服务列表
    const services = [
        {
            name: 'server-go',
            displayName: 'server-go',
            port: config?.endpoints?.serverGo?.split(':').pop() || 8080,
            healthUrl: `${config?.endpoints?.serverGo || 'http://localhost:8080'}/health`,
            command: [], // stop 不需要 command
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
    // 5. 创建服务管理器
    const manager = (0, manager_1.createServiceManager)({
        pidDir: paths.services,
        logDir: paths.logs,
        dataDir,
    });
    // 6. 停止服务（逆序）
    logger_1.default.section('停止后端服务');
    const stopResult = await manager.stopAll(services);
    if (!stopResult.success) {
        logger_1.default.warn('部分服务停止失败');
        for (const { service, result } of stopResult.results) {
            if (!result.success && result.error) {
                logger_1.default.error(`  ${service}: ${result.error}`);
            }
        }
    }
    // 8. 输出结果
    logger_1.default.newline();
    logger_1.default.divider();
    logger_1.default.success('Ddo 服务已停止');
    logger_1.default.divider();
    return { success: true };
}
//# sourceMappingURL=stop.js.map