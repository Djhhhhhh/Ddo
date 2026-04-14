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
const docker_1 = require("../utils/docker");
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
    // 2. 检查 Docker 环境（除非跳过）
    if (!options.skipDocker) {
        const dockerCheck = await (0, docker_1.checkDocker)();
        if (!dockerCheck.installed) {
            return {
                success: false,
                dataDir,
                actions,
                error: 'Docker 未安装。请访问 https://docs.docker.com/get-docker/ 安装 Docker Desktop。',
            };
        }
        if (!dockerCheck.running) {
            return {
                success: false,
                dataDir,
                actions,
                error: 'Docker 未运行。请先启动 Docker Desktop。',
            };
        }
        if (!(0, docker_1.checkDockerCompose)()) {
            return {
                success: false,
                dataDir,
                actions,
                error: 'Docker Compose 未安装。请确保 Docker Desktop 已正确安装。',
            };
        }
        logger_1.default.success('Docker 环境检查通过');
        actions.push('docker_check');
    }
    // 3. 创建目录结构
    logger_1.default.section('创建目录结构');
    const paths = (0, paths_1.getPaths)(dataDir);
    const dirsToCreate = [
        paths.root,
        paths.docker,
        paths.services,
        paths.mysqlData,
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
    else {
        await fs.writeFile(paths.dockerCompose, (0, docker_compose_yml_1.generateDockerCompose)(config), 'utf8');
        logger_1.default.success(`生成配置: ${(0, paths_1.prettyPath)(paths.dockerCompose)}`);
        actions.push('generate_docker_compose');
    }
    // 5. 启动 MySQL 容器（除非跳过）
    if (!options.skipDocker) {
        logger_1.default.section('启动 MySQL 服务');
        // 检查容器状态
        const containerStatus = await (0, docker_1.getContainerStatus)(docker_1.MYSQL_CONTAINER_NAME);
        if (containerStatus.running) {
            logger_1.default.success(`MySQL 容器已在运行 (ID: ${containerStatus.id})`);
            actions.push('mysql_already_running');
        }
        else {
            // 启动容器
            const startResult = await (0, docker_1.startMySQL)(paths.dockerCompose);
            if (!startResult.success) {
                return {
                    success: false,
                    dataDir,
                    actions,
                    error: `启动 MySQL 容器失败: ${startResult.message}`,
                };
            }
            logger_1.default.success('MySQL 容器已启动');
            actions.push('start_mysql');
            // 等待健康检查
            const healthy = await (0, docker_1.waitForHealthy)(docker_1.MYSQL_CONTAINER_NAME, 60000);
            if (!healthy) {
                logger_1.default.warn('MySQL 健康检查超时，但容器可能仍在启动中');
            }
            else {
                logger_1.default.success('MySQL 服务已就绪');
                actions.push('mysql_healthy');
            }
        }
        // 6. 验证数据持久化
        logger_1.default.section('验证数据持久化');
        const mountOk = await (0, docker_1.verifyDataMount)(dataDir);
        if (mountOk) {
            logger_1.default.success('数据目录挂载正常');
            actions.push('verify_mount');
        }
        else {
            logger_1.default.warn('数据挂载验证可能有问题，请手动检查');
        }
    }
    // 7. 输出完成信息
    logger_1.default.newline();
    logger_1.default.divider();
    logger_1.default.success('Ddo 初始化完成！');
    logger_1.default.divider();
    logger_1.default.newline();
    logger_1.default.info('目录结构:');
    logger_1.default.info(`  数据目录: ${logger_1.default.path((0, paths_1.prettyPath)(paths.root))}`);
    logger_1.default.info(`  配置文件: ${logger_1.default.path((0, paths_1.prettyPath)(paths.config))}`);
    logger_1.default.info(`  MySQL 数据: ${logger_1.default.path((0, paths_1.prettyPath)(paths.mysqlData))}`);
    logger_1.default.newline();
    if (!options.skipDocker) {
        logger_1.default.info('服务状态:');
        const status = await (0, docker_1.getContainerStatus)(docker_1.MYSQL_CONTAINER_NAME);
        logger_1.default.info(`  MySQL: ${status.running ? chalk_1.default.green('运行中') : chalk_1.default.red('未运行')}`);
        if (status.id) {
            logger_1.default.info(`  容器ID: ${status.id}`);
        }
        logger_1.default.newline();
        logger_1.default.info('下一步:');
        logger_1.default.info(`  运行 ${logger_1.default.command('ddo start')} 启动所有服务`);
        logger_1.default.info(`  运行 ${logger_1.default.command('ddo status')} 查看服务状态`);
    }
    return {
        success: true,
        dataDir,
        actions,
    };
}
// 导入 chalk 用于输出
const chalk_1 = __importDefault(require("chalk"));
//# sourceMappingURL=init.js.map