import { useRequest } from '@abp/request';

const BASE_URL = '/api/ai-agent';

// ---------- 枚举（数值，与后端 Domain.Shared 顺序一致） + 展示标签 ----------

export const CapabilityModalityLabel: Record<number, string> = {
  0: '文本',
  1: '图像',
  2: '音频',
  3: '视频',
};

export const AgentOutputKindLabel: Record<number, string> = {
  0: '流式',
  1: '异步任务',
};

export const AgentQuantitySourceLabel: Record<number, string> = {
  0: '用量回传',
  1: '件数',
  2: '时长',
  3: '字节',
};

// ---------- 类型（对齐后端 Domain.Shared） ----------

export interface ParamSpecDto {
  key: string;
  type: number;
  required: boolean;
  default?: unknown;
  options?: null | string[];
  userVisible: boolean;
  dependsOn?: null | string[];
  memory: 0 | 1;
}

export interface CapabilityManifestDto {
  id: string;
  displayName: string;
  modality: number;
  outputKind: number;
  pricingUnitCode: string;
  quantitySource: number;
  paramSchema: ParamSpecDto[];
  resourceHints: { supportsMask: boolean; supportsMultiImage: boolean };
}

export interface ModelBridgeManifestDto {
  id: string;
  capabilityIds: string[];
  paramProfile: Record<string, unknown>;
  isAsync: boolean;
  supportsMask: boolean;
  pricing: unknown[];
  priority: number;
}

export interface PluginManifestDto {
  id: string;
  name: string;
  version: string;
  dependsOn: string[];
  providesCapabilities: string[];
  servesModels: string[];
}

export interface ListResultDto<T> {
  items: T[];
  totalCount: number;
}

// ---------- API ----------

export function useAiAgentApi() {
  const { request } = useRequest();

  const getCapabilities = () =>
    request<ListResultDto<CapabilityManifestDto>>(`${BASE_URL}/capabilities`, {
      method: 'GET',
    });

  const getModelBridges = () =>
    request<ListResultDto<ModelBridgeManifestDto>>(
      `${BASE_URL}/model-bridges`,
      { method: 'GET' },
    );

  const getPlugins = () =>
    request<ListResultDto<PluginManifestDto>>(`${BASE_URL}/plugins`, {
      method: 'GET',
    });

  return { getCapabilities, getModelBridges, getPlugins };
}
