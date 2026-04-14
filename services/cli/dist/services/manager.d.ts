/**
 * 服务管理器
 * 负责启动、停止和管理后台服务
 */
/** 服务定义 */
export interface ServiceDefinition {
    name: string;
    displayName: string;
    port: number;
    healthUrl: string;
    command: string[];
    cwd?: string;
    env?: Record<string, string>;
}
/** 启动结果 */
export interface StartResult {
    success: boolean;
    pid?: number;
    error?: string;
}
/** 停止结果 */
export interface StopResult {
    success: boolean;
    error?: string;
}
/** 服务状态 */
export interface ServiceStatus {
    name: string;
    displayName: string;
    running: boolean;
    pid?: number;
    port: number;
    healthUrl: string;
}
/** 服务管理器配置 */
interface ManagerConfig {
    pidDir: string;
    logDir: string;
    dataDir: string;
}
/**
 * 创建服务管理器
 */
export declare function createServiceManager(config: ManagerConfig): {
    startService: (service: ServiceDefinition) => Promise<StartResult>;
    stopService: (serviceName: string, displayName: string) => Promise<StopResult>;
    getStatus: (service: ServiceDefinition) => ServiceStatus;
    startAll: (services: ServiceDefinition[]) => Promise<{
        success: boolean;
        results: {
            service: string;
            result: StartResult;
        }[];
    }>;
    stopAll: (services: ServiceDefinition[]) => Promise<{
        success: boolean;
        results: {
            service: string;
            result: StopResult;
        }[];
    }>;
};
export {};
//# sourceMappingURL=manager.d.ts.map