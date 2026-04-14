/**
 * 健康检查模块
 * 检查各服务是否已就绪
 */
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
export declare function checkHealth(url: string, timeout?: number): Promise<HealthResult>;
/**
 * 等待服务就绪
 * 轮询检查直到服务健康或超时
 * @param url 健康检查 URL
 * @param timeout 总超时时间（毫秒）
 * @param interval 轮询间隔（毫秒）
 * @returns 是否成功
 */
export declare function waitForHealthy(url: string, timeout?: number, interval?: number): Promise<boolean>;
/**
 * 带进度显示的等待
 * @param url 健康检查 URL
 * @param serviceName 服务名称（用于显示）
 * @param timeout 总超时时间
 * @param interval 轮询间隔
 * @returns 是否成功
 */
export declare function waitForHealthyWithProgress(url: string, serviceName: string, timeout?: number, interval?: number): Promise<boolean>;
//# sourceMappingURL=health-check.d.ts.map