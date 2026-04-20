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
exports.resolveWebUiBaseUrl = resolveWebUiBaseUrl;
exports.openWebPage = openWebPage;
exports.buildWebUiUrl = buildWebUiUrl;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs-extra"));
const yaml_1 = __importDefault(require("yaml"));
const paths_1 = require("./paths");
const DEFAULT_WEB_UI_URL = 'http://localhost:3000';
async function resolveWebUiBaseUrl(dataDir) {
    const resolvedDataDir = (0, paths_1.resolveDataDir)({
        dataDir,
        envDataDir: process.env.DDO_DATA_DIR,
    });
    const paths = (0, paths_1.getPaths)(resolvedDataDir);
    try {
        if (await fs.pathExists(paths.config)) {
            const configContent = await fs.readFile(paths.config, 'utf8');
            const config = yaml_1.default.parse(configContent);
            if (config?.endpoints?.webUi) {
                return normalizeBaseUrl(config.endpoints.webUi);
            }
        }
    }
    catch {
    }
    if (process.env.DDO_WEB_UI_URL) {
        return normalizeBaseUrl(process.env.DDO_WEB_UI_URL);
    }
    return DEFAULT_WEB_UI_URL;
}
async function openWebPage(options = {}) {
    const baseUrl = await resolveWebUiBaseUrl(options.dataDir);
    const url = buildWebUiUrl(baseUrl, options.route);
    try {
        await launchExternalUrl(url);
        return {
            success: true,
            url,
        };
    }
    catch (err) {
        return {
            success: false,
            url,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
function buildWebUiUrl(baseUrl, route = '') {
    const normalizedBase = normalizeBaseUrl(baseUrl);
    const normalizedRoute = normalizeRoute(route);
    if (!normalizedRoute) {
        return normalizedBase;
    }
    if (normalizedBase.includes('#')) {
        const [baseWithoutHash] = normalizedBase.split('#');
        return `${baseWithoutHash}#${normalizedRoute}`;
    }
    return `${normalizedBase}/#${normalizedRoute}`;
}
function normalizeBaseUrl(url) {
    return url.replace(/\/+$/, '');
}
function normalizeRoute(route) {
    if (!route || route === '/') {
        return '';
    }
    return route.startsWith('/') ? route : `/${route}`;
}
async function launchExternalUrl(url) {
    await new Promise((resolve, reject) => {
        const command = getOpenCommand(url);
        const child = (0, child_process_1.spawn)(command.file, command.args, {
            detached: true,
            stdio: 'ignore',
        });
        child.once('error', reject);
        child.once('spawn', () => {
            child.unref();
            resolve();
        });
    });
}
function getOpenCommand(url) {
    switch (process.platform) {
        case 'win32':
            return {
                file: 'cmd',
                args: ['/c', 'start', '', url],
            };
        case 'darwin':
            return {
                file: 'open',
                args: [url],
            };
        default:
            return {
                file: 'xdg-open',
                args: [url],
            };
    }
}
//# sourceMappingURL=open-url.js.map