import type { PagedResultDto } from '@abp/core';

import { useRequest } from '@abp/request';

// ========== Permissions ==========

export const AiDesignPermissions = {
  Sessions: {
    Default: 'AiDesign.Sessions',
    Create: 'AiDesign.Sessions.Create',
    Edit: 'AiDesign.Sessions.Edit',
    Delete: 'AiDesign.Sessions.Delete',
  },
  Channels: {
    Default: 'AiDesign.Channels',
    Create: 'AiDesign.Channels.Create',
    Edit: 'AiDesign.Channels.Edit',
    Delete: 'AiDesign.Channels.Delete',
  },
  Billing: {
    Default: 'AiDesign.Billing',
    Manage: 'AiDesign.Billing.Manage',
  },
} as const;

// ========== Types ==========

export enum AiChannelProviderType {
  OpenAiCompatible = 0,
  DashScope = 10,
  NanoBanana = 20,
  Jimeng = 30,
  Mock = 100,
}

export const AiChannelProviderLabels: Record<number, string> = {
  [AiChannelProviderType.OpenAiCompatible]: 'OpenAI 兼容',
  [AiChannelProviderType.DashScope]: '阿里云百炼',
  [AiChannelProviderType.NanoBanana]: 'Nano Banana',
  [AiChannelProviderType.Jimeng]: '即梦',
  [AiChannelProviderType.Mock]: 'Mock',
};

export enum AiModelCapability {
  None = 0,
  Chat = 1,
  TextGeneration = 2,
  ImageGeneration = 4,
  ImageEditing = 8,
  Vision = 16,
  Audio = 32,
  Video = 64,
  Embedding = 128,
}

export const AiModelCapabilityLabels: Record<number, string> = {
  [AiModelCapability.Chat]: '对话',
  [AiModelCapability.TextGeneration]: '文本生成',
  [AiModelCapability.ImageGeneration]: '文生图',
  [AiModelCapability.ImageEditing]: '图生图',
  [AiModelCapability.Vision]: '视觉理解',
  [AiModelCapability.Audio]: '语音',
  [AiModelCapability.Video]: '视频',
  [AiModelCapability.Embedding]: '向量',
};

/** 能力位转 ModelType（兼容视图）：含图片能力→多模态，否则→非多模态 */
export function capabilitiesToModelType(capabilities: number): number {
  return capabilities &
    (AiModelCapability.ImageGeneration | AiModelCapability.ImageEditing)
    ? AiModelType.Image
    : AiModelType.Text;
}

/**
 * 请求参数能力位（Flags）：声明某参数在请求中「禁用」（渠道不支持则跳过发送）。
 * 与后端 AiRequestParam 对齐：如 apiyi gpt-image-2-vip 不接受 n/quality。
 */
export enum AiRequestParam {
  None = 0,
  Size = 1,
  Quality = 2,
  Count = 4,
  ResponseFormat = 8,
  Background = 16,
  Moderation = 32,
  OutputFormat = 64,
  OutputCompression = 128,
  PartialImages = 256,
  Style = 512,
  User = 1024,
  Stream = 2048,
  InputFidelity = 4096,
}

export const AiRequestParamLabels: Record<number, string> = {
  [AiRequestParam.Size]: '尺寸 size',
  [AiRequestParam.Quality]: '质量 quality',
  [AiRequestParam.Count]: '张数 n',
  [AiRequestParam.ResponseFormat]: '返回格式',
  [AiRequestParam.Background]: '背景',
  [AiRequestParam.Moderation]: '审核级别',
  [AiRequestParam.OutputFormat]: '输出格式',
  [AiRequestParam.OutputCompression]: '输出压缩',
  [AiRequestParam.PartialImages]: '流式部分图',
  [AiRequestParam.Style]: '风格',
  [AiRequestParam.User]: '用户标识',
  [AiRequestParam.Stream]: '流式',
  [AiRequestParam.InputFidelity]: '输入保真度',
};

