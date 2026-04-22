import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const cliRoot = path.join(repoRoot, 'services', 'cli');
const llmPyRoot = path.join(repoRoot, 'services', 'llm-py');
const serverGoRoot = path.join(repoRoot, 'services', 'server-go');
const webUiRoot = path.join(repoRoot, 'services', 'web-ui');
const vendorRoot = path.join(cliRoot, 'vendor');

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });

    child.on('error', reject);
  });
}

async function rmrf(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyDir(src, dest, exclude = []) {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (exclude.includes(entry.name)) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, exclude);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}

async function buildServerGo() {
  const outputDir = path.join(vendorRoot, 'server-go', 'bin');
  const binaryName = process.platform === 'win32' ? 'server-go.exe' : 'server-go';
  await ensureDir(outputDir);
  await run('go', ['build', '-o', path.join(outputDir, binaryName), './cmd/server'], serverGoRoot);
}

async function bundleLLMPy() {
  const outputDir = path.join(vendorRoot, 'llm-py');
  await rmrf(outputDir);
  await ensureDir(outputDir);
  await copyDir(llmPyRoot, outputDir, ['__pycache__', '.pytest_cache', '.venv', 'venv', '.mypy_cache']);
}

async function bundleWebUi() {
  const outputDir = path.join(vendorRoot, 'web-ui');
  await rmrf(outputDir);
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], webUiRoot);
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:electron'], webUiRoot);
  await copyDir(path.join(webUiRoot, 'dist'), path.join(outputDir, 'dist'));
  await copyDir(path.join(webUiRoot, 'dist-electron'), path.join(outputDir, 'dist-electron'));
  await copyDir(path.join(webUiRoot, 'public'), path.join(outputDir, 'public'));
}

async function buildCli() {
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], cliRoot);
}

async function main() {
  await rmrf(vendorRoot);
  await ensureDir(vendorRoot);

  console.log('[package-all] build server-go');
  await buildServerGo();

  console.log('[package-all] bundle llm-py');
  await bundleLLMPy();

  console.log('[package-all] bundle web-ui');
  await bundleWebUi();

  console.log('[package-all] build cli');
  await buildCli();

  console.log('[package-all] done');
}

main().catch((error) => {
  console.error('[package-all] failed:', error);
  process.exit(1);
});
