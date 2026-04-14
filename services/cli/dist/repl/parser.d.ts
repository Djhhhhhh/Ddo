/**
 * REPL 命令解析器
 * 支持解析带引号的参数、选项（flags）和命令
 */
/**
 * 解析后的命令结构
 */
export interface ParsedCommand {
    /** 命令名 */
    name: string;
    /** 位置参数 */
    args: string[];
    /** 选项（flags） */
    flags: Record<string, string | boolean>;
}
/**
 * 分词结果
 */
interface TokenizeResult {
    tokens: string[];
    errors: string[];
}
/**
 * 将输入字符串分词
 * 支持双引号包裹的字符串（支持转义）
 */
export declare function tokenize(input: string): TokenizeResult;
/**
 * 解析命令字符串
 */
export declare function parseCommand(input: string): ParsedCommand & {
    errors: string[];
};
/**
 * 解析自然语言输入（用于 NLP 模式）
 * 返回处理后的文本
 */
export declare function parseNaturalLanguage(input: string): {
    text: string;
    mentionedCommands: string[];
};
export {};
//# sourceMappingURL=parser.d.ts.map