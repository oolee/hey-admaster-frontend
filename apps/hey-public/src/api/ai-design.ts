/**
 * AI 设计后端 API 客户端
 * 对接 Hey.AdMaster.AiDesign 模块（ABP 后端，vite 代理 /api → https://localhost:7188）
 * 路由前缀：/api/ai-design/*
 */
import { ofetch } from 'ofetch';

export const aiDesignApi = ofetch.create({
  baseURL: '/api/ai-design',
  timeout: 120_000, // 异步生图可能耗时较长
  onRequest({ options }) {
    // 生成/会话等接口要求登录：自动携带 Bearer Token
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    options.headers = headers;
  },
  onResponse({ response }) {
    // 解包 ABP 标准响应 { code, message, details, result }
    const data = response._data;
    if (
      data &&
      typeof data === 'object' &&
      'result' in data &&
      'code' in data
    ) {
      // 业务错误：HTTP 200 但 code != '0'，必须抛出而不是吞掉
      const code = data.code;
      if (code !== '0' && code !== 0) {
        const err: Error & { abpCode?: string } = new Error(
          data.message || '请求失败',
        );
        err.name = 'AbpBusinessError';
        err.abpCode = String(code);
        throw err;
      }
      response._data = data.result;
    }
  },
  onResponseError({ response }) {
    const data = response._data;
    const message = data?.message || `HTTP ${response.status}`;
    console.error('[AiDesign API Error]', response.status, message);
    // 登录过期/未登录：清理本地会话并通知页面跳转登录
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new CustomEvent('ai-design:unauthorized'));
    }
  },
});

// ── 枚举（与后端 AiDesign Domain.Shared 保持一致）──
export enum AiGenerationStatus {
  Pending = 0,
  Processing = 10,
  Succeeded = 20,
  Failed = 30,
  Canceled = 40,
}

export enum AiMessageRole {
  User = 0,
  Assistant = 1,
  System = 2,
}

export enum AiMessageType {
  Text = 0,
  Image = 10,
  System = 20,
}

export enum AiImageStatus {
  Active = 0,
  Expired = 10,
  Deleted = 20,
}

// ── DTO ──
export interface AiImageAsset {
  id: string;
  sessionId: string;
  taskId?: null | string;
  messageId?: null | string;
  fileName: string;
  contentType?: null | string;
  width: number;
  height: number;
  fileSize: number;
  status: AiImageStatus;
  expireTime?: null | string;
  retentionSource: number;
  revisedPrompt?: null | string;
  creationTime: string;
  /** 访问路径（相对站点根，如 /api/ai-design/images/{id}/content） */
  url: string;
}

export interface AiChatMessage {
  id: string;
  role: AiMessageRole;
  messageType: AiMessageType;
  content?: null | string;
  prompt?: null | string;
  optimizedPrompt?: null | string;
  modelUsed?: null | string;
  taskId?: null | string;
  errorMessage?: null | string;
  creationTime: string;
  generatedImageIds: string[];
}

export interface AiDesignSession {
  id: string;
  title: string;
  description?: null | string;
  ownerType: number;
  lastActivityTime: string;
  retentionDays?: null | number;
  totalImageCount: number;
  creationTime: string;
  lastModificationTime?: null | string;
  messages: AiChatMessage[];
  images: AiImageAsset[];
}

export interface AiReferenceImage {
  fileName?: null | string;
  contentType?: null | string;
  /** Base64 编码图片数据（不含 data: 前缀） */
  dataBase64: string;
  tag?: null | string;
}

export interface AiGenerationInput {
  sessionId?: null | string;
  prompt: string;
  optimizedPrompt?: null | string;
  /** 模型名称（缺省用系统默认模型） */
  model?: null | string;
  /** 尺寸，如 1024x1024 */
  size?: null | string;
  count: number;
  quality?: null | string;
  templateId?: null | string;
  templateInput?: null | Record<string, string>;
  /** 客户端幂等标识（重复提交自动去重） */
  clientRequestId?: null | string;
  referenceImages?: AiReferenceImage[] | null;
}

export interface AiGenerationResult {
  taskId: string;
  sessionId: string;
  messageId?: null | string;
  status: AiGenerationStatus;
  model: string;
  isMock: boolean;
  failReason?: null | string;
  /** 单价（元/张） */
  unitPrice: number;
  /** 本次扣费（元），失败/取消退款后为 0 */
  chargedAmount: number;
  /** 扣费后钱包余额（元） */
  walletBalance?: null | number;
  images: AiImageAsset[];
}

export interface AiModelOption {
  name: string;
  displayName: string;
  providerType: number;
  isDefault: boolean;
  supportedSizes: string[];
}

export interface AiTemplate {
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
}

// ── 生图 ──
export function generateAiImage(
  input: AiGenerationInput,
): Promise<AiGenerationResult> {
  return aiDesignApi<AiGenerationResult>('/generation', {
    method: 'POST',
    body: input,
  });
}

export function queryAiGenerationTask(
  taskId: string,
): Promise<AiGenerationResult> {
  return aiDesignApi<AiGenerationResult>(`/generation/tasks/${taskId}`);
}

export function cancelAiGenerationTask(
  taskId: string,
): Promise<AiGenerationResult> {
  return aiDesignApi<AiGenerationResult>(`/generation/tasks/${taskId}/cancel`, {
    method: 'POST',
  });
}

