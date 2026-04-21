"use strict";
/**
 * 配置文件模板
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
exports.generateDefaultConfig = generateDefaultConfig;
exports.generateConfigYaml = generateConfigYaml;
exports.generateServerGoConfigYaml = generateServerGoConfigYaml;
const path = __importStar(require("path"));
const paths_1 = require("../utils/paths");
/**
 * 生成默认配置
 */
function generateDefaultConfig(dataDir) {
    return {
        version: '0.1.0',
        dataDir: dataDir,
        database: {
            driver: 'sqlite',
            path: `${dataDir}/data/go/server-go.db`,
        },
        logging: {
            level: 'info',
            maxSize: '10MB',
            maxFiles: 5,
        },
        endpoints: {
            serverGo: 'http://localhost:8080',
            llmPy: 'http://localhost:8000',
            webUi: 'http://localhost:3000',
        },
    };
}
/**
 * 生成配置文件 YAML 内容
 */
function generateConfigYaml(config) {
    return `# Ddo CLI 配置文件
# 生成时间: ${new Date().toISOString()}
# 版本: ${config.version}

version: "${config.version}"

# 数据目录路径（建议在环境变量或命令行参数中设置）
dataDir: "${(0, paths_1.prettyPath)(config.dataDir)}"

# 数据库配置
database:
  driver: "${config.database.driver}"
  path: "${(0, paths_1.prettyPath)(config.database.path)}"

# 日志配置
logging:
  level: "${config.logging.level}"  # debug, info, warn, error
  maxSize: "${config.logging.maxSize}"     # 单个日志文件最大大小
  maxFiles: ${config.logging.maxFiles}          # 保留日志文件数量

# 服务端点配置（用于服务间通信）
endpoints:
  serverGo: "${config.endpoints.serverGo}"   # server-go 服务地址
  llmPy: "${config.endpoints.llmPy}"         # llm-py 服务地址
  webUi: "${config.endpoints.webUi}"         # web-ui 服务地址
`;
}
/**
 * 生成 server-go 专用配置文件内容
 * server-go 使用不同的配置结构
 */
function generateServerGoConfigYaml(dataDir, serverPort, llmPyUrl) {
    const dbPath = path.join(dataDir, 'data', 'go', 'server-go.db');
    return `# server-go 配置文件
# 生成时间: ${new Date().toISOString()}

# 服务器配置
server:
  host: "127.0.0.1"
  port: ${serverPort}
  mode: "release"

# 数据库配置 (SQLite)
database:
  path: "${(0, paths_1.prettyPath)(dbPath)}"
  host: ""
  port: 0
  user: ""
  password: ""
  dbname: ""
  charset: ""

# 日志配置
log:
  level: "info"
  format: "json"
  output: "stdout"

# LLM-Py 服务地址
llm_py_url: "${llmPyUrl}"
`;
}
//# sourceMappingURL=config.yaml.js.map