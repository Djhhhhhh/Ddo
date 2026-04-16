import readline from 'readline';
import chalk from 'chalk';

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
  validate?: (value: string) => string | null;  // 返回 null 表示有效，错误消息表示无效
  /** 帮助说明 */
  help?: string;
}

/**
 * 交互式参数收集器
 * 用于引导用户逐步输入参数，支持渐进式交互
 */
export class InteractivePrompt {
  private rl: readline.Interface;

  constructor(rl: readline.Interface) {
    this.rl = rl;
  }

  /**
   * 提示用户输入单个参数
   */
  async promptParam(def: ParameterDef, currentValue?: string): Promise<string | null> {
    // 如果已有值，跳过
    if (currentValue) {
      console.log(chalk.gray(`  ${def.label}: ${currentValue} (已提供)`));
      return currentValue;
    }

    // 显示提示
    const requiredMark = def.required ? chalk.red('*') : chalk.gray('(可选)');
    const helpText = def.help ? chalk.gray(` - ${def.help}`) : '';
    const defaultText = def.defaultHint ? chalk.gray(` [${def.defaultHint}]`) : '';

    console.log();
    console.log(chalk.cyan(`${def.label}${requiredMark}${defaultText}${helpText}`));

    // 读取用户输入
    const answer = await this.promptUser();

    // 必填参数未提供
    if (!answer && def.required) {
      console.log(chalk.yellow(`  ${def.label} 是必填的，请输入`));
      return this.promptParam(def, currentValue);
    }

    // 验证输入
    if (answer && def.validate) {
      const error = def.validate(answer);
      if (error) {
        console.log(chalk.red(`  ${error}`));
        return this.promptParam(def, currentValue);
      }
    }

    return answer || null;
  }

  /**
   * 收集多个参数（仅收集必填参数或已有值的参数）
   * 返回是否所有必填参数都已收集
   */
  async collectRequiredParams(
    paramDefs: ParameterDef[],
    initialValues?: Record<string, string>
  ): Promise<{ params: Record<string, string | null>; allCollected: boolean }> {
    const result: Record<string, string | null> = {};
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
  async collectParams(
    paramDefs: ParameterDef[],
    initialValues?: Record<string, string>
  ): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
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
  async confirmSummary(
    title: string,
    params: Record<string, string | null>
  ): Promise<boolean> {
    console.log();
    console.log(chalk.cyan(title));
    console.log(chalk.gray('─'.repeat(40)));

    for (const [key, value] of Object.entries(params)) {
      const displayValue = value || chalk.gray('(未设置)');
      console.log(`  ${chalk.yellow(key)}: ${displayValue}`);
    }

    console.log();
    const answer = await this.promptUserConfirm('确认执行? (y/n)');
    return answer;
  }

  /**
   * 提示用户输入
   */
  private promptUser(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('', resolve);
    });
  }

  /**
   * 提示用户确认
   */
  private async promptUserConfirm(message: string): Promise<boolean> {
    const answer = await this.promptUser();
    return answer.toLowerCase() === 'y';
  }
}

/**
 * Cron 表达式验证
 */
export function validateCron(value: string): string | null {
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
export function validateUrl(value: string): string | null {
  try {
    new URL(value);
    return null;
  } catch {
    return '请输入有效的 URL';
  }
}

/**
 * 检查是否所有必填参数都已收集
 */
export function areRequiredParamsComplete(
  paramDefs: ParameterDef[],
  values: Record<string, string | null>
): boolean {
  return paramDefs
    .filter(def => def.required)
    .every(def => values[def.name] !== null && values[def.name] !== undefined);
}
