import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import yaml from 'yaml';
import { generateDefaultConfig } from '../templates/config.yaml';
import type { DdoConfig } from '../types';
import { getPaths } from './paths';

function buildLocalUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

function expandHomePath(input: string): string {
  if (input === '~') {
    return os.homedir();
  }

  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

function normalizePathValue(input: string | undefined, fallback: string): string {
  if (!input || typeof input !== 'string') {
    return fallback;
  }

  return path.resolve(expandHomePath(input));
}

function extractPort(url: string | undefined, fallback: number): number {
  if (!url) {
    return fallback;
  }

  try {
    const parsed = new URL(url);
    if (parsed.port) {
      return parseInt(parsed.port, 10);
    }
  } catch {
  }

  return fallback;
}

function extractHost(url: string | undefined, fallback: string): string {
  if (!url) {
    return fallback;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname || fallback;
  } catch {
    return fallback;
  }
}

function ensureConfigShape(rawConfig: Partial<DdoConfig> | null | undefined, dataDir: string): DdoConfig {
  const defaultConfig = generateDefaultConfig(dataDir);
  const rootDataDir = normalizePathValue(rawConfig?.dataDir, dataDir);
  const paths = getPaths(rootDataDir);

  const serverGoHost = rawConfig?.services?.serverGo?.host
    ?? extractHost(rawConfig?.endpoints?.serverGo, defaultConfig.services.serverGo.host);
  const serverGoPort = rawConfig?.services?.serverGo?.port
    ?? extractPort(rawConfig?.endpoints?.serverGo, defaultConfig.services.serverGo.port);
  const llmPyHost = rawConfig?.services?.llmPy?.host
    ?? extractHost(rawConfig?.endpoints?.llmPy, defaultConfig.services.llmPy.host);
  const llmPyPort = rawConfig?.services?.llmPy?.port
    ?? extractPort(rawConfig?.endpoints?.llmPy, defaultConfig.services.llmPy.port);
  const webUiHost = rawConfig?.services?.webUi?.host
    ?? extractHost(rawConfig?.endpoints?.webUi, defaultConfig.services.webUi.host);
  const webUiPort = rawConfig?.services?.webUi?.port
    ?? extractPort(rawConfig?.endpoints?.webUi, defaultConfig.services.webUi.port);

  const serverGoUrl = rawConfig?.services?.serverGo?.url
    ?? rawConfig?.endpoints?.serverGo
    ?? buildLocalUrl(serverGoHost, serverGoPort);
  const llmPyUrl = rawConfig?.services?.llmPy?.url
    ?? rawConfig?.endpoints?.llmPy
    ?? buildLocalUrl(llmPyHost, llmPyPort);
  const webUiUrl = rawConfig?.services?.webUi?.url
    ?? rawConfig?.endpoints?.webUi
    ?? buildLocalUrl(webUiHost, webUiPort);

  const databasePath = normalizePathValue(rawConfig?.database?.path, paths.serverGoDb);
  const serverGoConfigPath = normalizePathValue(rawConfig?.services?.serverGo?.configPath, paths.serverGoConfigYaml);
  const llmPyConfigPath = normalizePathValue(rawConfig?.services?.llmPy?.configPath, paths.llmPyConfigJson);
  const webUiConfigPath = normalizePathValue(rawConfig?.services?.webUi?.configPath, paths.webUiConfigJson);
  const llmPyDatabasePath = normalizePathValue(rawConfig?.services?.llmPy?.databasePath, paths.llmPyDb);
  const llmPyRagStorePath = normalizePathValue(rawConfig?.services?.llmPy?.ragStorePath, paths.vectorData);
  const webUiApiBaseUrl = rawConfig?.services?.webUi?.apiBaseUrl
    ?? rawConfig?.endpoints?.serverGo
    ?? serverGoUrl;

  return {
    version: rawConfig?.version || defaultConfig.version,
    dataDir: rootDataDir,
    database: {
      driver: 'sqlite',
      path: databasePath,
    },
    logging: {
      level: rawConfig?.logging?.level || defaultConfig.logging.level,
      maxSize: rawConfig?.logging?.maxSize || defaultConfig.logging.maxSize,
      maxFiles: rawConfig?.logging?.maxFiles || defaultConfig.logging.maxFiles,
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
        healthPath: rawConfig?.services?.serverGo?.healthPath || defaultConfig.services.serverGo.healthPath,
        url: serverGoUrl,
        configPath: serverGoConfigPath,
        databasePath,
      },
      llmPy: {
        host: llmPyHost,
        port: llmPyPort,
        healthPath: rawConfig?.services?.llmPy?.healthPath || defaultConfig.services.llmPy.healthPath,
        url: llmPyUrl,
        configPath: llmPyConfigPath,
        databasePath: llmPyDatabasePath,
        ragStorePath: llmPyRagStorePath,
      },
      webUi: {
        host: webUiHost,
        port: webUiPort,
        healthPath: rawConfig?.services?.webUi?.healthPath || defaultConfig.services.webUi.healthPath,
        url: webUiUrl,
        configPath: webUiConfigPath,
        apiBaseUrl: webUiApiBaseUrl,
      },
    },
  };
}

export async function loadDdoConfig(dataDir: string): Promise<DdoConfig> {
  const paths = getPaths(dataDir);

  if (!(await fs.pathExists(paths.config))) {
    return generateDefaultConfig(dataDir);
  }

  const configContent = await fs.readFile(paths.config, 'utf8');
  const parsed = yaml.parse(configContent) as Partial<DdoConfig>;
  return ensureConfigShape(parsed, dataDir);
}

export function loadDdoConfigSync(dataDir: string): DdoConfig {
  const paths = getPaths(dataDir);

  if (!fs.existsSync(paths.config)) {
    return generateDefaultConfig(dataDir);
  }

  const configContent = fs.readFileSync(paths.config, 'utf8');
  const parsed = yaml.parse(configContent) as Partial<DdoConfig>;
  return ensureConfigShape(parsed, dataDir);
}

export function normalizeDdoConfig(config: Partial<DdoConfig> | null | undefined, dataDir: string): DdoConfig {
  return ensureConfigShape(config, dataDir);
}
