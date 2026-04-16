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
export function validateKBParams(params: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const title = params.title;
  if (!title || (typeof title === 'string' && title.trim() === '')) {
    errors.push('标题不能为空');
  }

  const content = params.content;
  if (!content || (typeof content === 'string' && content.trim() === '')) {
    errors.push('内容不能为空');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证定时任务参数
 */
export function validateTimerParams(params: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const cron = params.cron;
  if (!cron || (typeof cron === 'string' && cron.trim() === '')) {
    errors.push('Cron 表达式不能为空');
  } else {
    // 简单验证：5个字段用空格分隔
    const parts = String(cron).trim().split(/\s+/);
    if (parts.length !== 5) {
      errors.push('Cron 表达式需要 5 个字段（分 时 日 月 周）');
    }
  }

  const url = params.url;
  if (!url || (typeof url === 'string' && url.trim() === '')) {
    errors.push('回调 URL 不能为空');
  } else {
    try {
      new URL(String(url));
    } catch {
      errors.push('回调 URL 格式不正确');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证 MCP 参数
 */
export function validateMCPParams(params: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const name = params.name;
  if (!name || (typeof name === 'string' && name.trim() === '')) {
    errors.push('名称不能为空');
  }

  const type = params.type;
  const validTypes = ['stdio', 'http', 'sse'];
  if (!type || !validTypes.includes(String(type))) {
    errors.push(`类型必须是 ${validTypes.join('|')} 之一`);
  }

  const config = params.config;
  if (!config || (typeof config === 'string' && config.trim() === '')) {
    errors.push('配置不能为空');
  }

  return { valid: errors.length === 0, errors };
}