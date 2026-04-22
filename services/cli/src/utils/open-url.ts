import { spawn } from 'child_process';
import { loadDdoConfig } from './config';
import { resolveDataDir } from './paths';

interface OpenWebPageOptions {
  dataDir?: string;
  route?: string;
}

interface OpenWebPageResult {
  success: boolean;
  url: string;
  error?: string;
}

const DEFAULT_WEB_UI_URL = 'http://127.0.0.1:50003';

export async function resolveWebUiBaseUrl(dataDir?: string): Promise<string> {
  const resolvedDataDir = resolveDataDir({
    dataDir,
    envDataDir: process.env.DDO_DATA_DIR,
  });

  try {
    const config = await loadDdoConfig(resolvedDataDir);
    if (config?.endpoints?.webUi) {
      return normalizeBaseUrl(config.endpoints.webUi);
    }
  } catch {
  }

  if (process.env.DDO_WEB_UI_URL) {
    return normalizeBaseUrl(process.env.DDO_WEB_UI_URL);
  }

  return DEFAULT_WEB_UI_URL;
}

export async function openWebPage(options: OpenWebPageOptions = {}): Promise<OpenWebPageResult> {
  const baseUrl = await resolveWebUiBaseUrl(options.dataDir);
  const url = buildWebUiUrl(baseUrl, options.route);

  try {
    await launchExternalUrl(url);
    return {
      success: true,
      url,
    };
  } catch (err) {
    return {
      success: false,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildWebUiUrl(baseUrl: string, route = ''): string {
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

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeRoute(route: string): string {
  if (!route || route === '/') {
    return '';
  }

  return route.startsWith('/') ? route : `/${route}`;
}

async function launchExternalUrl(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command = getOpenCommand(url);
    const child = spawn(command.file, command.args, {
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

function getOpenCommand(url: string): { file: string; args: string[] } {
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
