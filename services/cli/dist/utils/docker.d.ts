/**
 * Docker 操作封装
 * 提供 Docker 和 Docker Compose 相关操作
 */
import type { ContainerStatus } from '../types';
/** MySQL 容器名称 */
declare const MYSQL_CONTAINER_NAME = "ddo-mysql";
/**
 * 检查 Docker 是否已安装并运行
 */
export declare function checkDocker(): Promise<{
    installed: boolean;
    running: boolean;
}>;
/**
 * 检查 Docker Compose 是否可用
 */
export declare function checkDockerCompose(): boolean;
/**
 * 获取 Docker Compose 命令前缀
 * 优先使用 docker compose (v2)，回退到 docker-compose (v1)
 */
export declare function getComposeCommand(): string;
/**
 * 获取容器状态
 */
export declare function getContainerStatus(containerName: string): Promise<ContainerStatus>;
/**
 * 启动 MySQL 容器
 */
export declare function startMySQL(composeFilePath: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * 等待容器健康检查通过
 */
export declare function waitForHealthy(containerName: string, timeoutMs?: number): Promise<boolean>;
/**
 * 停止 MySQL 容器
 */
export declare function stopMySQL(composeFilePath: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * 验证数据持久化挂载
 */
export declare function verifyDataMount(dataDir: string): Promise<boolean>;
export { MYSQL_CONTAINER_NAME };
//# sourceMappingURL=docker.d.ts.map