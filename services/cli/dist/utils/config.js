"use strict";
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
exports.loadDdoConfig = loadDdoConfig;
exports.loadDdoConfigSync = loadDdoConfigSync;
exports.normalizeDdoConfig = normalizeDdoConfig;
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const yaml_1 = __importDefault(require("yaml"));
const config_yaml_1 = require("../templates/config.yaml");
const paths_1 = require("./paths");
function buildLocalUrl(host, port) {
    return `http://${host}:${port}`;
}
function expandHomePath(input) {
    if (input === '~') {
        return os.homedir();
    }
    if (input.startsWith('~/') || input.startsWith('~\\')) {
        return path.join(os.homedir(), input.slice(2));
    }
    return input;
}
function normalizePathValue(input, fallback) {
    if (!input || typeof input !== 'string') {
        return fallback;
    }
    return path.resolve(expandHomePath(input));
}
function extractPort(url, fallback) {
    if (!url) {
        return fallback;
    }
    try {
        const parsed = new URL(url);
        if (parsed.port) {
            return parseInt(parsed.port, 10);
        }
    }
    catch {
    }
    return fallback;
}
function extractHost(url, fallback) {
    if (!url) {
        return fallback;
    }
    try {
        const parsed = new URL(url);
        return parsed.hostname || fallback;
    }
    catch {
        return fallback;
    }
}
function ensureConfigShape(rawConfig, dataDir) {
    const defaultConfig = (0, config_yaml_1.generateDefaultConfig)(dataDir);
    const rootDataDir = normalizePathValue(rawConfig?.dataDir, dataDir);
    const paths = (0, paths_1.getPaths)(rootDataDir);
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
async function loadDdoConfig(dataDir) {
    const paths = (0, paths_1.getPaths)(dataDir);
    if (!(await fs.pathExists(paths.config))) {
        return (0, config_yaml_1.generateDefaultConfig)(dataDir);
    }
    const configContent = await fs.readFile(paths.config, 'utf8');
    const parsed = yaml_1.default.parse(configContent);
    return ensureConfigShape(parsed, dataDir);
}
function loadDdoConfigSync(dataDir) {
    const paths = (0, paths_1.getPaths)(dataDir);
    if (!fs.existsSync(paths.config)) {
        return (0, config_yaml_1.generateDefaultConfig)(dataDir);
    }
    const configContent = fs.readFileSync(paths.config, 'utf8');
    const parsed = yaml_1.default.parse(configContent);
    return ensureConfigShape(parsed, dataDir);
}
function normalizeDdoConfig(config, dataDir) {
    return ensureConfigShape(config, dataDir);
}
//# sourceMappingURL=config.js.map