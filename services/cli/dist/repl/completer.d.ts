/**
 * REPL 命令自动补全
 */
import { ModeManager } from './mode';
/**
 * 自动补全结果
 */
export interface CompleterResult {
    /** 补全选项 */
    completions: string[];
    /** 匹配的原始文本 */
    matched: string;
}
/**
 * 创建自动补全函数
 */
export declare function createCompleter(modeManager: ModeManager): (line: string) => CompleterResult;
//# sourceMappingURL=completer.d.ts.map