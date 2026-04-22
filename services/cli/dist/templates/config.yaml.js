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
exports.generateLLMPyConfigJson = generateLLMPyConfigJson;
exports.generateWebUiConfigJson = generateWebUiConfigJson;
const path = __importStar(require("path"));
const paths_1 = require("../utils/paths");
function buildLocalUrl(host, port) {
    return `http://${host}:${port}`;
}
/**
 * 生成默认配置
 */
function generateDefaultConfig(dataDir) {
    const paths = (0, paths_1.getPaths)(dataDir);
    const serverGoHost = '127.0.0.1';
    const serverGoPort = 50001;
    const llmPyHost = '127.0.0.1';
    const llmPyPort = 50002;
    const webUiHost = '127.0.0.1';
    const webUiPort = 50003;
    const serverGoUrl = buildLocalUrl(serverGoHost, serverGoPort);
    const llmPyUrl = buildLocalUrl(llmPyHost, llmPyPort);
    const webUiUrl = buildLocalUrl(webUiHost, webUiPort);
    return {
        version: '0.2.0',
        dataDir: dataDir,
        database: {
            driver: 'sqlite',
            path: paths.serverGoDb,
        },
        logging: {
            level: 'info',
            maxSize: '10MB',
            maxFiles: 5,
        },
        endpoints: {
            serverGo: serverGoUrl,
            llmPy: llmPyUrl,
            webUi: webUiUrl,
        },
        services: {
            serverGo: {
                host: serverGoHost,
                port: serverGoPort,
                healthPath: '/health',
                url: serverGoUrl,
                configPath: paths.serverGoConfigYaml,
                databasePath: paths.serverGoDb,
            },
            llmPy: {
                host: llmPyHost,
                port: llmPyPort,
                healthPath: '/health',
                url: llmPyUrl,
                configPath: paths.llmPyConfigJson,
                databasePath: paths.llmPyDb,
                ragStorePath: paths.vectorData,
            },
            webUi: {
                host: webUiHost,
                port: webUiPort,
                healthPath: '/__ddo/health',
                url: webUiUrl,
                configPath: paths.webUiConfigJson,
                apiBaseUrl: serverGoUrl,
            },
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

# 服务级配置
services:
  serverGo:
    host: "${config.services.serverGo.host}"
    port: ${config.services.serverGo.port}
    healthPath: "${config.services.serverGo.healthPath}"
    url: "${config.services.serverGo.url}"
    configPath: "${(0, paths_1.prettyPath)(config.services.serverGo.configPath)}"
    databasePath: "${(0, paths_1.prettyPath)(config.services.serverGo.databasePath)}"
  llmPy:
    host: "${config.services.llmPy.host}"
    port: ${config.services.llmPy.port}
    healthPath: "${config.services.llmPy.healthPath}"
    url: "${config.services.llmPy.url}"
    configPath: "${(0, paths_1.prettyPath)(config.services.llmPy.configPath)}"
    databasePath: "${(0, paths_1.prettyPath)(config.services.llmPy.databasePath)}"
    ragStorePath: "${(0, paths_1.prettyPath)(config.services.llmPy.ragStorePath)}"
  webUi:
    host: "${config.services.webUi.host}"
    port: ${config.services.webUi.port}
    healthPath: "${config.services.webUi.healthPath}"
    url: "${config.services.webUi.url}"
    configPath: "${(0, paths_1.prettyPath)(config.services.webUi.configPath)}"
    apiBaseUrl: "${config.services.webUi.apiBaseUrl}"
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
function generateLLMPyConfigJson(config) {
    return JSON.stringify({
        llm_host: config.services.llmPy.host,
        llm_port: config.services.llmPy.port,
        llm_timeout: 30,
        llm_reload: false,
        log_level: config.logging.level.toUpperCase(),
        rag_enabled: true,
        rag_vector_store: 'chroma',
        rag_store_path: config.services.llmPy.ragStorePath,
        rag_embedding_batch_size: 100,
        rag_embedding_dimensions: 1536,
        rag_top_k: 5,
        rag_min_score: 0.5,
        rag_max_context_length: 4000,
        db_path: config.services.llmPy.databasePath,
        db_echo: false,
    }, null, 2);
}
function generateWebUiConfigJson(config) {
    return JSON.stringify({
        host: config.services.webUi.host,
        port: config.services.webUi.port,
        apiBaseUrl: config.services.webUi.apiBaseUrl,
        healthPath: config.services.webUi.healthPath,
    }, null, 2);
}
//# sourceMappingURL=config.yaml.js.map