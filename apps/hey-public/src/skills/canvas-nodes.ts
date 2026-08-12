import type { Component } from 'vue';

import {
  BookOpen,
  Boxes,
  Calculator,
  ClipboardList,
  Columns2,
  Combine,
  FileText,
  Film,
  Image as ImageIcon,
  ImagePlus,
  ListChecks,
  Maximize2,
  MessageCircle,
  Move,
  PackageOpen,
  Palette,
  Scissors,
  Share2,
  Sparkles,
  StickyNote,
  Type,
  Undo2,
  Wand,
  Wand2,
} from 'lucide-vue-next';

/* =====================================================
   节点分类与目录（商业业务分组）
   ===================================================== */

export type NodeCategoryId = 'ai-gen' | 'image-process' | 'optional' | 'output';
export type PortType = 'any' | 'image' | 'text' | 'video';
export type LlmRequired = 'no' | 'optional' | 'yes';
export type LlmType = 'multimodal' | 'text';

export interface NodeCategory {
  id: NodeCategoryId;
  label: string;
  order: number;
  desc: string;
}

export const NODE_CATEGORIES: NodeCategory[] = [
  { id: 'ai-gen', label: '🟣 智能生成', order: 1, desc: '必须大模型参与' },
  {
    id: 'image-process',
    label: '⚪ 快捷工具',
    order: 2,
    desc: '无需大模型 · 确定性处理',
  },
  { id: 'optional', label: '🟡 可切换', order: 3, desc: 'AI 或规则二选一' },
  { id: 'output', label: '输出', order: 4, desc: '分享 · 交付' },
];

/* =====================================================
   节点注册表
   - accepts:  此节点接受的上游端口类型数组（空=无输入）
   - produces: 此节点输出的类型（'text' | 'image' | 'video' | 'any' | null=终点）
   - llmRequired: 'yes'(必须大模型) | 'no'(不需要) | 'optional'(可二选一)
   - llmType:  'text'(默认文本/聊天) | 'multimodal'(多模态) — 决定推荐模型
   - params:   默认参数（节点面板渲染控件）
   ===================================================== */

export interface CanvasNodeMeta {
  id: string;
  category: NodeCategoryId;
  label: string;
  color: string;
  icon: Component;
  description: string;
  inputs: number;
  outputs: number;
  accepts: PortType[];
  produces: null | PortType;
  llmRequired: LlmRequired;
  llmType?: LlmType;
  params: Record<string, unknown>;
  w: number;
  h: number;
}

