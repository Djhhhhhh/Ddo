/**
 * 配置文件模板
 */
import type { DdoConfig } from '../types';
/**
 * 生成默认配置
 */
export declare function generateDefaultConfig(dataDir: string): DdoConfig;
/**
 * 生成配置文件 YAML 内容
 */
export declare function generateConfigYaml(config: DdoConfig): string;
/**
 * 生成 server-go 专用配置文件内容
 * server-go 使用不同的配置结构
 */
export declare function generateServerGoConfigYaml(dataDir: string, serverPort: number, llmPyUrl: string): string;
export declare function generateLLMPyConfigJson(config: DdoConfig): string;
export declare function generateWebUiConfigJson(config: DdoConfig): string;
//# sourceMappingURL=config.yaml.d.ts.map