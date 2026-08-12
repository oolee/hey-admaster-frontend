import type { Component } from 'vue';

import {
  Brush,
  HelpCircle,
  ImagePlus,
  LayoutTemplate,
  MessageCircle,
  PencilRuler,
  Presentation,
} from 'lucide-vue-next';

export type SkillId =
  | 'canvas'
  | 'chat'
  | 'image-edit'
  | 'image-gen'
  | 'ppt'
  | 'qa'
  | 'web';
export type ModelModality = 'any' | 'image' | 'multimodal' | 'text';

export interface SkillColor {
  hue: string;
  light: string;
}

/* 每个 skill 的专属视觉色（用于图标底色 / 标签 / 斜杠命令触发标识） */
export const SKILL_COLORS: Record<SkillId, SkillColor> = {
  chat: { hue: '#6c7a89', light: 'rgba(108,122,137,0.14)' }, // 中性灰蓝
  qa: { hue: '#3d7bd9', light: 'rgba(61,123,217,0.14)' }, // 学术蓝
  'image-gen': { hue: '#ff6b35', light: 'rgba(255,107,53,0.16)' }, // 珊瑚橘
  'image-edit': { hue: '#14b8a6', light: 'rgba(20,184,166,0.16)' }, // 薄荷青
  ppt: { hue: '#7c5cff', light: 'rgba(124,92,255,0.16)' }, // 靛紫
  web: { hue: '#10b981', light: 'rgba(16,185,129,0.16)' }, // 翡翠绿
  canvas: { hue: '#ec4899', light: 'rgba(236,72,153,0.16)' }, // 粉紫（实验）
};

/* 简写：把 skill 简码变成 /command 触发词 */
export const SKILL_SLASH: Record<SkillId, string> = {
  chat: '/chat',
  qa: '/ask',
  'image-gen': '/image',
  'image-edit': '/edit',
  ppt: '/ppt',
  web: '/web',
  canvas: '/canvas',
};

export interface SkillInfo {
  id: SkillId;
  name: string;
  slash: string;
  icon: Component;
  desc: string;
  capabilities: string[];
  defaultModel: string;
  costHint: string;
  validate: (input: Record<string, unknown>, model: ModelInfo) => null | string;
  experimental?: boolean;
}

export interface ModelInfo {
  id: string;
  label: string;
  vendor: string;
  modality: ModelModality;
  code: boolean;
  price: number;
  /** 计价单位（per-image / per-request / per-1m-tokens，服务端模型） */
  priceUnit?: string;
  /** 支持尺寸（服务端图片模型） */
  sizes?: string[];
  /** 是否前端合成项（Auto） */
  auto?: boolean;
}

/* =====================================================
   Skill 注册表
   ===================================================== */

export const SKILLS: SkillInfo[] = [
  {
    id: 'chat',
    name: '聊天',
    slash: SKILL_SLASH.chat,
    icon: MessageCircle,
    desc: '日常对话与创意头脑风暴',
    capabilities: ['text', 'streaming'],
    defaultModel: 'auto',
    costHint: '按 token 计费',
    validate: () => null,
  },
  {
    id: 'qa',
    name: '问答',
    slash: SKILL_SLASH.qa,
    icon: HelpCircle,
    desc: '专业知识问答与解释',
    capabilities: ['text', 'streaming'],
    defaultModel: 'auto',
    costHint: '按 token 计费',
    validate: () => null,
  },
  {
    id: 'image-gen',
    name: '文生图',
    slash: SKILL_SLASH['image-gen'],
    icon: ImagePlus,
    desc: '文字描述生成图片',
    capabilities: ['image', 'streaming'],
    defaultModel: 'auto',
    costHint: '按张数 × 尺寸计费',
    validate: (input, model) => {
      if (model.modality === 'text')
        return `「${model.label}」不是多模态模型，无法生图，请选择 Auto 或图像模型`;
      return null;
    },
  },
  {
    id: 'image-edit',
    name: '改图',
    slash: SKILL_SLASH['image-edit'],
    icon: PencilRuler,
    desc: '上传图片 + 描述修改',
    capabilities: ['image', 'multiImage', 'streaming'],
    defaultModel: 'auto',
    costHint: '按张数 × 尺寸计费',
    validate: (input, model) => {
      if (model.modality === 'text')
        return `「${model.label}」不支持改图，需要多模态模型`;
      if (model.modality === 'image')
        return `「${model.label}」是纯生成模型，不支持改图，请选 Auto`;
      if (!Array.isArray(input.attachments) || input.attachments.length === 0)
        return '改图需要至少上传一张图片';
      return null;
    },
  },
  {
    id: 'ppt',
    name: 'HTML 动效 PPT',
    slash: SKILL_SLASH.ppt,
    icon: Presentation,
    desc: '一句话生成可演示幻灯片',
    capabilities: ['code', 'streaming'],
    defaultModel: 'auto',
    costHint: '按页数计费',
    validate: (input, model) => {
      if (!model.code)
        return `「${model.label}」不擅长生成代码，请选择 Auto 或代码能力模型`;
      return null;
    },
  },
  {
    id: 'web',
    name: '网页制作',
    slash: SKILL_SLASH.web,
    icon: LayoutTemplate,
    desc: '生成单页网页（HTML+CSS）',
    capabilities: ['code', 'streaming'],
    defaultModel: 'auto',
    costHint: '按区块计费',
    validate: (input, model) => {
      if (!model.code)
        return `「${model.label}」不擅长生成代码，请选择 Auto 或代码能力模型`;
      return null;
    },
  },
  {
    id: 'canvas',
    name: '无限画布',
    slash: SKILL_SLASH.canvas,
    icon: Brush,
    desc: '节点工作流：多图/画册批量生成',
    capabilities: ['image', 'multiImage', 'workflow'],
    defaultModel: 'auto',
    costHint: '按节点生成总量计费',
    validate: () => null,
    experimental: true,
  },
];

