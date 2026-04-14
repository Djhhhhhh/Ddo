"use strict";
/**
 * 配置文件模板
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDefaultConfig = generateDefaultConfig;
exports.generateConfigYaml = generateConfigYaml;
const paths_1 = require("../utils/paths");
/**
 * 生成默认配置
 */
function generateDefaultConfig(dataDir) {
    return {
        version: '0.1.0',
        dataDir: dataDir,
        database: {
            host: 'localhost',
            port: 3306,
            name: 'ddo',
            user: 'ddo',
            password: 'ddo_password',
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
  host: "${config.database.host}"
  port: ${config.database.port}
  name: "${config.database.name}"
  user: "${config.database.user}"
  # 密码存储在环境变量更安全: DDO_DB_PASSWORD
  password: "${config.database.password}"

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
//# sourceMappingURL=config.yaml.js.map