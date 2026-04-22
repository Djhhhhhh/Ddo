/**
 * ddo init 命令实现
 * 初始化 Ddo 工作空间
 */

import * as fs from 'fs-extra';
import type { InitResult, DdoConfig } from '../types';
import { resolveDataDir, getPaths, prettyPath } from '../utils/paths';
import { loadDdoConfig, normalizeDdoConfig } from '../utils/config';
import logger from '../utils/logger';
import {
  generateDefaultConfig,
  generateConfigYaml,
  generateLLMPyConfigJson,
  generateServerGoConfigYaml,
  generateWebUiConfigJson,
} from '../templates/config.yaml';
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

  // 3. 创建目录结构
  logger.section('创建目录结构');
  const paths = getPaths(dataDir);
  const dirsToCreate = [
    paths.root,
    paths.docker,
    paths.services,
    paths.database,
    paths.goData,
    paths.llmData,
    paths.vectorData,
    paths.serverGoConfig,
    paths.llmPyConfig,
    paths.webUiConfig,
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
    config = await loadDdoConfig(dataDir);
  } else {
    config = normalizeDdoConfig(generateDefaultConfig(dataDir), dataDir);
    await fs.writeFile(paths.config, generateConfigYaml(config), 'utf8');
    logger.success(`生成配置: ${prettyPath(paths.config)}`);
    actions.push('generate_config');
  }

  if (composeExists && !options.force) {
    logger.info('发现已有 Docker Compose 配置，将保留现有配置');
  } else if (!options.skipDocker) {
    await fs.writeFile(paths.dockerCompose, generateDockerCompose(config), 'utf8');
    logger.success(`生成配置: ${prettyPath(paths.dockerCompose)}`);
    actions.push('generate_docker_compose');
  }

  // 5. 生成 server-go 专用配置
  logger.section('生成 server-go 配置');
  const serverGoConfigExists = await fs.pathExists(paths.serverGoConfigYaml);
  if (serverGoConfigExists && !options.force) {
    logger.info('发现已有 server-go 配置，将保留现有配置');
  } else {
    const serverPort = config.services.serverGo.port;
    await fs.writeFile(
      paths.serverGoConfigYaml,
      generateServerGoConfigYaml(dataDir, serverPort, config.endpoints.llmPy),
      'utf8'
    );
    logger.success(`生成配置: ${prettyPath(paths.serverGoConfigYaml)}`);
    actions.push('generate_server_go_config');
  }

  logger.section('生成 llm-py 配置');
  const llmPyConfigExists = await fs.pathExists(paths.llmPyConfigJson);
  if (llmPyConfigExists && !options.force) {
    logger.info('发现已有 llm-py 配置，将保留现有配置');
  } else {
    await fs.writeFile(paths.llmPyConfigJson, generateLLMPyConfigJson(config), 'utf8');
    logger.success(`生成配置: ${prettyPath(paths.llmPyConfigJson)}`);
    actions.push('generate_llm_py_config');
  }

  logger.section('生成 web-ui 配置');
  const webUiConfigExists = await fs.pathExists(paths.webUiConfigJson);
  if (webUiConfigExists && !options.force) {
    logger.info('发现已有 web-ui 配置，将保留现有配置');
  } else {
    await fs.writeFile(paths.webUiConfigJson, generateWebUiConfigJson(config), 'utf8');
    logger.success(`生成配置: ${prettyPath(paths.webUiConfigJson)}`);
    actions.push('generate_web_ui_config');
  }

  // 7. 输出完成信息
  logger.newline();
  logger.divider();
  logger.success('Ddo 初始化完成！');
  logger.divider();
  logger.newline();

  logger.info('目录结构:');
  logger.info(`  数据目录: ${logger.path(prettyPath(paths.root))}`);
  logger.info(`  CLI 配置: ${logger.path(prettyPath(paths.config))}`);
  logger.info(`  server-go 配置: ${logger.path(prettyPath(paths.serverGoConfigYaml))}`);
  logger.info(`  llm-py 配置: ${logger.path(prettyPath(paths.llmPyConfigJson))}`);
  logger.info(`  web-ui 配置: ${logger.path(prettyPath(paths.webUiConfigJson))}`);
  logger.info(`  SQLite 数据库: ${logger.path(prettyPath(paths.serverGoDb))}`);
  logger.newline();

  if (!options.skipDocker) {
    logger.info(`兼容文件: ${logger.path(prettyPath(paths.dockerCompose))}`);
    logger.newline();
  }

  logger.info('下一步:');
  logger.info(`  运行 ${logger.command('ddo start')} 启动所有服务`);
  logger.info(`  运行 ${logger.command('ddo status')} 查看服务状态`);

  return {
    success: true,
    dataDir,
    actions,
  };
}