export const CANVAS_NODES: CanvasNodeMeta[] = [
  /* ===== 输入节点（无需大模型）===== */
  {
    id: 'text-input',
    category: 'image-process',
    label: '文本输入',
    color: '#6c7a89',
    icon: Type,
    description: '手动输入一段文字（需求记录）',
    inputs: 0,
    outputs: 1,
    accepts: [],
    produces: 'text',
    llmRequired: 'no',
    params: { text: '', placeholder: '在此输入文本…', label: '文本' },
    w: 240,
    h: 140,
  },
  {
    id: 'image-input',
    category: 'image-process',
    label: '图片输入',
    color: '#14b8a6',
    icon: ImageIcon,
    description: '上传或粘贴一张图片（参考图）',
    inputs: 0,
    outputs: 1,
    accepts: [],
    produces: 'image',
    llmRequired: 'no',
    params: { sources: [] /* [{url,name,note}] */ },
    w: 240,
    h: 200,
  },
  {
    id: 'doc-import',
    category: 'image-process',
    label: '导入文档',
    color: '#3d7bd9',
    icon: FileText,
    description: '解析 PDF/Word/Markdown',
    inputs: 0,
    outputs: 1,
    accepts: [],
    produces: 'text',
    llmRequired: 'no',
    params: { filename: '', chunking: '段落' },
    w: 240,
    h: 140,
  },

  /* ===== 智能生成（必须大模型）===== */
  {
    id: 'chat',
    category: 'ai-gen',
    label: '需求提炼',
    color: '#7c5cff',
    icon: MessageCircle,
    description: '把客户原话整理成结构化设计 brief',
    inputs: 1,
    outputs: 1,
    accepts: ['text', 'any'],
    produces: 'text',
    llmRequired: 'yes',
    llmType: 'text',
    params: { model: 'auto', system: '', temperature: 0.7 },
    w: 240,
    h: 150,
  },
  {
    id: 'prompt-optimize',
    category: 'ai-gen',
    label: '文案生成',
    color: '#ec4899',
    icon: Wand2,
    description: '生成店招文案、slogan、卖点',
    inputs: 1,
    outputs: 1,
    accepts: ['text', 'any'],
    produces: 'text',
    llmRequired: 'yes',
    llmType: 'text',
    params: { model: 'deepseek-v3', style: '通用' },
    w: 240,
    h: 170,
  },
  {
    id: 'reverse-prompt',
    category: 'ai-gen',
    label: '反推提示词',
    color: '#c026d3',
    icon: Undo2,
    description: '从参考图提炼风格与提示词',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'text',
    llmRequired: 'yes',
    llmType: 'multimodal',
    params: { model: 'gpt-4o', length: '中等' },
    w: 240,
    h: 170,
  },
  {
    id: 'image-gen',
    category: 'ai-gen',
    label: '效果图生成',
    color: '#ff6b35',
    icon: ImagePlus,
    description: '生成门头/海报/文化墙效果图',
    inputs: 1,
    outputs: 1,
    accepts: ['text', 'any'],
    produces: 'image',
    llmRequired: 'yes',
    llmType: 'multimodal',
    params: { model: 'gpt-image-2', size: '1024x1024', quality: 'high', n: 1 },
    w: 260,
    h: 220,
  },
  {
    id: 'image-gen-mode',
    category: 'ai-gen',
    label: '实景合成',
    color: '#9b8cff',
    icon: Boxes,
    description: '设计稿合成到实拍照片',
    inputs: 2,
    outputs: 1,
    accepts: ['text', 'image', 'any'],
    produces: 'image',
    llmRequired: 'yes',
    llmType: 'multimodal',
    params: { mode: '通用', preset: '实景合成（店铺）', extra: '' },
    w: 260,
    h: 240,
  },
  {
    id: 'video-gen',
    category: 'ai-gen',
    label: '视频生成',
    color: '#f97316',
    icon: Film,
    description: '从文字或图片生成短视频',
    inputs: 1,
    outputs: 1,
    accepts: ['text', 'image', 'any'],
    produces: 'video',
    llmRequired: 'yes',
    llmType: 'multimodal',
    params: { duration: 5, fps: 24, motion: '中等' },
    w: 260,
    h: 180,
  },

  /* ===== 快捷工具（无需大模型）===== */
  {
    id: 'upscale-8k',
    category: 'image-process',
    label: '8K 超分',
    color: '#10b981',
    icon: Maximize2,
    description: '低分辨率放大到 8K',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { factor: 4, denoise: 50, faceEnhance: true },
    w: 240,
    h: 160,
  },
  {
    id: 'color-adjust',
    category: 'image-process',
    label: '色彩调整',
    color: '#06b6d4',
    icon: Palette,
    description: '调整亮度、对比、饱和度',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { brightness: 0, contrast: 0, saturation: 0, hue: 0 },
    w: 240,
    h: 180,
  },
  {
    id: 'image-transform',
    category: 'image-process',
    label: '图像变换',
    color: '#0891b2',
    icon: Move,
    description: '旋转/镜像/裁切/透视',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { type: 'rotate', angle: 0, flipH: false, flipV: false },
    w: 240,
    h: 160,
  },
  {
    id: 'long-image',
    category: 'image-process',
    label: '长图合成',
    color: '#14b8a6',
    icon: Combine,
    description: '多张图拼接为长图',
    inputs: 2,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { direction: '纵向', gap: 8, bg: '#ffffff' },
    w: 240,
    h: 150,
  },
  {
    id: 'album-flip',
    category: 'image-process',
    label: '画册翻页',
    color: '#ec4899',
    icon: BookOpen,
    description: '多张图生成画册翻页效果',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { flip: '横向', pages: 12, effect: '3D 翻页' },
    w: 240,
    h: 160,
  },
  {
    id: 'image-compare',
    category: 'image-process',
    label: '图片对比',
    color: '#a855f7',
    icon: Columns2,
    description: '生成前后对比图',
    inputs: 2,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { mode: '并排', label: true, ratio: 0.5 },
    w: 240,
    h: 150,
  },
  {
    id: 'vector-free',
    category: 'image-process',
    label: '免费矢量',
    color: '#8b5cf6',
    icon: Sparkles,
    description: '图片转矢量风格',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { colorMode: '保留色彩', detail: 4, smooth: 75, simplify: 6.5 },
    w: 260,
    h: 220,
  },
  {
    id: 'vector-trace',
    category: 'image-process',
    label: '图转矢量',
    color: '#7c3aed',
    icon: Wand,
    description: '位图描边为矢量',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'no',
    params: { threshold: 128, colorCount: 8 },
    w: 240,
    h: 160,
  },
  {
    id: 'text-note',
    category: 'image-process',
    label: '文本备注',
    color: '#64748b',
    icon: StickyNote,
    description: '在流程中插入纯文字备注',
    inputs: 0,
    outputs: 1,
    accepts: [],
    produces: 'text',
    llmRequired: 'no',
    params: { text: '' },
    w: 220,
    h: 130,
  },
  /* ===== 业务节点（广告公司专用，无需大模型）===== */
  {
    id: 'req-form',
    category: 'image-process',
    label: '需求记录',
    color: '#0e7490',
    icon: ClipboardList,
    description: '客户需求字段化记录：客户名/项目/尺寸/材质/预算/交期',
    inputs: 0,
    outputs: 1,
    accepts: [],
    produces: 'text',
    llmRequired: 'no',
    params: {
      customer: '',
      projectType: '门头店招',
      size: '',
      material: '',
      budget: '',
      deadline: '',
      note: '',
    },
    w: 260,
    h: 240,
  },
  {
    id: 'quote-calc',
    category: 'image-process',
    label: '报价计算',
    color: '#b45309',
    icon: Calculator,
    description: '尺寸 × 工艺单价 → 报价单',
    inputs: 1,
    outputs: 1,
    accepts: ['text', 'any'],
    produces: 'text',
    llmRequired: 'no',
    params: {
      width: 0,
      height: 0,
      unit: '米',
      material: '铝塑板',
      processPrice: 120,
      quantity: 1,
      labor: 300,
      profit: 1.3,
    },
    w: 260,
    h: 220,
  },
  {
    id: 'material-list',
    category: 'image-process',
    label: '物料清单',
    color: '#15803d',
    icon: ListChecks,
    description: '按工艺模板生成物料清单表',
    inputs: 1,
    outputs: 1,
    accepts: ['text', 'any'],
    produces: 'text',
    llmRequired: 'no',
    params: { template: '门头灯箱', items: [] },
    w: 260,
    h: 180,
  },
  {
    id: 'export-deliver',
    category: 'image-process',
    label: '导出交付',
    color: '#1d4ed8',
    icon: PackageOpen,
    description: '打包下载：效果图 + 施工图 + 物料清单 + 报价单',
    inputs: 2,
    outputs: 1,
    accepts: ['image', 'text', 'any'],
    produces: 'text',
    llmRequired: 'no',
    params: { format: 'zip', includeQuote: true, includeMaterial: true },
    w: 260,
    h: 160,
  },

  /* ===== 可二选一（AI / 手动）===== */
  {
    id: 'ai-cutout',
    category: 'optional',
    label: 'AI 抠图',
    color: '#84cc16',
    icon: Scissors,
    description: '一键抠出前景物体（可切换 AI/手动）',
    inputs: 1,
    outputs: 1,
    accepts: ['image', 'any'],
    produces: 'image',
    llmRequired: 'optional',
    llmType: 'multimodal',
    params: { mode: '自动', feather: 0, refineEdges: true },
    w: 240,
    h: 150,
  },

  /* ===== 输出 ===== */
  {
    id: 'share',
    category: 'output',
    label: '分享链接',
    color: '#10b981',
    icon: Share2,
    description: '生成可分享的预览链接',
    inputs: 1,
    outputs: 0,
    accepts: ['any'],
    produces: null,
    llmRequired: 'no',
    params: { expireDays: 30, password: '' },
    w: 240,
    h: 140,
  },
];

/* 按 ID 取节点元数据 */
export function nodeMeta(id: string): CanvasNodeMeta | undefined {
  return CANVAS_NODES.find((n) => n.id === id);
}

/* 端口类型 → 颜色（用于连线染色） */
export const PORT_COLOR: Record<PortType, string> = {
  text: '#7c5cff',
  image: '#ff6b35',
  video: '#f97316',
  any: '#10b981',
};

interface ConnectableNode {
  id: string;
  type: string;
}

/* 检查连接合法性：from.produces 是否能连到 to.accepts */
export function canConnect(
  fromNode?: ConnectableNode | null,
  toNode?: ConnectableNode | null,
): boolean {
  if (!fromNode || !toNode || fromNode.id === toNode.id) return false;
  const from = nodeMeta(fromNode.type);
  const to = nodeMeta(toNode.type);
  if (!from || !to) return false;
  if (!from.produces || to.accepts.length === 0) return false;
  return to.accepts.includes(from.produces) || to.accepts.includes('any');
}

/* 默认推荐模型（根据 LLM 类型） */
export const TEXT_LLM_DEFAULT = 'deepseek-v3';
export const MULTIMODAL_LLM_DEFAULT = 'gpt-image-1';
