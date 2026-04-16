/**
 * NLP Service
 * 与 llm-py 服务通信，提供意图识别和命令解析能力
 */

import chalk from 'chalk';
import logger from '../utils/logger';

/** NLP API 响应 - 意图识别 */
export interface NLPResponse {
  intent: string;
  confidence: number;
  entities: NLPEntity[];
  parameters: Record<string, unknown>;
  reply: string;
}

/** NLP 实体 */
export interface NLPEntity {
  type: string;
  value: string;
  start?: number;
  end?: number;
}

/** NLP API 响应 - 命令解析 */
export interface NLPParseResponse {
  command: string;
  arguments: Record<string, unknown>;
  is_ambiguous: boolean;
  suggestions: string[];
}

/** NLP Service 配置 */
interface NLPServiceConfig {
  /** llm-py 服务地址 */
  baseUrl: string;
  /** 请求超时（毫秒） */
  timeout: number;
}

/**
 * NLP Service 错误类
 */
export class NLPServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'NLPServiceError';
  }
}

/**
 * 创建 NLP Service
 */
export function createNLPService(config: NLPServiceConfig) {
  const { baseUrl, timeout } = config;

  /**
   * 发送 HTTP 请求
   */
  async function request<T>(path: string, body: unknown): Promise<T> {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      logger.debug(`[nlp] 请求 ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new NLPServiceError(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        throw new NLPServiceError(`请求超时 (${timeout}ms)`);
      }

      if (err instanceof NLPServiceError) {
        throw err;
      }

      throw new NLPServiceError(
        `NLP 服务请求失败: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
  }

  /**
   * 意图识别 - 分析文本并提取意图和实体
   */
  async function analyzeText(
    text: string,
    context?: Record<string, unknown>,
    model?: string
  ): Promise<NLPResponse> {
    const result = await request<NLPResponse>('/api/nlp', {
      text,
      context: context ?? null,
      model: model ?? null,
    });

    logger.debug(`[nlp] 意图识别结果: intent=${result.intent}, confidence=${result.confidence}`);

    return result;
  }

  /**
   * 命令解析 - 将自然语言命令解析为结构化命令
   */
  async function parseCommand(
    command: string,
    availableCommands: string[],
    model?: string
  ): Promise<NLPParseResponse> {
    const result = await request<NLPParseResponse>('/api/nlp/parse', {
      command,
      available_commands: availableCommands,
      model: model ?? null,
    });

    logger.debug(`[nlp] 命令解析结果: command=${result.command}, ambiguous=${result.is_ambiguous}`);

    return result;
  }

  /**
   * 检查 NLP 服务是否可用
   */
  async function isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return {
    analyzeText,
    parseCommand,
    isAvailable,
  };
}

/** 默认 NLP Service 实例（延迟初始化） */
let defaultService: ReturnType<typeof createNLPService> | null = null;

/**
 * 获取默认 NLP Service
 * 使用默认配置：http://localhost:8000, 10秒超时
 */
export function getNLPService(): ReturnType<typeof createNLPService> {
  if (!defaultService) {
    defaultService = createNLPService({
      baseUrl: process.env.DDO_LLM_PY_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.DDO_NLP_TIMEOUT || '10000', 10),
    });
  }
  return defaultService;
}

/**
 * 重置默认 NLP Service（用于测试或配置变更）
 */
export function resetNLPService(): void {
  defaultService = null;
}
