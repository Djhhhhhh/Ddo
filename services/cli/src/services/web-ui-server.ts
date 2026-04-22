import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';

interface WebUiRuntimeConfig {
  host: string;
  port: number;
  apiBaseUrl: string;
  healthPath: string;
}

function resolveDataRoot(): string {
  if (process.env.DDO_DATA_DIR) {
    return path.resolve(process.env.DDO_DATA_DIR);
  }

  return path.join(os.homedir(), '.ddo');
}

function resolveWebUiConfigPath(): string {
  if (process.env.DDO_WEB_UI_CONFIG) {
    return path.resolve(process.env.DDO_WEB_UI_CONFIG);
  }

  return path.join(resolveDataRoot(), 'web-ui', 'config.json');
}

function loadRuntimeConfig(): WebUiRuntimeConfig {
  const fallback: WebUiRuntimeConfig = {
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

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<WebUiRuntimeConfig>;
    return {
      host: parsed.host || fallback.host,
      port: parsed.port || fallback.port,
      apiBaseUrl: parsed.apiBaseUrl || fallback.apiBaseUrl,
      healthPath: parsed.healthPath || fallback.healthPath,
    };
  } catch {
    return fallback;
  }
}

function getAssetsRoot(): string {
  if (process.env.DDO_WEB_UI_ASSETS) {
    return path.resolve(process.env.DDO_WEB_UI_ASSETS);
  }

  return path.resolve(__dirname, '..', '..', 'vendor', 'web-ui', 'dist');
}

function getContentType(filePath: string): string {
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

function safeJoin(root: string, requestPath: string): string {
  const relativePath = requestPath.replace(/^\/+/, '');
  const normalized = path.normalize(relativePath);
  const resolved = path.resolve(root, normalized);
  if (!resolved.startsWith(path.resolve(root))) {
    return path.join(root, 'index.html');
  }
  return resolved;
}

async function serveStaticFile(res: http.ServerResponse, filePath: string, assetsRoot: string): Promise<void> {
  let resolvedPath = filePath;

  try {
    const stat = await fsp.stat(resolvedPath);
    if (stat.isDirectory()) {
      resolvedPath = path.join(resolvedPath, 'index.html');
    }
  } catch {
    resolvedPath = path.join(assetsRoot, 'index.html');
  }

  try {
    const content = await fsp.readFile(resolvedPath);
    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(resolvedPath));
    res.end(content);
  } catch {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
}

function proxyRequest(req: http.IncomingMessage, res: http.ServerResponse, apiBaseUrl: string): void {
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

async function main(): Promise<void> {
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
