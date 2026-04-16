import chalk from 'chalk';

/**
 * REPL 模式枚举
 */
export enum ReplMode {
  Default = 'default',
  Chat = 'chat',
  Kb = 'kb',
  Timer = 'timer',
  Mcp = 'mcp',
}

/**
 * 模式信息
 */
export interface ModeInfo {
  /** 模式名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 提示符颜色 */
  promptColor: chalk.Chalk;
  /** 描述 */
  description: string;
}

/**
 * 模式配置映射
 * 所有模式的 displayName 设为空字符串，实现统一提示符
 */
const MODE_CONFIG: Record<ReplMode, ModeInfo> = {
  [ReplMode.Default]: {
    name: 'default',
    displayName: '',
    promptColor: chalk.cyan,
    description: '默认模式，统一对话入口',
  },
  [ReplMode.Chat]: {
    name: 'chat',
    displayName: '',
    promptColor: chalk.green,
    description: '持续对话模式',
  },
  [ReplMode.Kb]: {
    name: 'kb',
    displayName: '',
    promptColor: chalk.magenta,
    description: '',
  },
  [ReplMode.Timer]: {
    name: 'timer',
    displayName: '',
    promptColor: chalk.yellow,
    description: '',
  },
  [ReplMode.Mcp]: {
    name: 'mcp',
    displayName: '',
    promptColor: chalk.blue,
    description: '',
  },
};

/**
 * 模式管理器
 */
export class ModeManager {
  private currentMode: ReplMode = ReplMode.Default;

  /**
   * 获取当前模式
   */
  get mode(): ReplMode {
    return this.currentMode;
  }

  /**
   * 设置模式
   */
  setMode(mode: ReplMode): void {
    this.currentMode = mode;
  }

  /**
   * 切换到子命令模式
   */
  enterSubMode(mode: ReplMode): void {
    if (mode === ReplMode.Default) {
      throw new Error('Cannot enter default mode as sub-mode');
    }
    this.currentMode = mode;
  }

  /**
   * 返回默认模式
   */
  backToDefault(): void {
    this.currentMode = ReplMode.Default;
  }

  /**
   * 获取当前模式信息
   */
  getModeInfo(): ModeInfo {
    return MODE_CONFIG[this.currentMode];
  }

  /**
   * 获取指定模式信息
   */
  static getModeInfo(mode: ReplMode): ModeInfo {
    return MODE_CONFIG[mode];
  }

  /**
   * 获取所有可用模式
   */
  static getAllModes(): ModeInfo[] {
    return Object.values(MODE_CONFIG);
  }

  /**
   * 获取提示符字符串
   */
  getPrompt(): string {
    const info = this.getModeInfo();
    if (this.currentMode === ReplMode.Default) {
      return info.promptColor('ddo> ');
    }
    return info.promptColor(`ddo/${info.name}> `);
  }

  /**
   * 检查是否在子命令模式
   */
  isInSubMode(): boolean {
    return this.currentMode !== ReplMode.Default;
  }

  /**
   * 从字符串解析模式
   */
  static fromString(str: string): ReplMode | null {
    const normalized = str.toLowerCase().trim();

    switch (normalized) {
      case 'default':
      case 'def':
        return ReplMode.Default;
      case 'chat':
      case 'c':
        return ReplMode.Chat;
      case 'kb':
      case 'knowledge':
      case 'knowledgebase':
        return ReplMode.Kb;
      case 'timer':
      case 't':
      case 'schedule':
      case 'cron':
        return ReplMode.Timer;
      case 'mcp':
      case 'modelcontext':
        return ReplMode.Mcp;
      default:
        return null;
    }
  }
}
