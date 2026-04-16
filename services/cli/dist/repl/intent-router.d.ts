/**
 * 意图路由器
 * 根据 NLP 识别结果路由到对应的处理函数
 */
import { ReplMode } from './mode';
import type { NLPResponse } from '../services/nlp';
/** 路由动作类型 */
export type RouteActionType = 'switch_mode' | 'execute_command' | 'chat' | 'show_status' | 'show_help' | 'unknown';
/** 路由动作 */
export interface RouteAction {
    type: RouteActionType;
    /** 目标模式（switch_mode 时使用） */
    targetMode?: ReplMode;
    /** 目标命令（execute_command 时使用） */
    targetCommand?: string;
    /** 命令参数（execute_command 时使用） */
    commandArgs?: string[];
    /** 意图参数（从 NLP 响应中提取） */
    parameters?: Record<string, unknown>;
    /** 显示给用户的回复 */
    reply?: string;
}
/**
 * 意图路由器
 */
export declare function createIntentRouter(): {
    route: (nlpResponse: NLPResponse) => RouteAction;
    extractParameters: (nlpResponse: NLPResponse) => Record<string, unknown>;
};
/**
 * 获取默认意图路由器
 */
export declare function getIntentRouter(): ReturnType<typeof createIntentRouter>;
//# sourceMappingURL=intent-router.d.ts.map