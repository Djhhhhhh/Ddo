import { ReplCommand } from './index';
/**
 * Timer List 命令 - 列出定时任务
 */
export declare const timerListCommand: ReplCommand;
/**
 * Timer Add 命令 - 添加定时任务
 * 支持渐进式参数收集：参数充足时直接执行，否则引导用户输入
 */
export declare const timerAddCommand: ReplCommand;
export declare const timerAddIntervalCommand: ReplCommand;
export declare const timerAddDelayCommand: ReplCommand;
/**
 * Timer Pause 命令 - 暂停定时任务
 */
export declare const timerPauseCommand: ReplCommand;
/**
 * Timer Resume 命令 - 恢复定时任务
 */
export declare const timerResumeCommand: ReplCommand;
/**
 * Timer Remove 命令 - 删除定时任务
 */
export declare const timerRemoveCommand: ReplCommand;
/**
 * Timer Help 命令
 */
export declare const timerHelpCommand: ReplCommand;
//# sourceMappingURL=timer-commands.d.ts.map