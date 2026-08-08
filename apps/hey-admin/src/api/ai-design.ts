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
  DashScope = 1,
  NanoBanana = 2,
  Jimeng = 3,
  Mock = 100,
}

export const AiChannelProviderLabels: Record<number, string> = {
  [AiChannelProviderType.OpenAiCompatible]: 'OpenAI 兼容',
  [AiChannelProviderType.DashScope]: '阿里云百炼',
  [AiChannelProviderType.NanoBanana]: 'Nano Banana',
  [AiChannelProviderType.Jimeng]: '即梦',
  [AiChannelProviderType.Mock]: 'Mock',
};

export interface AiChannelModelDto {
  id: string;
  modelName: string;
  enabled: boolean;
  priority: number;
  weight: number;
  maxImagesPerRequest: number;
  supportedSizes?: null | string;
  pricePerImage: number;
}

export interface AiChannelDto {
  id: string;
  name: string;
  providerType: number;
  baseUrl?: null | string;
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
  enabled: boolean;
  priority: number;
  weight: number;
  maxImagesPerRequest: number;
  supportedSizes?: null | string;
  pricePerImage: number;
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
      data: enabled,
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
    getSessions,
    deleteSession,
    getWallets,
    rechargeWallet,
    getUsageRecords,
    getSettings,
    updateSettings,
  };
}
