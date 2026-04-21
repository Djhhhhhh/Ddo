"use strict";
/**
 * ddo init 命令实现
 * 初始化 Ddo 工作空间
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
exports.initCommand = initCommand;
const fs = __importStar(require("fs-extra"));
const paths_1 = require("../utils/paths");
const logger_1 = __importDefault(require("../utils/logger"));
const config_yaml_1 = require("../templates/config.yaml");
const docker_compose_yml_1 = require("../templates/docker-compose.yml");
/**
 * 执行 init 命令
 */
async function initCommand(options = {}) {
    const actions = [];
    logger_1.default.section('Ddo 初始化');
    logger_1.default.newline();
    // 1. 解析数据目录
    const dataDir = (0, paths_1.resolveDataDir)({
        dataDir: options.dataDir,
        envDataDir: process.env.DDO_DATA_DIR,
    });
    logger_1.default.info(`数据目录: ${logger_1.default.path((0, paths_1.prettyPath)(dataDir))}`);
    // 3. 创建目录结构
    logger_1.default.section('创建目录结构');
    const paths = (0, paths_1.getPaths)(dataDir);
    const dirsToCreate = [
        paths.root,
        paths.docker,
        paths.services,
        paths.database,
        paths.goData,
        paths.serverGoConfig,
        paths.cache,
        paths.logs,
        paths.backup,
    ];
    for (const dir of dirsToCreate) {
        await fs.ensureDir(dir);
        logger_1.default.success(`创建目录: ${(0, paths_1.prettyPath)(dir)}`);
    }
    actions.push('create_dirs');
    // 4. 生成配置文件
    logger_1.default.section('生成配置文件');
    // 检查是否已存在配置（处理重复初始化）
    const configExists = await fs.pathExists(paths.config);
    const composeExists = await fs.pathExists(paths.dockerCompose);
    let config;
    if (configExists && !options.force) {
        logger_1.default.info('发现已有配置文件，将保留现有配置');
        // 这里可以添加读取现有配置的逻辑
        config = (0, config_yaml_1.generateDefaultConfig)(dataDir);
    }
    else {
        config = (0, config_yaml_1.generateDefaultConfig)(dataDir);
        await fs.writeFile(paths.config, (0, config_yaml_1.generateConfigYaml)(config), 'utf8');
        logger_1.default.success(`生成配置: ${(0, paths_1.prettyPath)(paths.config)}`);
        actions.push('generate_config');
    }
    if (composeExists && !options.force) {
        logger_1.default.info('发现已有 Docker Compose 配置，将保留现有配置');
    }
    else if (!options.skipDocker) {
        await fs.writeFile(paths.dockerCompose, (0, docker_compose_yml_1.generateDockerCompose)(config), 'utf8');
        logger_1.default.success(`生成配置: ${(0, paths_1.prettyPath)(paths.dockerCompose)}`);
        actions.push('generate_docker_compose');
    }
    // 5. 生成 server-go 专用配置
    logger_1.default.section('生成 server-go 配置');
    const serverGoConfigExists = await fs.pathExists(paths.serverGoConfigYaml);
    if (serverGoConfigExists && !options.force) {
        logger_1.default.info('发现已有 server-go 配置，将保留现有配置');
    }
    else {
        const serverPort = parseInt(config.endpoints.serverGo.split(':').pop() || '8080', 10);
        await fs.writeFile(paths.serverGoConfigYaml, (0, config_yaml_1.generateServerGoConfigYaml)(dataDir, serverPort, config.endpoints.llmPy), 'utf8');
        logger_1.default.success(`生成配置: ${(0, paths_1.prettyPath)(paths.serverGoConfigYaml)}`);
        actions.push('generate_server_go_config');
    }
    // 7. 输出完成信息
    logger_1.default.newline();
    logger_1.default.divider();
    logger_1.default.success('Ddo 初始化完成！');
    logger_1.default.divider();
    logger_1.default.newline();
    logger_1.default.info('目录结构:');
    logger_1.default.info(`  数据目录: ${logger_1.default.path((0, paths_1.prettyPath)(paths.root))}`);
    logger_1.default.info(`  CLI 配置: ${logger_1.default.path((0, paths_1.prettyPath)(paths.config))}`);
    logger_1.default.info(`  server-go 配置: ${logger_1.default.path((0, paths_1.prettyPath)(paths.serverGoConfigYaml))}`);
    logger_1.default.info(`  SQLite 数据库: ${logger_1.default.path((0, paths_1.prettyPath)(paths.serverGoDb))}`);
    logger_1.default.newline();
    if (!options.skipDocker) {
        logger_1.default.info(`兼容文件: ${logger_1.default.path((0, paths_1.prettyPath)(paths.dockerCompose))}`);
        logger_1.default.newline();
    }
    logger_1.default.info('下一步:');
    logger_1.default.info(`  运行 ${logger_1.default.command('ddo start')} 启动所有服务`);
    logger_1.default.info(`  运行 ${logger_1.default.command('ddo status')} 查看服务状态`);
    return {
        success: true,
        dataDir,
        actions,
    };
}
//# sourceMappingURL=init.js.map