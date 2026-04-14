/**
 * PID 文件操作模块
 * 管理服务的进程 ID 文件读写
 */
/**
 * 写入 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @param pid 进程 ID
 */
export declare function writePid(pidDir: string, serviceName: string, pid: number): void;
/**
 * 读取 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @returns 进程 ID，如果不存在返回 null
 */
export declare function readPid(pidDir: string, serviceName: string): number | null;
/**
 * 删除 PID 文件
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 */
export declare function removePid(pidDir: string, serviceName: string): void;
/**
 * 检查进程是否存活
 * @param pid 进程 ID
 * @returns 是否存活
 */
export declare function isProcessRunning(pid: number): boolean;
/**
 * 终止进程
 * @param pid 进程 ID
 * @param force 是否强制终止
 * @returns 是否成功终止
 */
export declare function killProcess(pid: number, force?: boolean): boolean;
/**
 * 检查服务是否正在运行
 * @param pidDir PID 文件目录
 * @param serviceName 服务名称
 * @returns 是否正在运行
 */
export declare function isServiceRunning(pidDir: string, serviceName: string): boolean;
/**
 * 清理所有 PID 文件
 * @param pidDir PID 文件目录
 */
export declare function cleanAllPids(pidDir: string): void;
//# sourceMappingURL=pid-file.d.ts.map