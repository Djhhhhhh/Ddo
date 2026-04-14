/**
 * ddo init 命令实现
 * 初始化 Ddo 工作空间
 */
import type { InitResult } from '../types';
interface InitOptions {
    dataDir?: string;
    skipDocker?: boolean;
    force?: boolean;
}
/**
 * 执行 init 命令
 */
export declare function initCommand(options?: InitOptions): Promise<InitResult>;
export {};
//# sourceMappingURL=init.d.ts.map