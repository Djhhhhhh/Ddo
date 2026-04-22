/**
 * NLP Service
 * 通过 server-go 代理调用 llm-py 的 NLP 意图识别能力
 * 注意：不使用超时限制，因为 LLM 推理时间不可预知
 */

import logger from '../utils/logger';
import { loadDdoConfigSync } from '../utils/config';
import { resolveDataDir } from '../utils/paths';

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
  /** server-go 服务地址（NLP 代理端点） */
  baseUrl: string;
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
 * 不使用超时限制，因为 LLM 推理时间不可预知
 */
export function createNLPService(config: NLPServiceConfig) {
  const { baseUrl } = config;

  /**
   * 发送 HTTP 请求（无超时限制）
   */
  async function request<T>(path: string, body: unknown): Promise<T> {
    const url = `${baseUrl}${path}`;

    logger.debug(`[nlp] 请求 ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new NLPServiceError(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as T;
  }

  /**
   * 意图识别 - 分析文本并提取意图和实体
   * 调用 server-go /api/v1/chat/nlp（server-go 再代理到 llm-py）
   */
  async function analyzeText(
    text: string,
    context?: Record<string, unknown>,
    model?: string
  ): Promise<NLPResponse> {
    const result = await request<NLPResponse>('/api/v1/chat/nlp', {
      text,
      context: context ?? null,
      model: model ?? null,
    });

    logger.debug(`[nlp] 意图识别结果: intent=${result.intent}, confidence=${result.confidence}`);

    return result;
  }

  /**
   * 命令解析 - 将自然语言命令解析为结构化命令
   * 调用 server-go /api/v1/chat/nlp（server-go 再代理到 llm-py）
   */
  async function parseCommand(
    command: string,
    availableCommands: string[],
    model?: string
  ): Promise<NLPParseResponse> {
    const result = await request<NLPParseResponse>('/api/v1/chat/nlp', {
      text: command,
      context: {
        mode: 'parse',
        available_commands: availableCommands,
      },
      model: model ?? null,
    });

    logger.debug(`[nlp] 命令解析结果: command=${result.command}, ambiguous=${result.is_ambiguous}`);

    return result;
  }

  /**
   * 检查 NLP 服务是否可用
   * 通过 server-go 健康检查判断（使用短超时，只检测连接性）
   */
  async function isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`, {
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
 * 使用默认配置：http://localhost:8080（server-go 地址）
 */
export function getNLPService(): ReturnType<typeof createNLPService> {
  if (!defaultService) {
    const dataDir = resolveDataDir({
      envDataDir: process.env.DDO_DATA_DIR,
    });
    defaultService = createNLPService({
      baseUrl: process.env.DDO_SERVER_GO_URL || loadDdoConfigSync(dataDir).endpoints.serverGo,
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
