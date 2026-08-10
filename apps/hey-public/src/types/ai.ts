export interface GenerateRequest {
  prompt: string;
  size?: string;
  quality?: 'high' | 'low' | 'medium';
  n?: number;
  model?: 'auto' | 'mock' | 'openai' | 'tongyi';
  templateId?: string;
  templateInput?: Record<string, string>;
}

export interface GeneratedImage {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
  index?: number;
}

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  images: GeneratedImage[];
  createdAt: string;
}

export interface AdTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  promptTemplate: string;
  promptHint: string;
  recommendedModel: string;
  defaultSize: string;
  printSize: string;
  /** 后端模板主键 Id（用户共享模板，用于热度/删除等 API） */
  backendId?: null | string;
  /** 模板来源：0 内置 / 1 用户对话沉淀共享 */
  source?: number;
  /** 封面图地址（用户共享模板展示真实生成图封面） */
  coverImageUrl?: null | string;
  /** 被使用次数（热度） */
  usageCount?: number;
}

export interface GenerateResponse {
  success: boolean;
  data: GeneratedImage[];
  isMock?: boolean;
  model?: string;
  templateId?: string;
  taskId?: string;
  status?: string;
}