/** 各请求参数用途说明（管理端 tooltip 展示） */
export const AiRequestParamDescriptions: Record<number, string> = {
  [AiRequestParam.Size]:
    '生成尺寸（比例/分辨率），如 1024x1024、1536x1024，渠道不支持任意尺寸时需禁用',
  [AiRequestParam.Quality]:
    '画质档位（low/medium/high/auto），影响清晰度与计费单价',
  [AiRequestParam.Count]:
    '单次生成张数 n，部分渠道（如 apiyi）不支持多张需禁用',
  [AiRequestParam.ResponseFormat]:
    '返回格式（url / b64_json），部分渠道固定返回 url 可禁用',
  [AiRequestParam.Background]:
    '背景设置（透明/纯色），gpt-image-1 系列专用参数',
  [AiRequestParam.Moderation]:
    '内容审核级别（low/medium/high），影响审核严格度',
  [AiRequestParam.OutputFormat]: '输出图片格式（png/jpeg/webp）',
  [AiRequestParam.OutputCompression]: '输出压缩比（图片体积 vs 画质权衡）',
  [AiRequestParam.PartialImages]: '流式返回部分图片（gpt-image-2 实验特性）',
  [AiRequestParam.Style]: '风格参数（vivid/natural 等），影响画面风格倾向',
  [AiRequestParam.User]: '用户标识 user 参数（透传用于审计/风控）',
  [AiRequestParam.Stream]: '流式响应（SSE），禁用后走一次性完整返回',
  [AiRequestParam.InputFidelity]:
    '输入保真度（local/remote），控制参考图与蒙版上传方式',
};

export const AiRequestParamOptions = Object.entries(AiRequestParamLabels).map(
  ([value, label]) => ({
    value: Number(value),
    label,
    description: AiRequestParamDescriptions[Number(value)] ?? '',
  }),
);
export enum AiModelType {
  Image = 0,
  Text = 1,
}

export const AiModelTypeLabels: Record<number, string> = {
  [AiModelType.Image]: '多模态',
  [AiModelType.Text]: '非多模态',
};

export enum AiPricingUnit {
  PerImage = 0,
  PerRequest = 1,
  Per1MTokens = 2,
}

export const AiPricingUnitLabels: Record<number, string> = {
  [AiPricingUnit.PerImage]: '元/张',
  [AiPricingUnit.PerRequest]: '元/次',
  [AiPricingUnit.Per1MTokens]: '元/1M tokens',
};

export interface AiChannelModelDto {
  id: string;
  modelName: string;
  /** 对外显示别名（null/空 时前台回退显示 ModelName） */
  displayName?: null | string;
  enabled: boolean;
  priority: number;
  weight: number;
  maxImagesPerRequest: number;
  supportedSizes?: null | string;
  pricePerImage: number;
  modelType: number;
  pricingUnit: number;
  capabilities: number;
  /** 禁用的请求参数位（Flags）：如 apiyi gpt-image-2-vip 不接受 n/quality；0=全部支持 */
  disabledRequestParams: number;
}

export interface AiChannelDto {
  id: string;
  name: string;
  providerType: number;
  baseUrl?: null | string;
  /** API Key 脱敏展示（前几位 + ****），后端不返回明文 */
  apiKeyMasked?: null | string;
  enabled: boolean;
  priority: number;
  weight: number;
  timeoutSeconds: number;
  maxRetryCount: number;
  description?: null | string;
  extraConfig?: null | string;
  lastSuccessTime?: null | string;
  lastFailTime?: null | string;
  lastError?: null | string;
  models: AiChannelModelDto[];
}

export interface CreateUpdateAiChannelModelDto {
  id?: string;
  modelName: string;
  /** 对外显示别名（null/空 时前台回退显示 ModelName） */
  displayName?: null | string;
  enabled: boolean;
  priority: number;
  weight: number;
  maxImagesPerRequest: number;
  supportedSizes?: null | string;
  pricePerImage: number;
  modelType: number;
  pricingUnit: number;
  capabilities: number;
  /** 禁用的请求参数位（Flags）：如 apiyi gpt-image-2-vip 不接受 n/quality；0=全部支持 */
  disabledRequestParams: number;
}

export interface CreateUpdateAiChannelDto {
  name: string;
  providerType: number;
  baseUrl?: null | string;
  /** 明文 API Key（仅写入时使用） */
  apiKey?: null | string;
  enabled: boolean;
  priority: number;
  weight: number;
  timeoutSeconds: number;
  maxRetryCount: number;
  description?: null | string;
  extraConfig?: null | string;
  models: CreateUpdateAiChannelModelDto[];
}

export interface AiDesignSessionAdminDto {
  id: string;
  title: string;
  description?: null | string;
  ownerType: number;
  userId?: null | string;
  userName?: null | string;
  lastActivityTime: string;
  retentionDays?: null | number;
  totalImageCount: number;
  creationTime: string;
  lastModificationTime?: null | string;
}

