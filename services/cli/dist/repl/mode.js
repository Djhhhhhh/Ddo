"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeManager = exports.ReplMode = void 0;
const chalk_1 = __importDefault(require("chalk"));
/**
 * REPL 模式枚举
 */
var ReplMode;
(function (ReplMode) {
    ReplMode["Default"] = "default";
    ReplMode["Chat"] = "chat";
    ReplMode["Kb"] = "kb";
    ReplMode["Timer"] = "timer";
    ReplMode["Mcp"] = "mcp";
})(ReplMode || (exports.ReplMode = ReplMode = {}));
/**
 * 模式配置映射
 * 所有模式的 displayName 设为空字符串，实现统一提示符
 */
const MODE_CONFIG = {
    [ReplMode.Default]: {
        name: 'default',
        displayName: '',
        promptColor: chalk_1.default.cyan,
        description: '默认模式，统一对话入口',
    },
    [ReplMode.Chat]: {
        name: 'chat',
        displayName: '',
        promptColor: chalk_1.default.green,
        description: '持续对话模式',
    },
    [ReplMode.Kb]: {
        name: 'kb',
        displayName: '',
        promptColor: chalk_1.default.magenta,
        description: '',
    },
    [ReplMode.Timer]: {
        name: 'timer',
        displayName: '',
        promptColor: chalk_1.default.yellow,
        description: '',
    },
    [ReplMode.Mcp]: {
        name: 'mcp',
        displayName: '',
        promptColor: chalk_1.default.blue,
        description: '',
    },
};
/**
 * 模式管理器
 */
class ModeManager {
    constructor() {
        this.currentMode = ReplMode.Default;
        /** 知识库优先模式 */
        this._kbPriorityMode = false;
    }
    /**
     * 获取当前模式
     */
    get mode() {
        return this.currentMode;
    }
    /**
     * 获取知识库优先模式状态
     */
    get kbPriorityMode() {
        return this._kbPriorityMode;
    }
    /**
     * 切换知识库优先模式
     */
    toggleKbPriority() {
        this._kbPriorityMode = !this._kbPriorityMode;
    }
    /**
     * 设置模式
     */
    setMode(mode) {
        this.currentMode = mode;
    }
    /**
     * 切换到子命令模式
     */
    enterSubMode(mode) {
        if (mode === ReplMode.Default) {
            throw new Error('Cannot enter default mode as sub-mode');
        }
        this.currentMode = mode;
    }
    /**
     * 返回默认模式
     */
    backToDefault() {
        this.currentMode = ReplMode.Default;
    }
    /**
     * 获取当前模式信息
     */
    getModeInfo() {
        return MODE_CONFIG[this.currentMode];
    }
    /**
     * 获取指定模式信息
     */
    static getModeInfo(mode) {
        return MODE_CONFIG[mode];
    }
    /**
     * 获取所有可用模式
     */
    static getAllModes() {
        return Object.values(MODE_CONFIG);
    }
    /**
     * 获取提示符字符串
     */
    getPrompt() {
        const info = this.getModeInfo();
        const suffix = this._kbPriorityMode ? ' 📚' : '';
        if (this.currentMode === ReplMode.Default) {
            return info.promptColor(`ddo${suffix}> `);
        }
        return info.promptColor(`ddo/${info.name}${suffix}> `);
    }
    /**
     * 检查是否在子命令模式
     */
    isInSubMode() {
        return this.currentMode !== ReplMode.Default;
    }
    /**
     * 从字符串解析模式
     */
    static fromString(str) {
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
exports.ModeManager = ModeManager;
//# sourceMappingURL=mode.js.map