import readline from 'readline';
/**
 * 参数定义
 */
export interface ParameterDef {
    /** 参数名 */
    name: string;
    /** 显示名称 */
    label: string;
    /** 是否必填 */
    required: boolean;
    /** 默认值提示 */
    defaultHint?: string;
    /** 验证函数 */
    validate?: (value: string) => string | null;
    /** 帮助说明 */
    help?: string;
}
/**
 * 交互式参数收集器
 * 用于引导用户逐步输入参数，支持渐进式交互
 */
export declare class InteractivePrompt {
    private rl;
    constructor(rl: readline.Interface);
    /**
     * 提示用户输入单个参数
     */
    promptParam(def: ParameterDef, currentValue?: string): Promise<string | null>;
    /**
     * 收集多个参数（仅收集必填参数或已有值的参数）
     * 返回是否所有必填参数都已收集
     */
    collectRequiredParams(paramDefs: ParameterDef[], initialValues?: Record<string, string>): Promise<{
        params: Record<string, string | null>;
        allCollected: boolean;
    }>;
    /**
     * 收集多个参数
     */
    collectParams(paramDefs: ParameterDef[], initialValues?: Record<string, string>): Promise<Record<string, string | null>>;
    /**
     * 显示汇总确认
     */
    confirmSummary(title: string, params: Record<string, string | null>): Promise<boolean>;
    /**
     * 提示用户输入
     */
    private promptUser;
    /**
     * 提示用户确认
     */
    private promptUserConfirm;
}
/**
 * Cron 表达式验证
 */
export declare function validateCron(value: string): string | null;
/**
 * URL 验证
 */
export declare function validateUrl(value: string): string | null;
/**
 * 检查是否所有必填参数都已收集
 */
export declare function areRequiredParamsComplete(paramDefs: ParameterDef[], values: Record<string, string | null>): boolean;
//# sourceMappingURL=prompt-helper.d.ts.map