/** 会话消息（管理端详情：含生成任务留痕） */
export interface AiChatMessageAdminDto {
  id: string;
  role: number;
  messageType: number;
  content?: null | string;
  prompt?: null | string;
  optimizedPrompt?: null | string;
  modelUsed?: null | string;
  taskId?: null | string;
  errorMessage?: null | string;
  creationTime: string;
  generatedImageIds: string[];
  taskStatus?: null | number;
  durationMs?: null | number;
  totalTokens?: null | number;
  textResult?: null | string;
  chargedAmount?: null | number;
  requestPayloadJson?: null | string;
  responsePayloadJson?: null | string;
  externalImageUrls: string[];
  generatedImageUrls: string[];
}

/** 会话详情（管理端：含完整对话记录） */
export interface AiDesignSessionDetailDto extends AiDesignSessionAdminDto {
  messages: AiChatMessageAdminDto[];
}

/** 生成图片资源（管理端展示） */
export interface AiImageAssetDto {
  id: string;
  sessionId: string;
  taskId?: null | string;
  messageId?: null | string;
  fileName: string;
  contentType?: null | string;
  width?: null | number;
  height?: null | number;
  fileSize: number;
  status: number;
  url: string;
  creationTime: string;
}

/** 生成结果（重新落库等操作返回） */
export interface AiGenerationResultDto {
  taskId: string;
  sessionId: string;
  messageId?: null | string;
  status: number;
  model: string;
  isMock: boolean;
  failReason?: null | string;
  text?: null | string;
  totalTokens?: null | number;
  chargedAmount: number;
  unitPrice: number;
  pricingUnit: number;
  walletBalance?: null | number;
  prompt?: null | string;
  optimizedPrompt?: null | string;
  requestPayloadJson?: null | string;
  responsePayloadJson?: null | string;
  externalImageUrls: string[];
  images: AiImageAssetDto[];
}

/** 模板（管理端：含用户共享模板与共享者） */
export interface AiTemplateDto {
  id: string;
  templateId: string;
  name: string;
  category: string;
  icon?: null | string;
  description?: null | string;
  promptTemplate: string;
  promptHint?: null | string;
  recommendedModel?: null | string;
  defaultSize?: null | string;
  printSize?: null | string;
  isActive: boolean;
  sortOrder: number;
  /** 0=内置 1=用户共享 */
  source: number;
  ownerUserId?: null | string;
  ownerUserName?: null | string;
  coverImageId?: null | string;
  coverImageUrl?: null | string;
  usageCount: number;
  creationTime: string;
  lastModificationTime?: null | string;
}

export interface AiWalletDto {
  userId: string;
  userName?: null | string;
  balance: number;
  totalCharged: number;
  totalRefunded: number;
  unitPrice: number;
}

export enum AiUsageRecordStatus {
  Pending = 0,
  Charged = 10,
  Failed = 20,
}

export interface AiUsageRecordDto {
  id: string;
  userId: string;
  userName?: null | string;
  taskId: string;
  sessionId?: null | string;
  model: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  status: AiUsageRecordStatus;
  settledAt?: null | string;
  failReason?: null | string;
  creationTime: string;
}

export interface AiDesignSettingsDto {
  defaultRetentionDays: number;
  guestRetentionDays: number;
  editionRetentionDays?: null | string;
  maxImagesPerRequest: number;
  defaultModel?: null | string;
  enableMockProvider: boolean;
  defaultPricePerImage: number;
  containerName?: null | string;
  cleanupPeriodMinutes: number;
  cleanupBatchSize: number;
  gatewayBaseUrl?: null | string;
  gatewayApiKey?: null | string;
  gatewayApiKeyConfigured?: boolean;
  gatewayTimeoutSeconds: number;
  gatewayEnableSse: boolean;
  gatewayExternalBaseUrl?: null | string;
  promptOptimizationEnabled?: boolean | null;
  promptOptimizationModel?: null | string;
}

export interface UpdateAiDesignSettingsInput {
  defaultRetentionDays?: null | number;
  guestRetentionDays?: null | number;
  editionRetentionDays?: null | string;
  maxImagesPerRequest?: null | number;
  defaultModel?: null | string;
  enableMockProvider?: boolean | null;
  defaultPricePerImage?: null | number;
  containerName?: null | string;
  cleanupPeriodMinutes?: null | number;
  cleanupBatchSize?: null | number;
  gatewayBaseUrl?: null | string;
  gatewayApiKey?: null | string;
  gatewayTimeoutSeconds?: null | number;
  gatewayEnableSse?: boolean | null;
  gatewayExternalBaseUrl?: null | string;
  promptOptimizationEnabled?: boolean | null;
  promptOptimizationModel?: null | string;
}

export interface PagedInput {
  filter?: string;
  userId?: string;
  model?: string;
  status?: AiUsageRecordStatus | null;
  skipCount?: number;
  maxResultCount?: number;
}

// ========== API ==========

