/**
 * 健康检查模块
 * 检查各服务是否已就绪
 */

import * as http from 'http';
import * as https from 'https';
import logger from '../utils/logger';

/**
 * HTTP 健康检查结果
 */
export interface HealthResult {
  healthy: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * 执行单次健康检查
 * @param url 健康检查 URL
 * @param timeout 超时时间（毫秒）
 * @returns 健康检查结果
 */
export async function checkHealth(url: string, timeout = 5000): Promise<HealthResult> {
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
      res.on('data', () => {});
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
export async function waitForHealthy(
  url: string,
  timeout = 30000,
  interval = 1000
): Promise<boolean> {
  const startTime = Date.now();

  logger.debug(`等待服务就绪: ${url}`);

  while (Date.now() - startTime < timeout) {
    const result = await checkHealth(url, interval);

    if (result.healthy) {
      logger.debug(`服务已就绪: ${url}`);
      return true;
    }

    // 等待下一次检查
    await sleep(interval);
  }

  logger.debug(`等待服务就绪超时: ${url}`);
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
export async function waitForHealthyWithProgress(
  url: string,
  serviceName: string,
  timeout = 30000,
  interval = 1000
): Promise<boolean> {
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
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
