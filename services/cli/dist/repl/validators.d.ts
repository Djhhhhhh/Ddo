/**
 * 参数验证工具
 * 在参数传递给 API 之前进行验证
 */
/**
 * 验证结果
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * 验证知识库参数
 */
export declare function validateKBParams(params: Record<string, unknown>): ValidationResult;
/**
 * 验证定时任务参数
 */
export declare function validateTimerParams(params: Record<string, unknown>): ValidationResult;
/**
 * 验证 MCP 参数
 */
export declare function validateMCPParams(params: Record<string, unknown>): ValidationResult;
//# sourceMappingURL=validators.d.ts.map