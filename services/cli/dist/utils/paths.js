"use strict";
/**
 * 路径解析工具
 * 处理数据目录路径的各种场景
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
exports.resolveDataDir = resolveDataDir;
exports.getDefaultDataDir = getDefaultDataDir;
exports.getPaths = getPaths;
exports.normalizePath = normalizePath;
exports.prettyPath = prettyPath;
exports.isSafePath = isSafePath;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
/** 默认数据目录名称 */
const DEFAULT_DIR_NAME = '.ddo';
/**
 * 解析数据目录路径
 * 优先级：环境变量 > CLI 参数 > 默认路径
 */
function resolveDataDir(options = {}) {
    // 优先级 1: 环境变量 DDO_DATA_DIR
    if (options.envDataDir) {
        return path.resolve(options.envDataDir);
    }
    // 优先级 2: CLI 参数 --data-dir
    if (options.dataDir) {
        return path.resolve(options.dataDir);
    }
    // 优先级 3: 默认路径
    return getDefaultDataDir();
}
/**
 * 获取默认数据目录路径
 * Windows: %USERPROFILE%\.ddo
 * macOS/Linux: ~/.ddo
 */
function getDefaultDataDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, DEFAULT_DIR_NAME);
}
/**
 * 获取 CLI 需要使用的所有路径
 */
function getPaths(dataDir) {
    return {
        // 根目录
        root: dataDir,
        // 配置文件
        config: path.join(dataDir, 'config.yaml'),
        // Docker 配置目录
        docker: path.join(dataDir, 'docker'),
        dockerCompose: path.join(dataDir, 'docker', 'docker-compose.yml'),
        // 服务 PID 文件目录
        services: path.join(dataDir, 'services'),
        // 数据库目录
        database: path.join(dataDir, 'data'),
        // server-go 配置目录
        serverGoConfig: path.join(dataDir, 'server-go'),
        // server-go 配置文件
        serverGoConfigYaml: path.join(dataDir, 'server-go', 'config.yaml'),
        // server-go 数据目录
        goData: path.join(dataDir, 'data', 'go'),
        // server-go SQLite 数据库文件
        serverGoDb: path.join(dataDir, 'data', 'go', 'server-go.db'),
        // MySQL 数据目录
        mysqlData: path.join(dataDir, 'data', 'mysql'),
        // 缓存目录
        cache: path.join(dataDir, 'cache'),
        // 日志目录
        logs: path.join(dataDir, 'logs'),
        // 备份目录
        backup: path.join(dataDir, 'backup'),
    };
}
/**
 * 规范化路径（统一使用正斜杠，便于显示）
 */
function normalizePath(p) {
    return p.replace(/\\/g, '/');
}
/**
 * 将绝对路径转换为相对路径（用于显示）
 * 如果是 home 目录下的路径，显示为 ~/xxx
 */
function prettyPath(p) {
    const homeDir = os.homedir();
    if (p.startsWith(homeDir)) {
        return '~' + p.substring(homeDir.length).replace(/\\/g, '/');
    }
    return normalizePath(p);
}
/**
 * 验证路径是否安全（防止目录遍历攻击）
 */
function isSafePath(targetPath, basePath) {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(basePath);
    return resolvedTarget.startsWith(resolvedBase);
}
//# sourceMappingURL=paths.js.map