// ── 会话 ──
export function fetchAiSessions(): Promise<AiDesignSession[]> {
  return aiDesignApi<AiDesignSession[]>('/sessions');
}

export function createAiSession(input?: {
  description?: string;
  retentionDays?: number;
  title?: string;
}): Promise<AiDesignSession> {
  return aiDesignApi<AiDesignSession>('/sessions', {
    method: 'POST',
    body: input ?? {},
  });
}

export function fetchAiSession(id: string): Promise<AiDesignSession> {
  return aiDesignApi<AiDesignSession>(`/sessions/${id}`);
}

export function updateAiSession(
  id: string,
  input: { description?: string; retentionDays?: number; title?: string; },
): Promise<AiDesignSession> {
  return aiDesignApi<AiDesignSession>(`/sessions/${id}`, {
    method: 'PUT',
    body: input,
  });
}

export function deleteAiSession(id: string): Promise<void> {
  return aiDesignApi<void>(`/sessions/${id}`, { method: 'DELETE' });
}

// ── 模板 / 模型选项 ──
export function fetchAiTemplates(): Promise<AiTemplate[]> {
  return aiDesignApi<AiTemplate[]>('/templates');
}

export function fetchAiModelOptions(): Promise<AiModelOption[]> {
  return aiDesignApi<AiModelOption[]>('/channels/models');
}

// ── 图片 ──
/** 图片二进制流地址（供 <img> 直接引用） */
export function aiImageUrl(id: string): string {
  return `/api/ai-design/images/${id}/content`;
}

// ── 计费 / 钱包 ──
export interface AiWallet {
  /** 当前余额（元） */
  balance: number;
  /** 累计扣费（元） */
  totalCharged: number;
  /** 累计退款（元） */
  totalRefunded: number;
  /** 当前模型单价（元/张） */
  unitPrice: number;
}

export interface AiUsageRecord {
  id: string;
  taskId: string;
  sessionId?: null | string;
  model: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  status: number;
  settledAt?: null | string;
  failReason?: null | string;
  creationTime: string;
}

export interface AiRechargeRecord {
  id: string;
  orderNo: string;
  amount: number;
  creditedAmount: number;
  paymentMethod: number; // 1微信 2支付宝 99后台
  paymentMethodLabel?: null | string;
  status: number; // 0待支付 10已支付 20已取消 30失败
  statusLabel?: null | string;
  thirdPartyOrderNo?: null | string;
  paidAt?: null | string;
  remark?: null | string;
  errorMessage?: null | string;
  creationTime: string;
}

export interface AiRechargeOrderResult {
  orderNo: string;
  amount: number;
  payContent: string;
  paymentMethod: number;
  expireSeconds: number;
  isDemoMode: boolean;
}

export interface AiPagedResult<T> {
  totalCount: number;
  items: T[];
}

/** 获取我的钱包（余额/累计消费/单价） */
export function fetchMyWallet(): Promise<AiWallet> {
  return aiDesignApi<AiWallet>('/billing/wallet');
}

/** 获取我的计费流水（分页，时间倒序） */
export function fetchMyUsageRecords(
  skipCount = 0,
  maxResultCount = 20,
): Promise<AiPagedResult<AiUsageRecord>> {
  return aiDesignApi<AiPagedResult<AiUsageRecord>>(
    `/billing/usage-records?skipCount=${skipCount}&maxResultCount=${maxResultCount}`,
  );
}
/** 管理员给指定用户充值/赠送余额（需要 Billing.Manage 权限） */
export function rechargeWallet(input: {
  amount: number;
  reason?: null | string;
  userId: string;
}): Promise<AiWallet> {
  return aiDesignApi<AiWallet>('/billing/wallet/recharge', {
    method: 'POST',
    body: input,
  });
}

// ═════════ 用户端：充值订单 ═════════
/** 创建充值订单（返回二维码/跳转链接） */
export function createRechargeOrder(input: {
  amount: number;
  paymentMethod: 1 | 2; // 1微信 2支付宝
  remark?: null | string;
}): Promise<AiRechargeOrderResult> {
  return aiDesignApi<AiRechargeOrderResult>('/billing/recharge/create-order', {
    method: 'POST',
    body: input,
  });
}

/** 获取我的充值记录（时间倒序分页） */
export function fetchMyRechargeRecords(
  skipCount = 0,
  maxResultCount = 20,
): Promise<AiPagedResult<AiRechargeRecord>> {
  return aiDesignApi<AiPagedResult<AiRechargeRecord>>(
    `/billing/recharge/records?skipCount=${skipCount}&maxResultCount=${maxResultCount}`,
  );
}

/** 查询订单状态 */
export function queryRechargeOrder(orderNo: string): Promise<AiRechargeRecord> {
  return aiDesignApi<AiRechargeRecord>(`/billing/recharge/orders/${orderNo}`);
}

/** 演示模式：模拟支付完成订单 */
export function demoMarkRechargePaid(
  orderNo: string,
): Promise<AiRechargeRecord> {
  return aiDesignApi<AiRechargeRecord>(
    `/billing/recharge/orders/${orderNo}/demo-pay`,
    {
      method: 'POST',
    },
  );
}
