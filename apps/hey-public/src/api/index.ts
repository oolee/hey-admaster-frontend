import type { ApiResponse } from '@/types/canvas';

import { request } from './request';

const params = (q?: Record<string, unknown>): string => {
  const s = new URLSearchParams();
  Object.entries(q || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.append(k, String(v));
  });
  const qs = s.toString();
  return qs ? `?${qs}` : '';
};

/* ---------- 站点数据结构 ---------- */

export interface V2Case {
  id: number;
  title: string;
  category: string;
  industry: string;
  description: string;
  views: number;
  likes: number;
  gradient: string;
  tags: string[];
  date: string;
  client: string;
  result: string;
  gallery?: { id: number; label: string }[];
  metrics?: { label: string; value: string }[];
}

export interface V2Template {
  id: string;
  name: string;
  desc: string;
  cat: string;
  ratio: string;
  hot: boolean;
}

export interface V2Stat {
  value: string;
  label: string;
  suffix: string;
}

export interface V2Plan {
  id: string;
  name: string;
  price: null | number;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  featured: boolean;
}

export interface V2Addon {
  id: string;
  name: string;
  price: string;
  desc: string;
}

export interface V2Faq {
  q: string;
  a: string;
}

export interface V2Team {
  id: number;
  name: string;
  role: string;
  bio: string;
  gradient: string;
}

export interface V2Tool {
  id: string;
  name: string;
  desc: string;
  icon: string;
  badge: string;
}

export interface V2Lab {
  id: string;
  name: string;
  status: string;
  desc: string;
  progress: number;
}

export interface V2Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: string;
}

export interface V2Order {
  id: string;
  name: string;
  amount: number;
  status: string;
  date: string;
  type: string;
}

export interface V2Favorite {
  id: string;
  name: string;
  type: string;
  gradient: string;
}

export interface V2UsageChart {
  label: string;
  value: number;
}

export interface V2Usage {
  total: number;
  month: number;
  monthLimit: number;
  charts: V2UsageChart[];
}

export interface V2HomeData {
  stats: V2Stat[];
  cases: V2Case[];
  templates: V2Template[];
}

export interface V2AboutData {
  team: V2Team[];
  stats: V2Stat[];
}

export interface V2ProfileData {
  notifications: V2Notification[];
  orders: V2Order[];
  favorites: V2Favorite[];
  usage: null | V2Usage;
}

export interface V2Conversation {
  id: string;
  title: string;
  time: string;
  type: string;
  active: boolean;
  preview: string;
  pinned?: boolean;
  task?: string;
  model?: string;
}

export interface V2ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  image?: string;
  actions?: string[];
  task?: string;
  model?: string;
  cost?: number;
  streaming?: boolean;
  artifact?: {
    html?: string;
    images?: Array<{ seed?: number; url: string }>;
    label?: string;
    pages?: number;
    type: string;
  };
  attachments?: { name: string; note: string }[];
}

export interface V2AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan?: string;
  credits?: number;
  level?: string;
  balance?: number;
}

export interface V2AuthResult {
  token: string;
  user: V2AuthUser;
}

/* ---------- 案例 ---------- */
export const fetchCases = (p?: Record<string, unknown>) =>
  request<ApiResponse<{ list: V2Case[]; total: number; totalPages: number }>>(
    `/cases${params(p)}`,
  );
export const fetchCaseDetail = (id: string | string[]) =>
  request<ApiResponse<V2Case>>(`/cases/${id}`);

/* ---------- 模板 ---------- */
export const fetchTemplates = (p?: Record<string, unknown>) =>
  request<ApiResponse<{ list: V2Template[]; total: number }>>(
    `/templates${params(p)}`,
  );

/* ---------- 定价 / FAQ ---------- */
export const fetchPlans = () =>
  request<ApiResponse<{ addons: V2Addon[]; faqs: V2Faq[]; plans: V2Plan[] }>>(
    '/plans',
  );

/* ---------- 首页 ---------- */
export const fetchHomeData = () => request<ApiResponse<V2HomeData>>('/home');

/* ---------- 关于 ---------- */
export const fetchAboutData = () => request<ApiResponse<V2AboutData>>('/about');

