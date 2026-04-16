"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractivePrompt = void 0;
exports.validateCron = validateCron;
exports.validateUrl = validateUrl;
exports.areRequiredParamsComplete = areRequiredParamsComplete;
const chalk_1 = __importDefault(require("chalk"));
/**
 * 交互式参数收集器
 * 用于引导用户逐步输入参数，支持渐进式交互
 */
class InteractivePrompt {
    constructor(rl) {
        this.rl = rl;
    }
    /**
     * 提示用户输入单个参数
     */
    async promptParam(def, currentValue) {
        // 如果已有值，跳过
        if (currentValue) {
            console.log(chalk_1.default.gray(`  ${def.label}: ${currentValue} (已提供)`));
            return currentValue;
        }
        // 显示提示
        const requiredMark = def.required ? chalk_1.default.red('*') : chalk_1.default.gray('(可选)');
        const helpText = def.help ? chalk_1.default.gray(` - ${def.help}`) : '';
        const defaultText = def.defaultHint ? chalk_1.default.gray(` [${def.defaultHint}]`) : '';
        console.log();
        console.log(chalk_1.default.cyan(`${def.label}${requiredMark}${defaultText}${helpText}`));
        // 读取用户输入
        const answer = await this.promptUser();
        // 必填参数未提供
        if (!answer && def.required) {
            console.log(chalk_1.default.yellow(`  ${def.label} 是必填的，请输入`));
            return this.promptParam(def, currentValue);
        }
        // 验证输入
        if (answer && def.validate) {
            const error = def.validate(answer);
            if (error) {
                console.log(chalk_1.default.red(`  ${error}`));
                return this.promptParam(def, currentValue);
            }
        }
        return answer || null;
    }
    /**
     * 收集多个参数（仅收集必填参数或已有值的参数）
     * 返回是否所有必填参数都已收集
     */
    async collectRequiredParams(paramDefs, initialValues) {
        const result = {};
        const initial = initialValues || {};
        for (const def of paramDefs) {
            // 只处理必填参数或已有初始值的参数
            if (!def.required && !initial[def.name]) {
                continue;
            }
            const value = await this.promptParam(def, initial[def.name]);
            result[def.name] = value;
        }
        // 检查是否所有必填参数都已收集
        const allCollected = paramDefs
            .filter(def => def.required)
            .every(def => result[def.name] !== null && result[def.name] !== undefined);
        return { params: result, allCollected };
    }
    /**
     * 收集多个参数
     */
    async collectParams(paramDefs, initialValues) {
        const result = {};
        const initial = initialValues || {};
        for (const def of paramDefs) {
            const value = await this.promptParam(def, initial[def.name]);
            result[def.name] = value;
        }
        return result;
    }
    /**
     * 显示汇总确认
     */
    async confirmSummary(title, params) {
        console.log();
        console.log(chalk_1.default.cyan(title));
        console.log(chalk_1.default.gray('─'.repeat(40)));
        for (const [key, value] of Object.entries(params)) {
            const displayValue = value || chalk_1.default.gray('(未设置)');
            console.log(`  ${chalk_1.default.yellow(key)}: ${displayValue}`);
        }
        console.log();
        const answer = await this.promptUserConfirm('确认执行? (y/n)');
        return answer;
    }
    /**
     * 提示用户输入
     */
    promptUser() {
        return new Promise((resolve) => {
            this.rl.question('', resolve);
        });
    }
    /**
     * 提示用户确认
     */
    async promptUserConfirm(message) {
        const answer = await this.promptUser();
        return answer.toLowerCase() === 'y';
    }
}
exports.InteractivePrompt = InteractivePrompt;
/**
 * Cron 表达式验证
 */
function validateCron(value) {
    // 简单验证：5个字段用空格分隔
    const parts = value.trim().split(/\s+/);
    if (parts.length !== 5) {
        return 'Cron 表达式需要 5 个字段（分 时 日 月 周）';
    }
    return null;
}
/**
 * URL 验证
 */
function validateUrl(value) {
    try {
        new URL(value);
        return null;
    }
    catch {
        return '请输入有效的 URL';
    }
}
/**
 * 检查是否所有必填参数都已收集
 */
function areRequiredParamsComplete(paramDefs, values) {
    return paramDefs
        .filter(def => def.required)
        .every(def => values[def.name] !== null && values[def.name] !== undefined);
}
//# sourceMappingURL=prompt-helper.js.map