const BASE_URL = '/api/ai-design';

export function useAiDesignApi() {
  const { cancel, request } = useRequest();

  // ---------- 渠道 ----------
  const getChannels = () =>
    request<AiChannelDto[]>(`${BASE_URL}/channels`, { method: 'GET' });

  const getChannel = (id: string) =>
    request<AiChannelDto>(`${BASE_URL}/channels/${id}`, { method: 'GET' });

  const createChannel = (input: CreateUpdateAiChannelDto) =>
    request<AiChannelDto>(`${BASE_URL}/channels`, {
      data: input,
      method: 'POST',
    });

  const updateChannel = (id: string, input: CreateUpdateAiChannelDto) =>
    request<AiChannelDto>(`${BASE_URL}/channels/${id}`, {
      data: input,
      method: 'PUT',
    });

  const deleteChannel = (id: string) =>
    request(`${BASE_URL}/channels/${id}`, { method: 'DELETE' });

  const setChannelEnabled = (id: string, enabled: boolean) =>
    request<AiChannelDto>(`${BASE_URL}/channels/${id}/enabled`, {
      params: { enabled },
      method: 'POST',
    });

  /** 自动获取上游模型列表（OpenAI 兼容：GET {baseUrl}/models） */
  const fetchChannelModels = (input: {
    apiKey?: null | string;
    baseUrl?: null | string;
    providerType: number;
  }) =>
    request<string[]>(`${BASE_URL}/channels/fetch-models`, {
      data: input,
      method: 'POST',
    });

  // ---------- 会话（管理端） ----------
  const getSessions = (input: PagedInput) =>
    request<PagedResultDto<AiDesignSessionAdminDto>>(
      `${BASE_URL}/sessions/admin`,
      { method: 'GET', params: input },
    );

  const deleteSession = (id: string) =>
    request(`${BASE_URL}/sessions/${id}`, { method: 'DELETE' });

  /** 管理端：会话详情（含完整对话记录与生成任务留痕） */
  const getSessionDetail = (id: string) =>
    request<AiDesignSessionDetailDto>(`${BASE_URL}/sessions/${id}/admin-detail`, {
      method: 'GET',
    });

  /** 管理端：重新落库指定任务的图片（补偿首次落库失败） */
  const adminRetryPersistImages = (taskId: string) =>
    request<AiGenerationResultDto>(
      `${BASE_URL}/generation/tasks/${taskId}/admin-retry-persist`,
      { method: 'POST' },
    );

  // ---------- 模板（管理端） ----------
  const getTemplatesAdmin = () =>
    request<AiTemplateDto[]>(`${BASE_URL}/templates/admin`, {
      method: 'GET',
    });

  /** 管理端：将用户共享模板提升为系统内置模板 */
  const adminSetSystemTemplate = (id: string) =>
    request<AiTemplateDto>(`${BASE_URL}/templates/${id}/promote-system`, {
      method: 'POST',
    });

  const deleteTemplate = (id: string) =>
    request(`${BASE_URL}/templates/${id}`, { method: 'DELETE' });

  // ---------- 钱包 / 计费（管理端） ----------
  const getWallets = (input: PagedInput) =>
    request<PagedResultDto<AiWalletDto>>(`${BASE_URL}/billing/wallets`, {
      method: 'GET',
      params: input,
    });

  const rechargeWallet = (input: {
    amount: number;
    reason?: null | string;
    userId: string;
  }) =>
    request<AiWalletDto>(`${BASE_URL}/billing/wallet/recharge`, {
      data: input,
      method: 'POST',
    });

  const getUsageRecords = (input: PagedInput) =>
    request<PagedResultDto<AiUsageRecordDto>>(
      `${BASE_URL}/billing/usage-records/admin`,
      { method: 'GET', params: input },
    );

  // ---------- 模块设置 ----------
  const getSettings = () =>
    request<AiDesignSettingsDto>(`${BASE_URL}/settings`, { method: 'GET' });

  const updateSettings = (input: UpdateAiDesignSettingsInput) =>
    request<AiDesignSettingsDto>(`${BASE_URL}/settings`, {
      data: input,
      method: 'PUT',
    });

  return {
    cancel,
    getChannels,
    getChannel,
    createChannel,
    updateChannel,
    deleteChannel,
    setChannelEnabled,
    fetchChannelModels,
    getSessions,
    deleteSession,
    getSessionDetail,
    adminRetryPersistImages,
    getTemplatesAdmin,
    adminSetSystemTemplate,
    deleteTemplate,
    getWallets,
    rechargeWallet,
    getUsageRecords,
    getSettings,
    updateSettings,
  };
}
