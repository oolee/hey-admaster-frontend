/* =====================================================
   AI Agent 运行时 API（对齐 docs/architecture/AI-AGENT-DESIGN-v1.md）
   - 后端：/api/ai-agent/run + 3 个注册表只读接口（阶段 0 已实现）
   - 信封：ABP { code, message, result }，code === '0' 成功（根 AGENTS.md）
   - 枚举：ABP 默认序列化为数值（与后端 Domain.Shared 枚举顺序一致）
   ===================================================== */
import { request } from './request';

/* ---------- 后端 Domain.Shared 枚举（数值） ---------- */

export const CapabilityModality = {
  Text: 0,
  Image: 1,
  Audio: 2,
  Video: 3,
} as const;
export type CapabilityModality =
  (typeof CapabilityModality)[keyof typeof CapabilityModality];

export const AgentOutputKind = { Stream: 0, Task: 1 } as const;
export type AgentOutputKind =
  (typeof AgentOutputKind)[keyof typeof AgentOutputKind];

export const AgentQuantitySource = {
  Usage: 0,
  Count: 1,
  Duration: 2,
  Bytes: 3,
} as const;
export type AgentQuantitySource =
  (typeof AgentQuantitySource)[keyof typeof AgentQuantitySource];

export const AgentResultStatus = {
  Succeeded: 0,
  Failed: 1,
  Canceled: 2,
} as const;
export type AgentResultStatus =
  (typeof AgentResultStatus)[keyof typeof AgentResultStatus];

export const AgentArtifactKind = {
  Text: 0,
  Image: 1,
  Video: 2,
  Audio: 3,
  File: 4,
} as const;
export type AgentArtifactKind =
  (typeof AgentArtifactKind)[keyof typeof AgentArtifactKind];

export const AgentErrorCode = {
  ParamRequired: 0,
  ParamConflict: 1,
  CapabilityMismatch: 2,
  IntentUnknown: 3,
  InsufficientBalance: 4,
  ChannelUnavailable: 5,
  UpstreamRateLimit: 6,
  ContentBlocked: 7,
  TaskTimeout: 8,
} as const;
export type AgentErrorCode =
  (typeof AgentErrorCode)[keyof typeof AgentErrorCode];

export const AgentErrorCodeLabel: Record<number, string> = {
  [AgentErrorCode.ParamRequired]: '缺参数',
  [AgentErrorCode.ParamConflict]: '参数冲突',
  [AgentErrorCode.CapabilityMismatch]: '能力不匹配',
  [AgentErrorCode.IntentUnknown]: '意图无法识别',
  [AgentErrorCode.InsufficientBalance]: '余额不足',
  [AgentErrorCode.ChannelUnavailable]: '渠道不可用',
  [AgentErrorCode.UpstreamRateLimit]: '上游限流',
  [AgentErrorCode.ContentBlocked]: '内容不合规',
  [AgentErrorCode.TaskTimeout]: '任务超时',
};

/* ---------- 数据结构（对齐 Domain.Shared） ---------- */

export interface AgentArtifact {
  kind: AgentArtifactKind;
  uri: string;
  previewUri?: null | string;
  contentType: string;
  text?: null | string;
  resourceId?: null | string;
}

export interface AgentUsage {
  unitCode: string;
  quantity: number;
  chargedAmount: number;
  costAmount: number;
}

export interface CanonicalResult {
  status: AgentResultStatus;
  artifacts: AgentArtifact[];
  usage?: AgentUsage | null;
  errorCode?: AgentErrorCode | null;
}

export interface AgentEvent {
  type: string;
  message?: null | string;
  data?: unknown;
}

export interface AgentRunInput {
  message: string;
  capabilityId?: null | string;
  history: Array<{ content: string; role: string; }>;
  resourceRefs: string[];
  mask?: null | unknown;
  params: Record<string, unknown>;
  idempotencyKey: string;
}

export interface AgentRunResult {
  result?: CanonicalResult | null;
  events: AgentEvent[];
}

export interface ParamSpec {
  key: string;
  type: number;
  required: boolean;
  default?: unknown;
  options?: null | string[];
  userVisible: boolean;
  dependsOn?: null | string[];
  memory: 0 | 1; // Transient | Sticky
}

export interface CapabilityManifest {
  id: string;
  displayName: string;
  modality: CapabilityModality;
  outputKind: AgentOutputKind;
  pricingUnitCode: string;
  quantitySource: AgentQuantitySource;
  paramSchema: ParamSpec[];
  resourceHints: { supportsMask: boolean; supportsMultiImage: boolean };
  description: string;
  usageExample: string;
  slashCommand: string;
}

export interface ModelBridgeManifest {
  id: string;
  capabilityIds: string[];
  paramProfile: Record<string, unknown>;
  isAsync: boolean;
  supportsMask: boolean;
  pricing: unknown[];
  priority: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  dependsOn: string[];
  providesCapabilities: string[];
  servesModels: string[];
}

interface AbpEnvelope<T> {
  code?: string;
  message?: null | string;
  result?: T;
}

interface ListResult<T> {
  items: T[];
  totalCount: number;
}

/* ---------- 信封解包 ---------- */

async function unwrap<T>(
  url: string,
  options?: { body?: unknown; method?: 'GET' | 'POST'; },
): Promise<T> {
  const env = await request<AbpEnvelope<T>>(url, options);
  if (env.code && env.code !== '0') {
    throw new Error(env.message || '请求失败');
  }
  return env.result as T;
}

/* ---------- 运行时入口 ---------- */

export function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  return unwrap<AgentRunResult>('/ai-agent/run', {
    method: 'POST',
    body: input,
  });
}

export function fetchCapabilities(): Promise<ListResult<CapabilityManifest>> {
  return unwrap<ListResult<CapabilityManifest>>('/ai-agent/capabilities');
}

export function fetchModelBridges(): Promise<ListResult<ModelBridgeManifest>> {
  return unwrap<ListResult<ModelBridgeManifest>>('/ai-agent/model-bridges');
}

export function fetchPlugins(): Promise<ListResult<PluginManifest>> {
  return unwrap<ListResult<PluginManifest>>('/ai-agent/plugins');
}