export const MODELS: ModelInfo[] = [
  {
    id: 'auto',
    label: 'Auto · 自动匹配',
    vendor: 'Hey 19',
    modality: 'any',
    code: true,
    price: 0,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    vendor: 'OpenAI',
    modality: 'multimodal',
    code: true,
    price: 10,
  },
  {
    id: 'claude-3.5',
    label: 'Claude 3.5 Sonnet',
    vendor: 'Anthropic',
    modality: 'multimodal',
    code: true,
    price: 12,
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    vendor: 'Google',
    modality: 'multimodal',
    code: true,
    price: 9,
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    vendor: 'DeepSeek',
    modality: 'text',
    code: true,
    price: 2,
  },
  {
    id: 'midjourney-v6',
    label: 'Midjourney v6',
    vendor: 'Midjourney',
    modality: 'image',
    code: false,
    price: 25,
  },
  {
    id: 'sdxl',
    label: 'Stable Diffusion XL',
    vendor: 'Stability',
    modality: 'image',
    code: false,
    price: 8,
  },
  {
    id: 'dall-e-3',
    label: 'DALL·E 3',
    vendor: 'OpenAI',
    modality: 'image',
    code: false,
    price: 18,
  },
  {
    id: 'gpt-image-1',
    label: 'GPT-image-1',
    vendor: 'OpenAI',
    modality: 'image',
    code: false,
    price: 22,
  },
];

/**
 * 合并服务端模型目录（/api/llm/models）到本地模型清单：
 * 保留 Auto 合成项置顶，服务端模型按 id 去重追加，本地虚构兜底仅在服务端缺失时保留。
 * 渠道/价格由管理后台唯一维护，前端不再硬编码模型清单。
 */
export function applyServerModels(
  server: Array<{
    code: boolean;
    id: string;
    label: string;
    modalities?: string[];
    price: number;
    priceUnit?: string;
    sizes?: string[];
    vendor: string;
  }>,
): void {
  const mapped: ModelInfo[] = server.map((m) => ({
    id: m.id,
    label: m.label,
    vendor: m.vendor,
    modality: normalizeModality(m.modalities),
    code: m.code,
    price: m.price,
    priceUnit: m.priceUnit,
    sizes: m.sizes,
    auto: false,
  }));
  const serverIds = new Set(mapped.map((m) => m.id));
  const nextModels = [
    MODELS[0]?.id === 'auto' ? MODELS[0] : AUTO_MODEL,
    ...mapped,
    ...MODELS.filter(
      (m) => m.id !== 'auto' && !serverIds.has(m.id) && !m.sizes,
    ),
  ];
  MODELS.length = 0;
  MODELS.push(...nextModels);
}

function normalizeModality(modalities?: string[]): ModelModality {
  if (!modalities?.length) return 'any';
  if (modalities.includes('multimodal')) return 'multimodal';
  if (modalities.includes('image')) return 'image';
  return 'text';
}

const AUTO_MODEL: ModelInfo = {
  id: 'auto',
  label: 'Auto · 自动匹配',
  vendor: 'Hey 19',
  modality: 'any',
  code: true,
  price: 0,
  auto: true,
};

export function modelsForSkill(skillId: string): ModelInfo[] {
  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) return MODELS;
  if (
    skill.capabilities.includes('image') &&
    !skill.capabilities.includes('code')
  ) {
    return MODELS.filter(
      (m) =>
        m.modality === 'image' ||
        m.modality === 'multimodal' ||
        m.id === 'auto',
    );
  }
  if (skill.capabilities.includes('code')) {
    return MODELS.filter((m) => m.code || m.id === 'auto');
  }
  return MODELS;
}

export function validateSkillInput(
  skillId: string,
  model: string,
  input: Record<string, unknown> = {},
): null | string {
  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) return null;
  const m = MODELS.find((x) => x.id === model) || MODELS[0];
  if (!m) return null;
  if (m.id === 'auto') return null;
  return skill.validate(input, m);
}

export function skillBySlash(text: string): null | SkillInfo {
  const t = text.trim().split(/\s+/)[0];
  if (!t?.startsWith('/')) return null;
  const found = SKILLS.find((s) => s.slash === t);
  return found || null;
}
