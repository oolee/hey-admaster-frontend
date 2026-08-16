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

export const AiAgentChannelProviderTypeLabel: Record<number, string> = {
  0: 'DashScope',
  1: 'OpenAI 兼容',
  2: 'Mock',
};

export const PricingRuleKindLabel: Record<number, string> = {
  0: '平台价',
  1: '渠道成本',
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

export interface AiAgentChannelDto {
  id: string;
  name: string;
  providerType: number;
  baseUrl?: null | string;
  enabled: boolean;
  priority: number;
  weight: number;
  timeoutSeconds: number;
  model: string;
  description?: null | string;
  hasApiKey: boolean;
  apiKeyMasked?: null | string;
  creationTime: string;
  lastModificationTime?: null | string;
}

export interface CreateUpdateAiAgentChannelDto {
  name: string;
  providerType: number;
  baseUrl: string;
  /** 明文 ApiKey，写入时加密；编辑留空表示不修改 */
  apiKey: string;
  model: string;
  enabled: boolean;
  priority: number;
  weight: number;
  timeoutSeconds: number;
  description: string;
}

export interface ProbedModelDto {
  modelName: string;
  displayName?: null | string;
  supportedSizes?: null | string;
}

export interface AiAgentChannelModelDto {
  id: string;
  channelId: string;
  modelName: string;
  displayName?: null | string;
  enabled: boolean;
  priority: number;
  weight: number;
  maxImagesPerRequest: number;
  supportedSizes?: null | string;
  sizeMode: number;
  disabledRequestParams: number;
  paramProfileJson?: null | string;
  defaultResponseFormat?: null | string;
  pricePerImage: number;
}

export interface AiAgentPricingRuleDto {
  id: string;
  capabilityId: string;
  kind: number;
  conditions: Record<string, string>;
  unitPrice: number;
  costFormula?: null | string;
  priority: number;
  enabled: boolean;
}

export interface CreateUpdateAiAgentPricingRuleDto {
  capabilityId: string;
  kind: number;
  conditions: Record<string, string>;
  unitPrice: number;
  costFormula: string;
  priority: number;
  enabled: boolean;
}

export interface UpdateAiAgentChannelModelDto {
  displayName: string;
  enabled: boolean;
  priority: number;
  weight: number;
  maxImagesPerRequest: number;
  supportedSizes: string;
  sizeMode: number;
  disabledRequestParams: number;
  paramProfileJson: string;
  defaultResponseFormat: string;
  pricePerImage: number;
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

  const getPricingRules = () =>
    request<ListResultDto<AiAgentPricingRuleDto>>(
      `${BASE_URL}/pricing-rules`,
      { method: 'GET' },
    );

  const createPricingRule = (input: CreateUpdateAiAgentPricingRuleDto) =>
    request<AiAgentPricingRuleDto>(`${BASE_URL}/pricing-rules`, {
      method: 'POST',
      data: input,
    });

  const updatePricingRule = (id: string, input: CreateUpdateAiAgentPricingRuleDto) =>
    request<AiAgentPricingRuleDto>(`${BASE_URL}/pricing-rules/${id}`, {
      method: 'PUT',
      data: input,
    });

  const deletePricingRule = (id: string) =>
    request<void>(`${BASE_URL}/pricing-rules/${id}`, { method: 'DELETE' });

  const getChannels = () =>
    request<ListResultDto<AiAgentChannelDto>>(`${BASE_URL}/channels`, {
      method: 'GET',
    });

  const createChannel = (input: CreateUpdateAiAgentChannelDto) =>
    request<AiAgentChannelDto>(`${BASE_URL}/channels`, {
      method: 'POST',
      data: input,
    });

  const updateChannel = (id: string, input: CreateUpdateAiAgentChannelDto) =>
    request<AiAgentChannelDto>(`${BASE_URL}/channels/${id}`, {
      method: 'PUT',
      data: input,
    });

  const deleteChannel = (id: string) =>
    request<void>(`${BASE_URL}/channels/${id}`, { method: 'DELETE' });

  const setChannelEnabled = (id: string, enabled: boolean) =>
    request<AiAgentChannelDto>(`${BASE_URL}/channels/${id}/enabled/${enabled}`, {
      method: 'PUT',
    });

  const probeChannel = (id: string) =>
    request<ListResultDto<ProbedModelDto>>(`${BASE_URL}/channels/${id}/probe`, {
      method: 'POST',
    });

  const getChannelModels = (channelId: string) =>
    request<ListResultDto<AiAgentChannelModelDto>>(
      `${BASE_URL}/channels/${channelId}/models`,
      { method: 'GET' },
    );

  const updateChannelModel = (id: string, input: UpdateAiAgentChannelModelDto) =>
    request<AiAgentChannelModelDto>(`${BASE_URL}/channels/models/${id}`, {
      method: 'PUT',
      data: input,
    });

  const deleteChannelModel = (id: string) =>
    request<void>(`${BASE_URL}/channels/models/${id}`, { method: 'DELETE' });

  const setChannelModelEnabled = (id: string, enabled: boolean) =>
    request<AiAgentChannelModelDto>(
      `${BASE_URL}/channels/models/${id}/enabled/${enabled}`,
      { method: 'PUT' },
    );

  return {
    getCapabilities,
    getModelBridges,
    getPlugins,
    getPricingRules,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    getChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    setChannelEnabled,
    probeChannel,
    getChannelModels,
    updateChannelModel,
    deleteChannelModel,
    setChannelModelEnabled,
  };
}
