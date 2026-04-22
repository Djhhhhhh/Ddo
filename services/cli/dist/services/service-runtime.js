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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceDefinitions = getServiceDefinitions;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
function getCliRoot() {
    return path.resolve(__dirname, '..', '..');
}
function getVendorRoot() {
    return path.join(getCliRoot(), 'vendor');
}
function getSourceServicesRoot() {
    return path.resolve(getCliRoot(), '..');
}
function getNpmCommand() {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}
function getPythonCommand() {
    return process.env.DDO_PYTHON_BIN || 'python';
}
function getElectronBinaryName() {
    return process.platform === 'win32' ? 'electron.cmd' : 'electron';
}
function getElectronExecutableRelativePath() {
    return process.platform === 'win32'
        ? path.join('electron', 'dist', 'electron.exe')
        : path.join('.bin', 'electron');
}
function getPackagedServerGoBinaryPath() {
    const binaryName = process.platform === 'win32' ? 'server-go.exe' : 'server-go';
    return path.join(getVendorRoot(), 'server-go', 'bin', binaryName);
}
function getSourceServerGoDir() {
    return path.join(getSourceServicesRoot(), 'server-go', 'cmd', 'server');
}
function getPackagedLLMPyDir() {
    return path.join(getVendorRoot(), 'llm-py');
}
function getSourceLLMPyDir() {
    return path.join(getSourceServicesRoot(), 'llm-py');
}
function getPackagedWebUiDistDir() {
    return path.join(getVendorRoot(), 'web-ui', 'dist');
}
function getSourceWebUiDir() {
    return path.join(getSourceServicesRoot(), 'web-ui');
}
function getCliElectronBinaryPath() {
    if (process.platform === 'win32') {
        return path.join(getCliRoot(), 'node_modules', getElectronExecutableRelativePath());
    }
    return path.join(getCliRoot(), 'node_modules', '.bin', getElectronBinaryName());
}
function getSourceWebUiElectronBinaryPath() {
    if (process.platform === 'win32') {
        return path.join(getSourceWebUiDir(), 'node_modules', getElectronExecutableRelativePath());
    }
    return path.join(getSourceWebUiDir(), 'node_modules', '.bin', getElectronBinaryName());
}
function getPackagedWebUiDir() {
    return path.join(getVendorRoot(), 'web-ui');
}
function getPackagedWebUiElectronMainPath() {
    return path.join(getPackagedWebUiDir(), 'dist-electron', 'main.js');
}
function getSourceWebUiElectronMainPath() {
    return path.join(getSourceWebUiDir(), 'dist-electron', 'main.js');
}
function buildHealthUrl(baseUrl, healthPath) {
    return `${baseUrl.replace(/\/+$/, '')}${healthPath.startsWith('/') ? healthPath : `/${healthPath}`}`;
}
async function ensureLLMPyConfig(config) {
    const configPath = config.services.llmPy.configPath;
    let runtimeConfig = {};
    if (await fs.pathExists(configPath)) {
        try {
            runtimeConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
        }
        catch {
            runtimeConfig = {};
        }
    }
    runtimeConfig.llm_host = config.services.llmPy.host;
    runtimeConfig.llm_port = config.services.llmPy.port;
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, JSON.stringify(runtimeConfig, null, 2), 'utf8');
}
async function getServiceDefinitions(config, dataDir) {
    const services = [];
    const cliRoot = getCliRoot();
    const serverGoBinary = getPackagedServerGoBinaryPath();
    const sourceServerGoDir = getSourceServerGoDir();
    const packagedLLMPyDir = getPackagedLLMPyDir();
    const sourceLLMPyDir = getSourceLLMPyDir();
    const packagedWebUiDir = getPackagedWebUiDir();
    const packagedWebUiDistDir = getPackagedWebUiDistDir();
    const sourceWebUiDir = getSourceWebUiDir();
    const cliElectronBinary = getCliElectronBinaryPath();
    const sourceElectronBinary = getSourceWebUiElectronBinaryPath();
    const packagedElectronMain = getPackagedWebUiElectronMainPath();
    const sourceElectronMain = getSourceWebUiElectronMainPath();
    // 启动 llm-py 前自动同步 host/port 到其配置文件
    await ensureLLMPyConfig(config);
    if (await fs.pathExists(serverGoBinary)) {
        services.push({
            name: 'server-go',
            displayName: 'server-go',
            port: config.services.serverGo.port,
            healthUrl: buildHealthUrl(config.services.serverGo.url, config.services.serverGo.healthPath),
            command: [serverGoBinary, '-config', config.services.serverGo.configPath],
            cwd: path.dirname(serverGoBinary),
            env: {
                DDO_DATA_DIR: dataDir,
            },
        });
    }
    else if (await fs.pathExists(sourceServerGoDir)) {
        services.push({
            name: 'server-go',
            displayName: 'server-go',
            port: config.services.serverGo.port,
            healthUrl: buildHealthUrl(config.services.serverGo.url, config.services.serverGo.healthPath),
            command: ['go', 'run', '.', '-config', config.services.serverGo.configPath],
            cwd: sourceServerGoDir,
            env: {
                DDO_DATA_DIR: dataDir,
            },
        });
    }
    if (await fs.pathExists(packagedLLMPyDir)) {
        services.push({
            name: 'llm-py',
            displayName: 'llm-py',
            port: config.services.llmPy.port,
            healthUrl: buildHealthUrl(config.services.llmPy.url, config.services.llmPy.healthPath),
            command: [getPythonCommand(), 'main.py'],
            cwd: packagedLLMPyDir,
            env: {
                DDO_DATA_DIR: dataDir,
                DDO_LLM_PY_CONFIG: config.services.llmPy.configPath,
                PYTHONIOENCODING: 'utf-8',
            },
        });
    }
    else if (await fs.pathExists(sourceLLMPyDir)) {
        services.push({
            name: 'llm-py',
            displayName: 'llm-py',
            port: config.services.llmPy.port,
            healthUrl: buildHealthUrl(config.services.llmPy.url, config.services.llmPy.healthPath),
            command: [getPythonCommand(), 'main.py'],
            cwd: sourceLLMPyDir,
            env: {
                DDO_DATA_DIR: dataDir,
                DDO_LLM_PY_CONFIG: config.services.llmPy.configPath,
                PYTHONIOENCODING: 'utf-8',
            },
        });
    }
    if (await fs.pathExists(packagedWebUiDistDir)) {
        services.push({
            name: 'web-ui',
            displayName: 'web-ui',
            port: config.services.webUi.port,
            healthUrl: buildHealthUrl(config.services.webUi.url, config.services.webUi.healthPath),
            command: [process.execPath, path.join(cliRoot, 'dist', 'services', 'web-ui-server.js')],
            cwd: cliRoot,
            env: {
                DDO_DATA_DIR: dataDir,
                DDO_WEB_UI_CONFIG: config.services.webUi.configPath,
                DDO_WEB_UI_ASSETS: packagedWebUiDistDir,
                DDO_SERVER_GO_URL: config.services.webUi.apiBaseUrl,
            },
        });
    }
    else if (await fs.pathExists(sourceWebUiDir)) {
        services.push({
            name: 'web-ui',
            displayName: 'web-ui',
            port: config.services.webUi.port,
            healthUrl: buildHealthUrl(config.services.webUi.url, config.services.webUi.healthPath),
            command: [
                getNpmCommand(),
                'run',
                'dev',
                '--',
                '--host',
                config.services.webUi.host,
                '--port',
                String(config.services.webUi.port),
            ],
            cwd: sourceWebUiDir,
            env: {
                DDO_DATA_DIR: dataDir,
                DDO_WEB_UI_CONFIG: config.services.webUi.configPath,
                DDO_SERVER_GO_URL: config.services.webUi.apiBaseUrl,
            },
        });
    }
    if (await fs.pathExists(cliElectronBinary) && await fs.pathExists(packagedElectronMain)) {
        services.push({
            name: 'electron',
            displayName: 'electron',
            port: 0,
            healthUrl: '',
            startupStrategy: 'process',
            startupTimeoutMs: 5000,
            command: [cliElectronBinary, packagedElectronMain],
            cwd: packagedWebUiDir,
            env: {
                DDO_DATA_DIR: dataDir,
                DDO_SERVER_GO_URL: config.services.webUi.apiBaseUrl,
                DDO_WEB_UI_URL: config.services.webUi.url,
                VITE_DEV_SERVER_URL: config.services.webUi.url,
            },
        });
    }
    else if (await fs.pathExists(sourceElectronBinary) && await fs.pathExists(sourceElectronMain)) {
        services.push({
            name: 'electron',
            displayName: 'electron',
            port: 0,
            healthUrl: '',
            startupStrategy: 'process',
            startupTimeoutMs: 5000,
            command: [sourceElectronBinary, '.'],
            cwd: sourceWebUiDir,
            env: {
                DDO_DATA_DIR: dataDir,
                DDO_SERVER_GO_URL: config.services.webUi.apiBaseUrl,
                DDO_WEB_UI_URL: config.services.webUi.url,
                VITE_DEV_SERVER_URL: config.services.webUi.url,
            },
        });
    }
    return services;
}
//# sourceMappingURL=service-runtime.js.map