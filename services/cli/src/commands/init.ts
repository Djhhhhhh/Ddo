/**
 * ddo init 命令实现
 * 初始化 Ddo 工作空间
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type { InitResult, DdoConfig } from '../types';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import logger from '../utils/logger';
import {
  checkDocker,
  checkDockerCompose,
  getContainerStatus,
  MYSQL_CONTAINER_NAME,
  startMySQL,
  waitForHealthy,
  verifyDataMount,
} from '../utils/docker';
import { generateDefaultConfig, generateConfigYaml } from '../templates/config.yaml';
import { generateDockerCompose } from '../templates/docker-compose.yml';

interface InitOptions {
  dataDir?: string;
  skipDocker?: boolean;
  force?: boolean;
}

/**
 * 执行 init 命令
 */
export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const actions: string[] = [];

  logger.section('Ddo 初始化');
  logger.newline();

  // 1. 解析数据目录
  const dataDir = resolveDataDir({
    dataDir: options.dataDir,
    envDataDir: process.env.DDO_DATA_DIR,
  });

  logger.info(`数据目录: ${logger.path(prettyPath(dataDir))}`);

  // 2. 检查 Docker 环境（除非跳过）
  if (!options.skipDocker) {
    const dockerCheck = await checkDocker();
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

    if (!checkDockerCompose()) {
      return {
        success: false,
        dataDir,
        actions,
        error: 'Docker Compose 未安装。请确保 Docker Desktop 已正确安装。',
      };
    }

    logger.success('Docker 环境检查通过');
    actions.push('docker_check');
  }

  // 3. 创建目录结构
  logger.section('创建目录结构');
  const paths = getPaths(dataDir);
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
    logger.success(`创建目录: ${prettyPath(dir)}`);
  }
  actions.push('create_dirs');

  // 4. 生成配置文件
  logger.section('生成配置文件');

  // 检查是否已存在配置（处理重复初始化）
  const configExists = await fs.pathExists(paths.config);
  const composeExists = await fs.pathExists(paths.dockerCompose);

  let config: DdoConfig;

  if (configExists && !options.force) {
    logger.info('发现已有配置文件，将保留现有配置');
    // 这里可以添加读取现有配置的逻辑
    config = generateDefaultConfig(dataDir);
  } else {
    config = generateDefaultConfig(dataDir);
    await fs.writeFile(paths.config, generateConfigYaml(config), 'utf8');
    logger.success(`生成配置: ${prettyPath(paths.config)}`);
    actions.push('generate_config');
  }

  if (composeExists && !options.force) {
    logger.info('发现已有 Docker Compose 配置，将保留现有配置');
  } else {
    await fs.writeFile(paths.dockerCompose, generateDockerCompose(config), 'utf8');
    logger.success(`生成配置: ${prettyPath(paths.dockerCompose)}`);
    actions.push('generate_docker_compose');
  }

  // 5. 启动 MySQL 容器（除非跳过）
  if (!options.skipDocker) {
    logger.section('启动 MySQL 服务');

    // 检查容器状态
    const containerStatus = await getContainerStatus(MYSQL_CONTAINER_NAME);

    if (containerStatus.running) {
      logger.success(`MySQL 容器已在运行 (ID: ${containerStatus.id})`);
      actions.push('mysql_already_running');
    } else {
      // 启动容器
      const startResult = await startMySQL(paths.dockerCompose);
      if (!startResult.success) {
        return {
          success: false,
          dataDir,
          actions,
          error: `启动 MySQL 容器失败: ${startResult.message}`,
        };
      }
      logger.success('MySQL 容器已启动');
      actions.push('start_mysql');

      // 等待健康检查
      const healthy = await waitForHealthy(MYSQL_CONTAINER_NAME, 60000);
      if (!healthy) {
        logger.warn('MySQL 健康检查超时，但容器可能仍在启动中');
      } else {
        logger.success('MySQL 服务已就绪');
        actions.push('mysql_healthy');
      }
    }

    // 6. 验证数据持久化
    logger.section('验证数据持久化');
    const mountOk = await verifyDataMount(dataDir);
    if (mountOk) {
      logger.success('数据目录挂载正常');
      actions.push('verify_mount');
    } else {
      logger.warn('数据挂载验证可能有问题，请手动检查');
    }
  }

  // 7. 输出完成信息
  logger.newline();
  logger.divider();
  logger.success('Ddo 初始化完成！');
  logger.divider();
  logger.newline();

  logger.info('目录结构:');
  logger.info(`  数据目录: ${logger.path(prettyPath(paths.root))}`);
  logger.info(`  配置文件: ${logger.path(prettyPath(paths.config))}`);
  logger.info(`  MySQL 数据: ${logger.path(prettyPath(paths.mysqlData))}`);
  logger.newline();

  if (!options.skipDocker) {
    logger.info('服务状态:');
    const status = await getContainerStatus(MYSQL_CONTAINER_NAME);
    logger.info(`  MySQL: ${status.running ? chalk.green('运行中') : chalk.red('未运行')}`);
    if (status.id) {
      logger.info(`  容器ID: ${status.id}`);
    }
    logger.newline();

    logger.info('下一步:');
    logger.info(`  运行 ${logger.command('ddo start')} 启动所有服务`);
    logger.info(`  运行 ${logger.command('ddo status')} 查看服务状态`);
  }

  return {
    success: true,
    dataDir,
    actions,
  };
}

// 导入 chalk 用于输出
import chalk from 'chalk';
