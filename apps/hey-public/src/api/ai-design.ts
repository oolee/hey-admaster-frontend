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
    const data = response._data as
      | undefined
      | {
          error?: { code?: string; details?: string; message?: string };
          message?: string;
        };
    const abpError = data?.error;
    const message =
      abpError?.message || data?.message || `HTTP ${response.status}`;
    console.error(
      '[AiDesign API Error]',
      response.status,
      message,
      abpError?.details,
    );
    // 登录过期/未登录：清理本地会话并通知页面跳转登录
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new CustomEvent('ai-design:unauthorized'));
    }
    // 抛出友好错误信息（ABP 业务错误 message 已本地化，details 为开发期堆栈不展示）
    const err: Error & { abpCode?: string } = new Error(message);
    err.name = 'AbpBusinessError';
    if (abpError?.code) {
      err.abpCode = String(abpError.code);
    }
    throw err;
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
  /** 物理尺寸（宽，cm）——用于生产制作时等比例放样 */
  physicalWidth?: null | number;
  /** 物理尺寸（高，cm） */
  physicalHeight?: null | number;
  /** 输出 DPI（印刷常用 300） */
  dpi?: null | number;
  count: number;
  quality?: null | string;
  templateId?: null | string;
  templateInput?: null | Record<string, string>;
  /** 客户端幂等标识（重复提交自动去重） */
  clientRequestId?: null | string;
  /** 发送前由后台文本模型（如 DeepSeek）自动优化提示词（仅图片模型，需设置中心启用） */
  autoOptimize?: boolean | null;
  referenceImages?: AiReferenceImage[] | null;
  /** 编辑蒙版（局部修改）：透明区域为重绘区域，与 referenceImages 中的源图配合走 /images/edits */
  mask?: AiReferenceImage | null;
}

export interface AiGenerationResult {
  taskId: string;
  sessionId: string;
  messageId?: null | string;
  status: AiGenerationStatus;
  model: string;
  isMock: boolean;
  failReason?: null | string;
  /** 文本对话结果（文本模型返回，图片模型为空） */
  text?: null | string;
  /** 文本对话实际 token 用量（按 token 计费时返回） */
  totalTokens?: null | number;
  /** 单价，语义由模型计价单位决定（元/张、元/次、元/1M tokens） */
  unitPrice: number;
  /** 计价单位（0=元/张 1=元/次 2=元/1M tokens） */
  pricingUnit: number;
  /** 本次扣费（元），失败/取消退款后为 0 */
  chargedAmount: number;
  /** 扣费后钱包余额（元） */
  walletBalance?: null | number;
  images: AiImageAsset[];
}

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

export enum AiModelType {
  Image = 0,
  Text = 1,
}

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

