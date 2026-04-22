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
const fs = __importStar(require("fs"));
const fsp = __importStar(require("fs/promises"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function resolveDataRoot() {
    if (process.env.DDO_DATA_DIR) {
        return path.resolve(process.env.DDO_DATA_DIR);
    }
    return path.join(os.homedir(), '.ddo');
}
function resolveWebUiConfigPath() {
    if (process.env.DDO_WEB_UI_CONFIG) {
        return path.resolve(process.env.DDO_WEB_UI_CONFIG);
    }
    return path.join(resolveDataRoot(), 'web-ui', 'config.json');
}
function loadRuntimeConfig() {
    const fallback = {
        host: '127.0.0.1',
        port: 50003,
        apiBaseUrl: process.env.DDO_SERVER_GO_URL || 'http://127.0.0.1:50001',
        healthPath: '/__ddo/health',
    };
    try {
        const configPath = resolveWebUiConfigPath();
        if (!fs.existsSync(configPath)) {
            return fallback;
        }
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
            host: parsed.host || fallback.host,
            port: parsed.port || fallback.port,
            apiBaseUrl: parsed.apiBaseUrl || fallback.apiBaseUrl,
            healthPath: parsed.healthPath || fallback.healthPath,
        };
    }
    catch {
        return fallback;
    }
}
function getAssetsRoot() {
    if (process.env.DDO_WEB_UI_ASSETS) {
        return path.resolve(process.env.DDO_WEB_UI_ASSETS);
    }
    return path.resolve(__dirname, '..', '..', 'vendor', 'web-ui', 'dist');
}
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html': return 'text/html; charset=utf-8';
        case '.js': return 'application/javascript; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.json': return 'application/json; charset=utf-8';
        case '.svg': return 'image/svg+xml';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.ico': return 'image/x-icon';
        case '.woff': return 'font/woff';
        case '.woff2': return 'font/woff2';
        default: return 'application/octet-stream';
    }
}
function safeJoin(root, requestPath) {
    const relativePath = requestPath.replace(/^\/+/, '');
    const normalized = path.normalize(relativePath);
    const resolved = path.resolve(root, normalized);
    if (!resolved.startsWith(path.resolve(root))) {
        return path.join(root, 'index.html');
    }
    return resolved;
}
async function serveStaticFile(res, filePath, assetsRoot) {
    let resolvedPath = filePath;
    try {
        const stat = await fsp.stat(resolvedPath);
        if (stat.isDirectory()) {
            resolvedPath = path.join(resolvedPath, 'index.html');
        }
    }
    catch {
        resolvedPath = path.join(assetsRoot, 'index.html');
    }
    try {
        const content = await fsp.readFile(resolvedPath);
        res.statusCode = 200;
        res.setHeader('Content-Type', getContentType(resolvedPath));
        res.end(content);
    }
    catch {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
}
function proxyRequest(req, res, apiBaseUrl) {
    const target = new URL(req.url || '/', apiBaseUrl);
    const client = target.protocol === 'https:' ? https : http;
    const proxyReq = client.request({
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        method: req.method,
        path: `${target.pathname}${target.search}`,
        headers: req.headers,
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (error) => {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Bad Gateway', message: error.message }));
    });
    req.pipe(proxyReq);
}
async function main() {
    const config = loadRuntimeConfig();
    const assetsRoot = getAssetsRoot();
    const server = http.createServer(async (req, res) => {
        const requestUrl = req.url || '/';
        if (requestUrl === config.healthPath) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ status: 'ok', service: 'web-ui' }));
            return;
        }
        if (requestUrl.startsWith('/api') || requestUrl.startsWith('/health')) {
            proxyRequest(req, res, config.apiBaseUrl);
            return;
        }
        const filePath = safeJoin(assetsRoot, requestUrl === '/' ? 'index.html' : decodeURIComponent(requestUrl.split('?')[0]));
        await serveStaticFile(res, filePath, assetsRoot);
    });
    server.listen(config.port, config.host, () => {
        process.stdout.write(`web-ui server listening on http://${config.host}:${config.port}\n`);
    });
}
void main();
//# sourceMappingURL=web-ui-server.js.map