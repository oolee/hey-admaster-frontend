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
  history: Array<{ content: string; role: string }>;
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
  type: number; // ParamType: String=0 Integer=1 Number=2 Boolean=3 Enum=4
  required: boolean;
  default?: unknown;
  options?: null | string[];
  userVisible: boolean;
  dependsOn?: null | string[];
  memory: 0 | 1; // Transient | Sticky
  /** 展示名（参数栏标签，§6 只增字段）。 */
  displayName?: null | string;
  /** 枚举项展示文案（key → 文案）。 */
  optionLabels?: null | Record<string, string>;
  /** JSON 约束（min/max/combo 等，前端即时校验）。 */
  constraints?: null | Record<string, unknown>;
  /** 是否影响产出内容（UI 强调）。 */
  affectsOutput?: boolean;
  /** 是否影响计费（UI 价格联动，§16.2）。 */
  affectsBilling?: boolean;
  /** 展示层级：Basic=0 进参数栏主行，Advanced=1 仅高级区。 */
  level?: number;
}

export const ArtifactActionTarget = {
  Generic: 0,
  Client: 1,
  Capability: 2,
} as const;
export type ArtifactActionTarget =
  (typeof ArtifactActionTarget)[keyof typeof ArtifactActionTarget];

export interface ArtifactActionDeclaration {
  kind: AgentArtifactKind;
  id: string;
  label: string;
  icon: string;
  target: ArtifactActionTarget;
  capabilityId?: null | string;
  needsResourceRef: boolean;
  order: number;
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
  artifactActions: ArtifactActionDeclaration[];
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

export interface PlatformPriceDto {
  id: string;
  capabilityId: string;
  kind: number;
  conditions: Record<string, string>;
  unitPrice: number;
  priority: number;
  enabled: boolean;
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
  options?: { body?: unknown; method?: 'GET' | 'POST' },
): Promise<T> {
  const env = await request<AbpEnvelope<T>>(url, options);
  if (env.code && env.code !== '0') {
    throw new Error(env.message || '请求失败');
  }
  return env.result as T;
}

/* ---------- 运行时入口 ---------- */

/** 平台价规则（§16.2 事前透明，用户侧明码标价；不含渠道成本） */
export function fetchPlatformPrices(): Promise<ListResult<PlatformPriceDto>> {
  return unwrap<ListResult<PlatformPriceDto>>(
    '/ai-agent/pricing-rules/platform',
  );
}

/* ---------- 工作流（§10 阶段 2 DAG） ---------- */

export interface WorkflowNodeInput {
  id: string;
  kind: string;
  capabilityId?: string;
  params?: Record<string, unknown>;
  prompt?: string;
  dependsOn?: string[];
}

export interface WorkflowDefinitionInput {
  id: string;
  displayName: string;
  version?: string;
  nodes: WorkflowNodeInput[];
}

export interface WorkflowRunResult {
  runId: string;
  status: number;
  checkpointToken?: string;
  events: AgentEvent[];
  context?: Record<string, unknown>;
}

/**
 * SSE 流式单能力执行（§10 阶段 2 真渐进式）：逐帧产出管线事件。
 * 事件 type 为枚举名字符串（IntentResolved/ModelSelected/…/Completed）；Completed 的 data = CanonicalResult。
 */
export async function* streamRunAgent(
  input: AgentRunInput,
): AsyncGenerator<AgentEvent> {
  const token = localStorage.getItem('hey19-v2-token') || '';
  const res = await fetch('/api/ai-agent/run/stream-single', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf('\n\n');
    while (idx >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (line) {
        try {
          yield JSON.parse(line.slice(5).trim()) as AgentEvent;
        } catch {
          /* 忽略坏帧 */
        }
      }
      idx = buffer.indexOf('\n\n');
    }
  }
}

/** 运行工作流（命名模板或内联 DAG）；checkpoint 返回续跑令牌（§12 R1） */
export function runWorkflow(input: {
  definition?: WorkflowDefinitionInput;
  idempotencyKey?: string;
  prompt?: string;
  workflowId?: string;
}): Promise<WorkflowRunResult> {
  return unwrap<WorkflowRunResult>('/ai-agent/workflows/run', {
    method: 'POST',
    body: input,
  });
}

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