export interface AiModelOption {
  name: string;
  displayName: string;
  providerType: number;
  isDefault: boolean;
  supportedSizes: string[];
  /** 所属渠道 Id（前端按渠道分组展示） */
  channelId: string;
  /** 所属渠道名称 */
  channelName: string;
  /** 渠道优先级（数字越小越优先） */
  channelPriority: number;
  /** 模型能力类型：图片生成 / 文本对话（决定动态菜单与返回格式） */
  modelType: number;
  /** 模型能力位（Flags）：Chat/ImageGeneration/ImageEditing/Vision 等 */
  capabilities: number;
  /** 计价单位（元/张、元/次、元/1M tokens） */
  pricingUnit: number;
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
/** signal 用于用户点击「停止」时中止进行中的请求（配合后端 RequestAborted 取消上游调用） */
export function generateAiImage(
  input: AiGenerationInput,
  signal?: AbortSignal,
): Promise<AiGenerationResult> {
  return aiDesignApi<AiGenerationResult>('/generation', {
    method: 'POST',
    body: input,
    signal,
  });
}

export function queryAiGenerationTask(
  taskId: string,
  signal?: AbortSignal,
): Promise<AiGenerationResult> {
  return aiDesignApi<AiGenerationResult>(`/generation/tasks/${taskId}`, {
    signal,
  });
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
  input: { description?: string; retentionDays?: number; title?: string },
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

/**
 * 图片二进制流地址。
 * 注意：&lt;img&gt; 无法携带 Authorization 头（query string 的 access_token 不会被
 * OpenIddict/ASP.NET Core 认证读取），因此后端 DTO 返回的是带 expires/sig 的短时签名 URL，
 * 这里仅透传；该函数仅用于兜底拼接（缺少签名时图片接口会拒绝，属正常安全行为）。
 */
export function withImageAuth(url: string): string {
  return url;
}

/** 图片二进制流地址（兜底；正常情况下请使用后端返回的 asset.url 签名地址） */
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
  pricingUnit: number;
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

// ── 提示词优化 ──
export interface AiPromptOptimizeInput {
  prompt: string;
  /** 已选设计风格（无则空） */
  styleName?: null | string;
  /** 已选配色（无则空） */
  paletteName?: null | string;
  /** 已确定的物理尺寸文本，如 300×150cm（无则空） */
  sizeText?: null | string;
}
export interface AiPromptOptimizeResult {
  optimizedPrompt: string;
  modelUsed?: null | string;
  /** 后端不可用/未启用优化时回退本地拼接 */
  isFallback: boolean;
}
export function optimizeAiPrompt(
  input: AiPromptOptimizeInput,
): Promise<AiPromptOptimizeResult> {
  return aiDesignApi<AiPromptOptimizeResult>('/prompts/optimize', {
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

// ═════════════ 品牌资产库（LOGO/品牌参考图）═════════════
export enum AiBrandAssetType {
  Logo = 0,
  Image = 1,
}

export interface AiBrandAsset {
  id: string;
  name: string;
  assetType: AiBrandAssetType;
  fileName: string;
  contentType?: null | string;
  fileSize: number;
  width: number;
  height: number;
  tags?: null | string;
  description?: null | string;
  creationTime: string;
  canUseAsReference: boolean;
  /** 短时签名二进制流地址（供 <img> 直接预览，过期自动失效） */
  contentUrl?: null | string;
}

export interface UploadBrandAssetInput {
  name: string;
  assetType: AiBrandAssetType;
  tags?: null | string;
  description?: null | string;
  /** 图片 base64（不含 data: 前缀） */
  dataBase64: string;
  contentType?: null | string;
  fileName?: null | string;
}

/** 我的品牌资产列表（分页，时间倒序） */
export function fetchMyBrandAssets(input?: {
  assetType?: AiBrandAssetType | null;
  keyword?: null | string;
  maxResultCount?: number;
  skipCount?: number;
}): Promise<AiPagedResult<AiBrandAsset>> {
  const params = new URLSearchParams();
  if (input?.assetType !== undefined && input?.assetType !== null) {
    params.set('assetType', String(input.assetType));
  }
  if (input?.keyword) params.set('keyword', input.keyword);
  params.set('skipCount', String(input?.skipCount ?? 0));
  params.set('maxResultCount', String(input?.maxResultCount ?? 50));
  return aiDesignApi<AiPagedResult<AiBrandAsset>>(
    `/brand-assets?${params.toString()}`,
  );
}

export function createBrandAsset(
  input: UploadBrandAssetInput,
): Promise<AiBrandAsset> {
  return aiDesignApi<AiBrandAsset>('/brand-assets', {
    method: 'POST',
    body: input,
  });
}

export function updateBrandAsset(
  id: string,
  input: {
    assetType: AiBrandAssetType;
    description?: null | string;
    name: string;
    tags?: null | string;
  },
): Promise<AiBrandAsset> {
  return aiDesignApi<AiBrandAsset>(`/brand-assets/${id}`, {
    method: 'PUT',
    body: input,
  });
}

export function deleteBrandAsset(id: string): Promise<void> {
  return aiDesignApi<void>(`/brand-assets/${id}`, { method: 'DELETE' });
}

/** 品牌资产图片地址（后端签发的短时签名 URL；asset.contentUrl 优先） */
export function brandAssetContentUrl(id: string): string {
  return `/api/ai-design/brand-assets/${id}/content-stream`;
}
/** 品牌资产图片二进制（bytes 为 base64 字符串），用于转 dataUrl 作为参考图 */
export interface AiBrandAssetContent {
  id: string;
  fileName: string;
  contentType: string;
  bytes: string;
  length: number;
}

export function fetchBrandAssetContent(
  id: string,
): Promise<AiBrandAssetContent> {
  return aiDesignApi<AiBrandAssetContent>(`/brand-assets/${id}/content`);
}
