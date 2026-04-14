"use strict";
/**
 * Docker 操作封装
 * 提供 Docker 和 Docker Compose 相关操作
 */
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
exports.MYSQL_CONTAINER_NAME = void 0;
exports.checkDocker = checkDocker;
exports.checkDockerCompose = checkDockerCompose;
exports.getComposeCommand = getComposeCommand;
exports.getContainerStatus = getContainerStatus;
exports.startMySQL = startMySQL;
exports.waitForHealthy = waitForHealthy;
exports.stopMySQL = stopMySQL;
exports.verifyDataMount = verifyDataMount;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs-extra"));
const logger_1 = __importDefault(require("./logger"));
/** MySQL 容器名称 */
const MYSQL_CONTAINER_NAME = 'ddo-mysql';
exports.MYSQL_CONTAINER_NAME = MYSQL_CONTAINER_NAME;
/**
 * 检查 Docker 是否已安装并运行
 */
async function checkDocker() {
    try {
        // 检查 Docker 版本（验证是否安装）
        (0, child_process_1.execSync)('docker --version', { stdio: 'pipe' });
        // 检查 Docker 是否运行
        try {
            (0, child_process_1.execSync)('docker info', { stdio: 'pipe' });
            return { installed: true, running: true };
        }
        catch {
            return { installed: true, running: false };
        }
    }
    catch {
        return { installed: false, running: false };
    }
}
/**
 * 检查 Docker Compose 是否可用
 */
function checkDockerCompose() {
    try {
        // 尝试 docker compose (v2) 或 docker-compose (v1)
        try {
            (0, child_process_1.execSync)('docker compose version', { stdio: 'pipe' });
            return true;
        }
        catch {
            (0, child_process_1.execSync)('docker-compose --version', { stdio: 'pipe' });
            return true;
        }
    }
    catch {
        return false;
    }
}
/**
 * 获取 Docker Compose 命令前缀
 * 优先使用 docker compose (v2)，回退到 docker-compose (v1)
 */
function getComposeCommand() {
    try {
        (0, child_process_1.execSync)('docker compose version', { stdio: 'pipe' });
        return 'docker compose';
    }
    catch {
        return 'docker-compose';
    }
}
/**
 * 获取容器状态
 */
async function getContainerStatus(containerName) {
    try {
        // Windows 使用双引号，Unix 使用单引号
        const quote = process.platform === 'win32' ? '"' : "'";
        const format = `${quote}{{.State.Running}}|{{.State.Status}}|{{.State.Health.Status}}|{{.Id}}${quote}`;
        const output = (0, child_process_1.execSync)(`docker inspect --format=${format} ${containerName}`, { stdio: 'pipe', encoding: 'utf8' });
        const [running, status, health, id] = output.trim().split('|');
        return {
            running: running === 'true',
            name: containerName,
            health: health,
            id: id?.substring(0, 12),
        };
    }
    catch (err) {
        logger_1.default.debug(`获取容器状态失败: ${err}`);
        return {
            running: false,
            name: containerName,
            health: 'none',
        };
    }
}
/**
 * 启动 MySQL 容器
 */
async function startMySQL(composeFilePath) {
    const composeCmd = getComposeCommand();
    const workDir = require('path').dirname(composeFilePath);
    return new Promise((resolve) => {
        logger_1.default.info('正在启动 MySQL 容器...');
        const child = (0, child_process_1.spawn)('docker', ['compose', 'up', '-d'], {
            cwd: workDir,
            stdio: 'pipe',
            shell: process.platform === 'win32',
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: '容器启动成功' });
            }
            else {
                resolve({
                    success: false,
                    message: stderr || stdout || `退出码: ${code}`,
                });
            }
        });
        child.on('error', (err) => {
            resolve({ success: false, message: err.message });
        });
    });
}
/**
 * 等待容器健康检查通过
 */
async function waitForHealthy(containerName, timeoutMs = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000;
    logger_1.default.info('等待 MySQL 就绪...');
    while (Date.now() - startTime < timeoutMs) {
        const status = await getContainerStatus(containerName);
        if (status.running && status.health === 'healthy') {
            return true;
        }
        // 检查是否还在运行（但可能还没有健康检查）
        if (status.running && status.health === 'none') {
            // 没有健康检查配置，直接检查 MySQL 端口
            try {
                (0, child_process_1.execSync)(`docker exec ${containerName} mysqladmin ping --silent`, {
                    stdio: 'pipe',
                });
                return true;
            }
            catch {
                // 还没准备好，继续等待
            }
        }
        await sleep(checkInterval);
    }
    return false;
}
/**
 * 停止 MySQL 容器
 */
async function stopMySQL(composeFilePath) {
    // 如果没有提供 composeFilePath，直接停止容器
    if (!composeFilePath) {
        return new Promise((resolve) => {
            const child = (0, child_process_1.spawn)('docker', ['stop', MYSQL_CONTAINER_NAME], {
                stdio: 'pipe',
                shell: process.platform === 'win32',
            });
            let stderr = '';
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('close', (code) => {
                if (code === 0) {
                    // 停止后移除容器
                    (0, child_process_1.spawn)('docker', ['rm', MYSQL_CONTAINER_NAME], { stdio: 'ignore' });
                    resolve({ success: true, message: '容器已停止' });
                }
                else {
                    resolve({ success: false, message: stderr || `退出码: ${code}` });
                }
            });
            child.on('error', (err) => {
                resolve({ success: false, message: err.message });
            });
        });
    }
    // 使用 docker-compose down
    const workDir = require('path').dirname(composeFilePath);
    return new Promise((resolve) => {
        const child = (0, child_process_1.spawn)('docker', ['compose', 'down'], {
            cwd: workDir,
            stdio: 'pipe',
            shell: process.platform === 'win32',
        });
        let stderr = '';
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: '容器已停止' });
            }
            else {
                resolve({ success: false, message: stderr || `退出码: ${code}` });
            }
        });
        child.on('error', (err) => {
            resolve({ success: false, message: err.message });
        });
    });
}
/**
 * 验证数据持久化挂载
 */
async function verifyDataMount(dataDir) {
    try {
        const mysqlDataDir = require('path').join(dataDir, 'data', 'mysql');
        // 检查本地目录是否存在且可写
        await fs.ensureDir(mysqlDataDir);
        const testFile = require('path').join(mysqlDataDir, '.ddo_test');
        await fs.writeFile(testFile, 'test');
        await fs.remove(testFile);
        // 检查容器内的挂载
        try {
            const output = (0, child_process_1.execSync)(`docker exec ${MYSQL_CONTAINER_NAME} ls -la /var/lib/mysql`, { stdio: 'pipe', encoding: 'utf8' });
            return output.length > 0;
        }
        catch {
            // 容器可能还没完全启动，但至少本地目录检查通过了
            return true;
        }
    }
    catch (err) {
        logger_1.default.debug(`数据挂载验证失败: ${err}`);
        return false;
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=docker.js.map