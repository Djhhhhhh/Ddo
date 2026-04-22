"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWebUiBaseUrl = resolveWebUiBaseUrl;
exports.openWebPage = openWebPage;
exports.buildWebUiUrl = buildWebUiUrl;
const child_process_1 = require("child_process");
const config_1 = require("./config");
const paths_1 = require("./paths");
const DEFAULT_WEB_UI_URL = 'http://127.0.0.1:50003';
async function resolveWebUiBaseUrl(dataDir) {
    const resolvedDataDir = (0, paths_1.resolveDataDir)({
        dataDir,
        envDataDir: process.env.DDO_DATA_DIR,
    });
    try {
        const config = await (0, config_1.loadDdoConfig)(resolvedDataDir);
        if (config?.endpoints?.webUi) {
            return normalizeBaseUrl(config.endpoints.webUi);
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