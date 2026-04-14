"use strict";
/**
 * 健康检查模块
 * 检查各服务是否已就绪
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
exports.checkHealth = checkHealth;
exports.waitForHealthy = waitForHealthy;
exports.waitForHealthyWithProgress = waitForHealthyWithProgress;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 执行单次健康检查
 * @param url 健康检查 URL
 * @param timeout 超时时间（毫秒）
 * @returns 健康检查结果
 */
async function checkHealth(url, timeout = 5000) {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (url.startsWith('https') ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            timeout,
        };
        const req = client.request(options, (res) => {
            const statusCode = res.statusCode || 0;
            // 2xx 状态码视为健康
            const healthy = statusCode >= 200 && statusCode < 300;
            // 消费响应数据
            res.on('data', () => { });
            res.on('end', () => {
                resolve({
                    healthy,
                    statusCode,
                });
            });
        });
        req.on('error', (err) => {
            resolve({
                healthy: false,
                error: err.message,
            });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({
                healthy: false,
                error: 'timeout',
            });
        });
        req.end();
    });
}
/**
 * 等待服务就绪
 * 轮询检查直到服务健康或超时
 * @param url 健康检查 URL
 * @param timeout 总超时时间（毫秒）
 * @param interval 轮询间隔（毫秒）
 * @returns 是否成功
 */
async function waitForHealthy(url, timeout = 30000, interval = 1000) {
    const startTime = Date.now();
    logger_1.default.debug(`等待服务就绪: ${url}`);
    while (Date.now() - startTime < timeout) {
        const result = await checkHealth(url, interval);
        if (result.healthy) {
            logger_1.default.debug(`服务已就绪: ${url}`);
            return true;
        }
        // 等待下一次检查
        await sleep(interval);
    }
    logger_1.default.debug(`等待服务就绪超时: ${url}`);
    return false;
}
/**
 * 带进度显示的等待
 * @param url 健康检查 URL
 * @param serviceName 服务名称（用于显示）
 * @param timeout 总超时时间
 * @param interval 轮询间隔
 * @returns 是否成功
 */
async function waitForHealthyWithProgress(url, serviceName, timeout = 30000, interval = 1000) {
    const startTime = Date.now();
    let dots = 0;
    process.stdout.write(`等待 ${serviceName} 就绪`);
    while (Date.now() - startTime < timeout) {
        const result = await checkHealth(url, Math.min(interval, 2000));
        if (result.healthy) {
            process.stdout.write(' \x1b[32m\u2713\x1b[0m\n'); // 绿色对勾
            return true;
        }
        // 显示进度
        dots = (dots + 1) % 4;
        process.stdout.write(`\r等待 ${serviceName} 就绪${'.'.repeat(dots)}${' '.repeat(3 - dots)}`);
        await sleep(interval);
    }
    process.stdout.write(' \x1b[31m\u2717\x1b[0m\n'); // 红色叉
    return false;
}
/**
 * 睡眠函数
 * @param ms 毫秒
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=health-check.js.map