/* ---------- 工具箱 / 实验室 ---------- */
export const fetchTools = () =>
  request<ApiResponse<{ list: V2Tool[] }>>('/tools');
export const fetchLabs = () => request<ApiResponse<{ list: V2Lab[] }>>('/labs');

/* ---------- 认证（mock 网关） ---------- */
export const mockLogin = (payload: Record<string, unknown>) =>
  request<ApiResponse<V2AuthResult>>('/auth/login', {
    method: 'POST',
    body: payload,
  });

export const mockRegister = (payload: Record<string, unknown>) =>
  request<ApiResponse<V2AuthResult>>('/auth/register', {
    method: 'POST',
    body: payload,
  });

export const mockGetUser = () => request<ApiResponse<V2AuthUser>>('/auth/me'); // token 自动走 Authorization 头

/* ---------- 工作台 ---------- */
export const fetchConversations = () =>
  request<ApiResponse<{ list: V2Conversation[] }>>('/conversations');
export const fetchChatMessages = (conversationId: string) =>
  request<ApiResponse<{ list: V2ChatMessage[] }>>(
    `/conversations/${conversationId}/messages`,
  );
export const createConversation = (payload: {
  model?: string;
  task?: string;
  title?: string;
}) =>
  request<ApiResponse<V2Conversation>>('/conversations', {
    method: 'POST',
    body: payload,
  });
export const renameConversation = (id: string, title: string) =>
  request<ApiResponse<boolean>>(`/conversations/${id}`, {
    method: 'PATCH',
    body: { title },
  });
export const deleteConversation = (id: string) =>
  request<ApiResponse<boolean>>(`/conversations/${id}`, {
    method: 'DELETE',
  });

/* ---------- 会话消息落库（ai-agent run 结果写入，刷新后历史可见） ---------- */
export interface V2AppendArtifactImage {
  url: string;
  previewUrl?: string;
}

export interface V2AppendArtifact {
  type: string;
  label?: string;
  images?: V2AppendArtifactImage[];
}

export const appendConversationMessage = (
  conversationId: string,
  payload: {
    artifact?: V2AppendArtifact;
    content: string;
    model?: string;
    role: 'ai' | 'user';
    task?: string;
  },
) =>
  request<ApiResponse<V2ChatMessage>>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: payload,
    },
  );

/* ---------- 工作台：模型目录 / 统一生成 / 图片资产 ---------- */
export interface V2ModelInfo {
  id: string;
  label: string;
  vendor: string;
  modalities: string[];
  code: boolean;
  price: number;
  priceUnit: string;
  sizes?: string[];
  auto?: boolean;
}

export interface V2LlmAttachmentInput {
  url: string;
  note?: string;
}

export interface V2LlmGenerateParams {
  size?: string;
  sizeTier?: string;
  quality?: string;
  n?: number;
  temperature?: number;
  system?: string;
  pages?: number;
}

export interface V2LlmGenerateInput {
  sessionId?: string;
  title?: string;
  skill: string;
  model?: string;
  prompt: string;
  attachments?: V2LlmAttachmentInput[];
  params?: V2LlmGenerateParams;
}

export interface V2LlmArtifact {
  type: string;
  html?: string;
  label?: string;
  pages?: number;
}

export interface V2LlmGenerateOutput {
  sessionId: string;
  messageId: string;
  model: string;
  type: 'image' | 'ppt' | 'text' | 'web';
  text?: string;
  images?: Array<{ seed: number; url: string }>;
  artifact?: V2LlmArtifact;
  usage?: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  };
  cost?: number;
  mock?: boolean;
  error?: string;
}

export const fetchModels = () =>
  request<ApiResponse<{ models: V2ModelInfo[] }>>('/llm/models');
export const llmGenerate = (payload: V2LlmGenerateInput, timeoutMs = 180_000) =>
  request<ApiResponse<V2LlmGenerateOutput>>('/llm/generate', {
    method: 'POST',
    body: payload,
    timeoutMs,
  });

/* ---------- 个人中心 ---------- */
export const fetchProfileData = () =>
  request<ApiResponse<V2ProfileData>>('/profile');
