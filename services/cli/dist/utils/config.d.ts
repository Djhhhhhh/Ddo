import type { DdoConfig } from '../types';
export declare function loadDdoConfig(dataDir: string): Promise<DdoConfig>;
export declare function loadDdoConfigSync(dataDir: string): DdoConfig;
export declare function normalizeDdoConfig(config: Partial<DdoConfig> | null | undefined, dataDir: string): DdoConfig;
//# sourceMappingURL=config.d.ts.map