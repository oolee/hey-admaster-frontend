import type {
  AiChatMessage,
  AiDesignSession,
  AiGenerationInput,
  AiGenerationResult,
  AiImageAsset,
  AiModelOption,
  AiTemplate,
} from '#/api/ai-design';

import { computed, ref, watch } from 'vue';

import { defineStore } from 'pinia';

import {
  AiGenerationStatus,
  aiImageUrl,
  AiRequestParam,
  cancelAiGenerationTask,
  createAiSession,
  deleteAiSession,
  fetchAiModelOptions,
  fetchAiSession,
  fetchAiSessions,
  fetchAiTemplates,
  fetchMyWallet,
  generateAiImage,
  queryAiGenerationTask,
  updateAiSession,
} from '#/api/ai-design';

export interface AiGeneratedImage {
  id: string;
  url: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  time: string;
  images?: AiGeneratedImage[];
  refImages?: RefImage[];
  isCheckResult?: boolean;
  modelUsed?: string;
  /** 本次对话消耗金额（元），显示在消息时间旁 */
  cost?: number;
  /** 原始提示词（后端失败消息持久化，刷新后用于恢复重试匹配） */
  prompt?: string;
  /** 系统加工后的完整提示词（用户消息下方灰色小字展示） */
  optimizedPrompt?: string;
  /** 生成失败后可重试：保存原提示词与张数 */
  retry?: { count: number; prompt: string };
  /** 关联后端生成任务 Id（用于查看调用留痕/重新落库） */
  taskId?: string;
  /** 上游已返回图片但首次落库失败（可点击「重新加载落库」） */
  persistFailed?: boolean;
  /** 调用留痕（发送内容/提示词/完整API参数/返回内容/临时图片URL），懒加载缓存 */
  trace?: AiTaskTrace | null;
  /** 留痕面板是否展开 */
  traceOpen?: boolean;
}

/**
 * 单条消息对应的后端生成任务留痕（对话历史追踪/故障排查用）。
 * 与后端 AiGenerationResultDto 对齐；requestPayloadJson/responsePayloadJson 为完整原始 JSON。
 */
export interface AiTaskTrace {
  taskId: string;
  status: number;
  model: string;
  failReason?: null | string;
  prompt?: null | string;
  optimizedPrompt?: null | string;
  /** 最终调用上游 API 的完整请求参数（JSON） */
  requestPayloadJson?: null | string;
  /** 上游返回的完整响应体（JSON） */
  responsePayloadJson?: null | string;
  /** 上游返回的临时图片 URL（落库失败时用于重新加载落库） */
  externalImageUrls: string[];
  /** 文本对话结果 */
  text?: null | string;
  totalTokens?: null | number;
  chargedAmount?: number;
  pricingUnit?: number;
}

export interface RefImage {
  id: string;
  dataUrl: string;
  fileName: string;
  label: string;
  tag: string;
}

export interface DesignRevision {
  Id: string;
  DesignSessionId: string;
  RevisionNo: number;
  ImageUrl: string;
  ThumbnailUrl: string;
  Prompt: null | string;
  OptimizedPrompt: null | string;
  UserFeedback: null | string;
  Source: string;
  Status: string;
  Width: number;
  Height: number;
  FileSize: number;
  CreatedAt: string;
}

export interface ModelOption {
  id: string;
  /** 后端真实模型名（id 为「渠道Id:模型名」唯一键时用于发送） */
  modelName?: string;
  label: string;
  shortLabel: string;
  recommended?: boolean;
  disabled?: boolean;
  /** 所属渠道 Id（模型选择器按渠道分组展示） */
  channelId?: string;
  /** 所属渠道名称 */
  channelName?: string;
  /** 模型能力类型：0 图片生成、1 文本对话（前端据此动态显示菜单与返回格式） */
  modelType?: number;
  /** 模型能力位（Flags）：Chat/ImageGeneration/ImageEditing/Vision 等 */
  capabilities?: number;
  /** 计价单位：0 元/张、1 元/次、2 元/1M tokens */
  pricingUnit?: number;
  /** 模型单价（与 pricingUnit 配套，模型选择器小字显示） */
  price?: number;
  /** 模型支持的尺寸列表（如 ["1024x1024","1536x1024","1024x1536"]，空则用默认值） */
  supportedSizes?: string[];
  /** 禁用的请求参数（Flags，与后端 AiRequestParam 对齐）：前端据此禁用/隐藏对应控件 */
  disabledRequestParams?: number;
  /** 单次最大生成张数（0=不限制） */
  maxImagesPerRequest?: number;
  /** 尺寸发送模式：0 直传 WxH、1 档位字面量 */
  sizeMode?: number;
  /** 请求参数适配策略 JSON（fixedCount/fixedQuality/sizeTierMap/defaultSizeTier...），空=无 */
  paramProfileJson?: null | string;
}

export interface SizePreset {
  label: string;
  w: number;
  h: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  generatedImages: AiGeneratedImage[];
  selectedImageId: null | string;
}

const STORAGE_KEY = 'hey-ai-design-sessions-v1';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ChatSession =>
        s && typeof s.id === 'string' && Array.isArray(s.messages),
    );
  } catch {
    return [];
  }
}

function persistSessions(sessions: ChatSession[]) {
  try {
    const json = JSON.stringify(sessions);
    if (json.length > 4 * 1024 * 1024) return; // 避免超出 localStorage 配额
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // 忽略配额/序列化错误，仅影响本地历史
  }
}

// ── 后端同步（Hey.AdMaster.AiDesign 模块）──
// 本地会话以 local- 开头；后端可达时创建/加载真实会话，否则保持纯本地模式。

function mapAssetToGeneratedImage(asset: AiImageAsset): AiGeneratedImage {
  return {
    id: asset.id,
    url: asset.url || aiImageUrl(asset.id), // asset.url 为后端签发的短时签名地址
    title: asset.fileName || '生成方案',
  };
}

function mapMessageDtoToChatMessage(
  msg: AiChatMessage,
  imageById: Map<string, AiImageAsset>,
): ChatMessage {
  const images = msg.generatedImageIds
    .map((id) => imageById.get(id))
    .filter((a): a is AiImageAsset => Boolean(a))
    .map((asset) => mapAssetToGeneratedImage(asset));

  // 后端失败消息（System 类型 + 失败前缀）自动恢复重试能力：
  // 刷新/换设备后历史失败对话仍可直接重试（张数取任务实际请求数）
  const failedReason = extractFailReason(msg.content ?? '');

  return {
    id: msg.id,
    role: msg.role === 0 ? 'user' : 'assistant',
    content: msg.content ?? msg.prompt ?? '',
    time: msg.creationTime,
    modelUsed: msg.modelUsed ?? undefined,
    isCheckResult: msg.messageType === 20,
    prompt: msg.prompt ?? undefined,
    optimizedPrompt: msg.optimizedPrompt ?? undefined,
    taskId: msg.taskId ?? undefined,
    retry:
      msg.messageType === 20 && failedReason
        ? {
            prompt: msg.prompt ?? msg.content ?? '',
            count: msg.requestedCount ?? 1,
          }
        : undefined,
    images: images.length > 0 ? images : undefined,
  };
}

function mapSessionDtoToChatSession(dto: AiDesignSession): ChatSession {
  const imageById = new Map(dto.images.map((img) => [img.id, img]));
  return {
    id: dto.id,
    title: dto.title || '新对话',
    createdAt: dto.creationTime,
    updatedAt: dto.lastModificationTime ?? dto.lastActivityTime,
    messages: dto.messages.map((m) => mapMessageDtoToChatMessage(m, imageById)),
    generatedImages: dto.images.map((asset) => mapAssetToGeneratedImage(asset)),
    selectedImageId: null,
  };
}

/** 提取失败消息中的原因文本（兼容「生成失败：」「重绘失败：」「图片生成失败：」前缀） */
function extractFailReason(content: string): null | string {
  const matched = content.match(
    /^(?:图片)?(?:生成|重绘)失败[:：]\s*([\s\S]+)$/,
  );
  return matched ? (matched[1] ?? null) : null;
}

/**
 * 刷新会话后，把本地缓存中失败消息的 retry 信息合并回后端消息：
 * 后端失败消息持久化了原始提示词（prompt），本地失败消息保存了 retry，优先按 prompt 匹配，
 * prompt 缺失时回退到按失败原因文本匹配，保证刷新后失败对话仍可继续重试。
 */
function mergeRetryFromLocal(
  backend: ChatSession,
  local?: ChatSession,
): ChatSession {
  if (!local || local.messages.length === 0) return backend;

  const retryByPrompt = new Map<string, NonNullable<ChatMessage['retry']>>();
  const retryByReason = new Map<string, NonNullable<ChatMessage['retry']>>();
  for (const msg of local.messages) {
    if (!msg.retry) continue;
    if (msg.prompt) retryByPrompt.set(msg.prompt, msg.retry);
    const reason = extractFailReason(msg.content);
    if (reason) retryByReason.set(reason, msg.retry);
  }
  if (retryByPrompt.size === 0 && retryByReason.size === 0) return backend;

  for (const msg of backend.messages) {
    if (msg.retry) continue;
    const reason = extractFailReason(msg.content);
    const retry =
      (msg.prompt && retryByPrompt.get(msg.prompt)) ||
      (reason ? retryByReason.get(reason) : undefined);
    if (retry) msg.retry = retry;
  }
  return backend;
}

// ── 生成取消（停止按钮）──
let activeAbort: AbortController | null = null;
let activeTaskId: null | string = null;

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error && cause.name === 'AbortError';
}

function createAbortError(): Error {
  const err = new Error('生成已停止');
  err.name = 'AbortError';
  return err;
}

export const useAiDesignStore = defineStore('aiDesign', () => {
  // ── Model selection ──
  const modelOptions: ModelOption[] = [
    {
      id: 'gpt-image2',
      label: 'GPT-image2',
      shortLabel: 'GPT-image2',
      recommended: true,
    },
    { id: 'gpt-4o', label: 'GPT-4o（图片生成）', shortLabel: 'GPT-4o' },
    { id: 'dalle3', label: 'DALL·E 3', shortLabel: 'DALL·E 3' },
    {
      id: 'custom',
      label: '自定义 API（二期）',
      shortLabel: '自定义',
      disabled: true,
    },
  ];
  const selectedModel = ref<string>('gpt-image2');

  // ── Generation count ──
  const generateCount = ref<number>(1);
  const baseCountOptions = [1, 2, 4, 6, 8];
  // ── Quality options（生成质量，替换原 1K/2K/4K 分辨率档位：分辨率属于 size/比例维度，质量才是 auto/low/medium/high） ──
  const qualityOptions = [
    { value: 'auto', label: '自动', desc: '模型自动选择最优质量（推荐）' },
    { value: 'low', label: '快速', desc: '低质量·生成快·更省' },
    { value: 'medium', label: '标准', desc: '中等质量·速度与细节均衡' },
    { value: 'high', label: '精细', desc: '高质量·细节丰富·更贵' },
  ];

  // ── Size presets ──
  const sizePresets: SizePreset[] = [
    { label: '门头', w: 300, h: 150 },
    { label: '灯箱', w: 200, h: 100 },
    { label: '易拉宝', w: 80, h: 200 },
    { label: '海报', w: 60, h: 90 },
    { label: '名片', w: 9, h: 5.4 },
    { label: 'DM', w: 21, h: 29.7 },
    { label: '文化墙', w: 400, h: 180 },
    { label: '展板', w: 120, h: 90 },
    { label: '折页', w: 21, h: 14.5 },
  ];

  // ── Design type → default aspect ratio mapping ──
  const designTypeRatios: Record<string, string> = {
    门头: '2:1',
    灯箱: '2:1',
    易拉宝: '1:2',
    海报: '2:3',
    名片: '16:9',
    DM: '1:1.4',
    文化墙: '2:1',
    展板: '4:3',
    折页: '1.4:1',
  };

  // ── Aspect ratio options (presets only, excluding custom which is separate) ──
  const aspectRatioOptions = [
    { value: 'auto', label: '自动' },
    { value: '2:1', label: '2:1' },
    { value: '1:2', label: '1:2' },
    { value: '3:1', label: '3:1' },
    { value: '1:3', label: '1:3' },
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '4:3', label: '4:3' },
    { value: '3:4', label: '3:4' },
    { value: '1:1', label: '1:1' },
  ];

  // ── Design params ──
  // 默认不携带任何物理尺寸：仅当用户显式选择设计类型/比例/自定义尺寸后才生效（提示词不附加尺寸）
  const designWidth = ref(0);
  /**
   * 尺寸来源：'none' | 'designType' | 'ratio' | 'custom'。
   * 决定提示词附加尺寸的优先级与去重：
   * - designType：尺寸由设计类型隐含（提示词已含类型名时不再附加）
   * - ratio/custom：用户显式选择的尺寸，以选择的尺寸为准（始终附加，除非提示词已含尺寸描述）
   */
  const sizeSource = ref<'custom' | 'designType' | 'none' | 'ratio'>('none');

  /** 发送前自动优化提示词（后台 DeepSeek 等文本模型精简，消耗 token，默认关闭） */
  const autoOptimizePrompt = ref(false);
  const selectedStyle = ref(''); // ' = 无（不指定风格）
  const selectedPalette = ref(''); // ' = 无（不指定配色）
  const optimizedPrompt = ref('');
  const quality = ref('auto'); // 生成质量：auto / low / medium / high（对应 GPT 图像模型 quality 参数）
  const selectedDesignType = ref(''); // '' = 无（提示词不附加尺寸，默认不附加任何物理尺寸）
  const designHeight = ref(0);
  const selectedAspectRatio = ref('auto'); // 默认自动：未选择比例/设计类型时提示词不附加尺寸
  /** 分辨率档位（模糊选择）：auto=自动 / 1k / 2k / 4k。选档位时取该档最大分辨率或按比例匹配 30 档尺寸 */
  const resolutionTier = ref<'1k' | '2k' | '4k' | 'auto'>('auto');
  /** 精确尺寸（如 1536x1024）：用户在 30 档尺寸中精确选择后生效；为空时按「档位+比例」自动解析 */
  const exactSize = ref<string>('');

  // ── Style presets (expanded with real case preview images) ──
  const stylePresets = [
    {
      id: 'flat',
      name: '扁平',
      description: '简洁色块，无阴影，现代清爽',
      preview: '/images/fede/airbag-01.jpg',
    },
    {
      id: '3d',
      name: '3D立体',
      description: '立体效果，透视感，空间纵深',
      preview: '/images/fede/cme-01.jpg',
    },
    {
      id: 'minimal',
      name: '极简',
      description: '少即是多，大量留白设计',
      preview: '/images/fede/things-01.jpg',
    },
    {
      id: 'guochao',
      name: '国潮',
      description: '中国风+现代设计，传统韵味',
      preview: '/images/fede/raccagni-01.jpg',
    },
    {
      id: 'industrial',
      name: '工业风',
      description: '金属质感，硬朗线条，粗犷',
      preview: '/images/fede/postop-01.jpg',
    },
    {
      id: 'natural',
      name: '自然清新',
      description: '绿色植物，柔和色调，生机感',
      preview: '/images/fede/abbracci-01.jpg',
    },
    {
      id: 'cyberpunk',
      name: '赛博朋克',
      description: '霓虹科技，未来感，暗色调',
      preview: '/images/fede/unisve-01.jpg',
    },
    {
      id: 'vintage',
      name: '复古怀旧',
      description: '老照片质感，暖色调，年代感',
      preview: '/images/fede/airbag-03.jpg',
    },
    {
      id: 'business',
      name: '商务专业',
      description: '稳重严谨，企业感，可信赖',
      preview: '/images/fede/bratina-01.jpg',
    },
    {
      id: 'art-deco',
      name: '艺术装饰',
      description: '几何对称，奢华感，精致',
      preview: '/images/fede/raccagni-02.jpg',
    },
    {
      id: 'handdrawn',
      name: '手绘插画',
      description: '温馨手绘，亲和力，人文感',
      preview: '/images/fede/abbracci-03.jpg',
    },
    {
      id: 'tech',
      name: '科技未来',
      description: '蓝色光效，数据感，前沿',
      preview: '/images/fede/cme-04.jpg',
    },
    {
      id: 'luxury',
      name: '轻奢',
      description: '金黑配色，高端质感，优雅',
      preview: '/images/fede/raccagni-04.jpg',
    },
    {
      id: 'cartoon',
      name: '卡通萌系',
      description: '圆润可爱，活泼色彩，趣味',
      preview: '/images/fede/abbracci-02.jpg',
    },
    {
      id: 'ink',
      name: '水墨',
      description: '传统水墨，意境深远，东方美',
      preview: '/images/fede/things-03.jpg',
    },
    {
      id: 'collage',
      name: '拼贴',
      description: '素材组合，创意混搭，丰富',
      preview: '/images/fede/unisve-03.jpg',
    },
  ];

  // ── Color palettes (expanded with real case preview images) ──
  const colorPalettes = [
    {
      id: 'pal-1',
      name: '暖橙',
      colors: ['#F97316', '#FEF3C7', '#FFE4C4', '#FF8C00', '#FF6347'],
      preview: '/images/fede/airbag-02.jpg',
    },
    {
      id: 'pal-2',
      name: '深海',
      colors: ['#1E3A5F', '#2563EB', '#3B82F6', '#60A5FA', '#DBEAFE'],
      preview: '/images/fede/unisve-02.jpg',
    },
    {
      id: 'pal-3',
      name: '森林',
      colors: ['#166534', '#10B981', '#34D399', '#6EE7B7', '#D1FAE5'],
      preview: '/images/fede/abbracci-04.jpg',
    },
    {
      id: 'pal-4',
      name: '优雅紫',
      colors: ['#4C1D95', '#7C3AED', '#8B5CF6', '#A78BFA', '#EDE9FE'],
      preview: '/images/fede/raccagni-03.jpg',
    },
    {
      id: 'pal-5',
      name: '经典红',
      colors: ['#991B1B', '#DC2626', '#EF4444', '#F87171', '#FEE2E2'],
      preview: '/images/fede/airbag-04.jpg',
    },
    {
      id: 'pal-6',
      name: '商务灰',
      colors: ['#1F2937', '#4B5563', '#6B7280', '#9CA3AF', '#E5E7EB'],
      preview: '/images/fede/bratina-02.jpg',
    },
    {
      id: 'pal-7',
      name: '日落金',
      colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'],
      preview: '/images/fede/postop-02.jpg',
    },
    {
      id: 'pal-8',
      name: '薄荷',
      colors: ['#059669', '#10B981', '#34D399', '#A7F3D0', '#D1FAE5'],
      preview: '/images/fede/abbracci-05.jpg',
    },
    {
      id: 'pal-9',
      name: '樱花粉',
      colors: ['#BE185D', '#EC4899', '#F472B6', '#FBCFE8', '#FCE7F3'],
      preview: '/images/fede/raccagni-05.jpg',
    },
    {
      id: 'pal-10',
      name: '咖啡',
      colors: ['#451A03', '#78350F', '#92400E', '#D97706', '#FEF3C7'],
      preview: '/images/fede/things-04.jpg',
    },
    {
      id: 'pal-11',
      name: '冰蓝',
      colors: ['#0C4A6E', '#0284C7', '#0EA5E9', '#7DD3FC', '#E0F2FE'],
      preview: '/images/fede/cme-02.jpg',
    },
    {
      id: 'pal-12',
      name: '莫兰迪',
      colors: ['#57534E', '#78716C', '#A8A29E', '#D6D3D1', '#F5F5F4'],
      preview: '/images/fede/things-02.jpg',
    },
    {
      id: 'pal-13',
      name: '霓虹',
      colors: ['#1A1A2E', '#16213E', '#0F3460', '#E94560', '#533483'],
      preview: '/images/fede/unisve-04.jpg',
    },
    {
      id: 'pal-14',
      name: '大地',
      colors: ['#7C2D12', '#9A3412', '#C2410C', '#FED7AA', '#FFFBEB'],
      preview: '/images/fede/postop-03.jpg',
    },
    {
      id: 'pal-15',
      name: '渐变青',
      colors: ['#134E4A', '#0D9488', '#14B8A6', '#5EEAD4', '#CCFBF1'],
      preview: '/images/fede/cme-03.jpg',
    },
    {
      id: 'pal-16',
      name: '酒红',
      colors: ['#7F1D1D', '#991B1B', '#B91C1C', '#DC2626', '#FCA5A5'],
      preview: '/images/fede/airbag-05.jpg',
    },
    {
      id: 'pal-17',
      name: '深空',
      colors: ['#0F172A', '#1E293B', '#334155', '#475569', '#94A3B8'],
      preview: '/images/fede/unisve-05.jpg',
    },
    {
      id: 'pal-18',
      name: '橄榄',
      colors: ['#365314', '#4D7C0F', '#65A30D', '#84CC16', '#D9F99D'],
      preview: '/images/fede/abbracci-03.jpg',
    },
    {
      id: 'pal-19',
      name: '琥珀',
      colors: ['#78350F', '#92400E', '#B45309', '#D97706', '#FCD34D'],
      preview: '/images/fede/postop-04.jpg',
    },
    {
      id: 'pal-20',
      name: '雾灰蓝',
      colors: ['#1E3A8A', '#1E40AF', '#3B82F6', '#60A5FA', '#BFDBFE'],
      preview: '/images/fede/bratina-03.jpg',
    },
  ];

  // ── Reference image tags ──
  const tagOptions = [
    { id: 'logo', label: 'Logo', color: '#7c3aed' },
    { id: 'style', label: '风格', color: '#6366f1' },
    { id: 'cad', label: 'CAD', color: '#d97706' },
    { id: 'site', label: '现场', color: '#059669' },
    { id: 'material', label: '材质', color: '#0891b2' },
    { id: 'other', label: '其他', color: '#6b7280' },
  ];

  // ── Generation state ──
  const generatedImages = ref<AiGeneratedImage[]>([]);
  const selectedImage = ref<null | string>(null);
  const revisionHistory = ref<DesignRevision[]>([]);
  const currentRevision = ref<null | number>(null);
  const revisionCounter = ref(0);

  // ── Sessions（ChatGPT 风格对话列表）──
  const sessions = ref<ChatSession[]>(loadSessions());
  const activeSessionId = ref<null | string>(sessions.value[0]?.id ?? null);
  const sessionSyncs = new Map<string, Promise<string>>(); // local 会话 id -> 后端创建结果
  const apiMode = ref(false); // 后端是否可达

  // ── 文本对话结果（文本模型生成后返回，图片模型为空）──
  const lastGenerationText = ref<string>('');

  // ── 计费状态（登录后从后端加载）──
  const walletBalance = ref<null | number>(null);
  const walletUnitPrice = ref(0);
  const lastChargedAmount = ref(0);
  const lastPricingUnit = ref(0);
  const templates = ref<AiTemplate[]>([]); // 后端模板（面板回退本地 AD_TEMPLATES）
  const createClientRequestId = () =>
    `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const activeSession = computed(
    () => sessions.value.find((s) => s.id === activeSessionId.value) ?? null,
  );

  const currentModel = computed(() =>
    modelOptions.find((m) => m.id === selectedModel.value),
  );

  /** 当前模型禁用的请求参数位（与后端 AiRequestParam 对齐，0=全部支持） */
  const modelDisabledParams = computed(
    () => currentModel.value?.disabledRequestParams ?? 0,
  );

  /** 当前模型请求参数适配策略（解析 paramProfileJson，供固定张数/画质/尺寸档位判断） */
  interface ModelParamProfile {
    fixedCount?: null | number;
    fixedQuality?: null | string;
    defaultSizeTier?: null | string;
    sizeTierMap?: Record<string, string>;
  }
  const modelParamProfile = computed<ModelParamProfile | null>(() => {
    const json = currentModel.value?.paramProfileJson;
    if (!json) return null;
    try {
      return JSON.parse(json) as ModelParamProfile;
    } catch {
      return null;
    }
  });

  /** 生成张数选项：按当前模型能力动态裁剪（渠道固定张数 / 禁用 n / maxImagesPerRequest 上限） */
  const countOptions = computed<number[]>(() => {
    const profile = modelParamProfile.value;
    if (profile?.fixedCount && profile.fixedCount > 0)
      return [profile.fixedCount];
    if (modelDisabledParams.value & AiRequestParam.Count) return [1];
    const max = currentModel.value?.maxImagesPerRequest ?? 0;
    return max > 0
      ? baseCountOptions.filter((c) => c <= max)
      : baseCountOptions;
  });

  /** 画质不可选：渠道禁用 quality 或固定 quality（如 apiyi gpt-image-2-vip 强制 high） */
  const qualityDisabled = computed(() => {
    if (modelDisabledParams.value & AiRequestParam.Quality) return true;
    return Boolean(modelParamProfile.value?.fixedQuality);
  });

  /** 尺寸不可选：渠道禁用 size 参数（尺寸只能写进提示词，前端隐藏尺寸选择） */
  const sizeDisabled = computed(() =>
    Boolean(modelDisabledParams.value & AiRequestParam.Size),
  );

  // 模型/能力变化时同步张数（固定张数或超出上限时回退到合法值）
  watch(
    [selectedModel, countOptions],
    () => {
      if (!countOptions.value.includes(generateCount.value)) {
        generateCount.value = countOptions.value[0] ?? 1;
      }
    },
    { immediate: true },
  );

  // 风格关键词（去掉尾部「风格/风」，用于拼入模板 prompt 的 {style}风格 占位）
  const styleKeyword = computed(() => {
    const name =
      stylePresets.find((s) => s.id === selectedStyle.value)?.name || '';
    return name.replace(/(风格|风)$/, '');
  });

  // ── Computed ──
  function ensureSession(): ChatSession {
    if (activeSession.value) return activeSession.value;
    return createSession();
  }

  function createSession(): ChatSession {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: '新对话',
      createdAt: now,
      updatedAt: now,
      messages: [],
      generatedImages: [],
      selectedImageId: null,
    };
    sessions.value.unshift(session);
    activeSessionId.value = session.id;
    syncCreateSession(session);
    return session;
  }

  function syncCreateSession(localSession: ChatSession) {
    const pending = createAiSession({
      title: localSession.title === '新对话' ? undefined : localSession.title,
    })
      .then((dto) => {
        const backend = mapSessionDtoToChatSession(dto);
        const idx = sessions.value.findIndex((s) => s.id === localSession.id);
        if (idx !== -1) {
          // 保留同步期间用户已输入的消息 / 已生成图片
          const prev = sessions.value[idx];
          backend.messages =
            prev && prev.messages.length > 0 ? prev.messages : backend.messages;
          backend.generatedImages =
            prev && prev.generatedImages.length > 0
              ? prev.generatedImages
              : backend.generatedImages;
          backend.selectedImageId = prev.selectedImageId;
          sessions.value[idx] = backend;
        }
        if (activeSessionId.value === localSession.id) {
          activeSessionId.value = backend.id;
        }
        apiMode.value = true;
        return backend.id;
      })
      .catch(() => {
        apiMode.value = false;
        return localSession.id;
      });
    sessionSyncs.set(localSession.id, pending);
  }

  async function selectSession(id: string) {
    if (!sessions.value.some((s) => s.id === id)) return;
    activeSessionId.value = id;
    // 后端会话的列表 DTO 不含消息，切换到详情时异步拉取
    if (!id.startsWith('local-')) {
      await refreshSession(id);
    }
  }

  function removeSession(id: string) {
    const idx = sessions.value.findIndex((s) => s.id === id);
    if (idx === -1) return;
    sessions.value.splice(idx, 1);
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0]?.id ?? null;
    }
    if (!id.startsWith('local-')) {
      deleteAiSession(id).catch(() => {});
    }
  }

  function clearActiveSession() {
    const s = activeSession.value;
    if (!s) return;
    s.messages = [];
    s.generatedImages = [];
    s.selectedImageId = null;
    s.title = '新对话';
    s.updatedAt = new Date().toISOString();
    if (!s.id.startsWith('local-')) {
      updateAiSession(s.id, { title: '新对话' }).catch(() => {});
    }
  }

  function renameSession(id: string, title: string) {
    const s = sessions.value.find((item) => item.id === id);
    if (!s) return;
    s.title = title || '新对话';
    s.updatedAt = new Date().toISOString();
    if (!id.startsWith('local-')) {
      updateAiSession(id, { title: s.title }).catch(() => {});
    }
  }

  // ── 后端初始化 / 刷新 ──
  async function initialize() {
    await Promise.allSettled([
      refreshSessions(),
      refreshModelOptions(),
      refreshTemplates(),
      refreshWallet(),
    ]);
  }

  /** 刷新我的钱包（余额/单价），未登录或后端不可用时静默保留现状 */
  async function refreshWallet() {
    try {
      const wallet = await fetchMyWallet();
      walletBalance.value = wallet.balance;
      walletUnitPrice.value = wallet.unitPrice;
    } catch {
      // 未登录（401 已在请求层跳转）或后端不可用
    }
  }

  async function refreshSessions() {
    try {
      const list = await fetchAiSessions();
      apiMode.value = true;
      if (list.length === 0) return;
      const activeId = activeSessionId.value;
      const prevById = new Map(sessions.value.map((s) => [s.id, s]));
      sessions.value = list.map((dto) => {
        const mapped = mapSessionDtoToChatSession(dto);
        return mergeRetryFromLocal(mapped, prevById.get(mapped.id));
      });
      activeSessionId.value =
        activeId && sessions.value.some((s) => s.id === activeId)
          ? activeId
          : (sessions.value[0]?.id ?? null);
    } catch {
      apiMode.value = false;
    }
  }

  async function refreshModelOptions() {
    try {
      const options = await fetchAiModelOptions();
      if (options.length === 0) return;
      // 同名模型跨渠道重名时，label 追加（渠道名）以便区分；id 恒唯一（渠道Id:模型名）
      const nameCounts = new Map<string, number>();
      for (const o of options) {
        nameCounts.set(o.name, (nameCounts.get(o.name) ?? 0) + 1);
      }
      const mapped = options.map((option) => {
        const base = toModelOption(option);
        if ((nameCounts.get(option.name) ?? 0) > 1 && option.channelName) {
          base.label = `${base.label}（${option.channelName}）`;
        }
        return base;
      });
      modelOptions.splice(0, modelOptions.length, ...mapped);
      if (!mapped.some((m) => m.id === selectedModel.value)) {
        const def = options.find((o) => o.isDefault) ?? options[0];
        if (def) selectedModel.value = toModelOption(def).id;
      }
    } catch {
      // 后端不可用时保留本地默认模型列表
    }
  }

  function toModelOption(option: AiModelOption): ModelOption {
    return {
      id: option.channelId ? `${option.channelId}:${option.name}` : option.name,
      modelName: option.name,
      label: option.displayName || option.name,
      shortLabel: option.displayName || option.name,
      recommended: option.isDefault || undefined,
      channelId: option.channelId,
      channelName: option.channelName,
      modelType: option.modelType ?? 0,
      capabilities: option.capabilities ?? 0,
      pricingUnit: option.pricingUnit ?? 0,
      price: option.price ?? 0,
      supportedSizes: option.supportedSizes ?? [],
      disabledRequestParams: option.disabledRequestParams ?? 0,
      maxImagesPerRequest: option.maxImagesPerRequest ?? 0,
      sizeMode: option.sizeMode ?? 0,
      paramProfileJson: option.paramProfileJson ?? null,
    };
  }

  async function refreshTemplates() {
    try {
      const list = await fetchAiTemplates();
      templates.value = list.filter((t) => t.isActive);
    } catch {
      // 保留空模板列表，面板回退到本地 AD_TEMPLATES
    }
  }

  /** 确保当前会话在后端存在，返回可用的 sessionId */
  async function ensureBackendSession(): Promise<string> {
    const s = activeSession.value;
    if (!s) {
      createSession();
      return ensureBackendSession();
    }
    if (!s.id.startsWith('local-')) return s.id;
    const pending = sessionSyncs.get(s.id);
    if (pending) return pending;
    return s.id; // 后端不可用，使用本地会话继续
  }

  /** 刷新单个会话详情（消息 + 图片） */
  async function refreshSession(id: string) {
    try {
      const dto = await fetchAiSession(id);
      const mapped = mapSessionDtoToChatSession(dto);
      const idx = sessions.value.findIndex((s) => s.id === id);
      if (idx === -1) {
        sessions.value.unshift(mapped);
      } else {
        const prev = sessions.value[idx];
        if (prev) {
          mapped.selectedImageId = prev.selectedImageId;
          sessions.value[idx] = mergeRetryFromLocal(mapped, prev);
        } else {
          sessions.value[idx] = mapped;
        }
      }
      if (activeSessionId.value === id) {
        generatedImages.value = mapped.generatedImages;
      }
    } catch {
      // 忽略详情刷新失败（保留本地缓存）
    }
  }

  /** 调后端生图：同步返回图片或轮询异步任务，随后刷新会话；支持 AbortSignal 中止 */
  async function generateImages(
    input: Omit<AiGenerationInput, 'sessionId'> & { sessionId?: null | string },
  ): Promise<AiGeneratedImage[]> {
    const sessionId = input.sessionId ?? (await ensureBackendSession());
    const controller = new AbortController();
    activeAbort = controller;
    try {
      const result = await generateAiImage(
        {
          ...input,
          sessionId,
          clientRequestId: input.clientRequestId ?? createClientRequestId(),
        },
        controller.signal,
      );
      activeTaskId = result.taskId;
      let final = result;
      if (
        result.status === AiGenerationStatus.Pending ||
        result.status === AiGenerationStatus.Processing
      ) {
        final = await pollGenerationTask(result.taskId, controller.signal);
      }
      if (
        final.status === AiGenerationStatus.Failed ||
        final.status === AiGenerationStatus.Canceled
      ) {
        const err: Error & {
          externalImageUrls?: string[];
          taskId?: string;
        } = new Error(final.failReason || 'AI 生成失败，请稍后重试');
        // 上游已返回图片但落库失败：记录任务与临时图片 URL，供「重新加载落库」补偿
        err.taskId = final.taskId;
        err.externalImageUrls = final.externalImageUrls ?? [];
        throw err;
      }
      const images = final.images.map((asset) =>
        mapAssetToGeneratedImage(asset),
      );
      // 文本模型：返回文本结果供界面直接渲染（图片模型为空）
      lastGenerationText.value = final.text ?? '';
      // 回写计费结果（余额/本次扣费）供界面展示
      if (typeof final.walletBalance === 'number') {
        walletBalance.value = final.walletBalance;
      }
      lastChargedAmount.value = final.chargedAmount ?? 0;
      lastPricingUnit.value = final.pricingUnit ?? 0;
      await refreshSession(sessionId);
      return images;
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) {
        throw createAbortError();
      }
      throw error;
    } finally {
      activeTaskId = null;
      if (activeAbort === controller) {
        activeAbort = null;
      }
    }
  }

  async function pollGenerationTask(
    taskId: string,
    signal?: AbortSignal,
    maxPolls = 30,
  ): Promise<AiGenerationResult> {
    let last = await queryAiGenerationTask(taskId, signal);
    for (
      let i = 0;
      i < maxPolls &&
      (last.status === AiGenerationStatus.Pending ||
        last.status === AiGenerationStatus.Processing);
      i++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (signal?.aborted) {
        throw createAbortError();
      }
      last = await queryAiGenerationTask(taskId, signal);
    }
    return last;
  }

  /** 用户点击「停止」：中止进行中请求 + 通知后端取消任务（幂等，未生成成功不扣费） */
  function stopGeneration() {
    activeAbort?.abort();
    const taskId = activeTaskId;
    if (taskId) {
      cancelAiGenerationTask(taskId).catch(() => undefined);
    }
  }
  // ── Actions ──
  function resetGeneration() {
    generatedImages.value = [];
    selectedImage.value = null;
    optimizedPrompt.value = '';
    lastGenerationText.value = '';
  }

  function addRevision(rev: DesignRevision) {
    revisionHistory.value.unshift(rev);
  }

  watch(sessions, (val) => persistSessions(val), { deep: true });

  return {
    modelOptions,
    selectedModel,
    generateCount,
    countOptions,
    qualityOptions,
    sizePresets,
    designTypeRatios,
    aspectRatioOptions,
    designWidth,
    designHeight,
    sizeSource,
    autoOptimizePrompt,
    selectedStyle,
    selectedPalette,
    quality,
    optimizedPrompt,
    selectedDesignType,
    selectedAspectRatio,
    resolutionTier,
    exactSize,
    stylePresets,
    colorPalettes,
    tagOptions,
    generatedImages,
    selectedImage,
    revisionHistory,
    currentRevision,
    revisionCounter,
    currentModel,
    modelDisabledParams,
    modelParamProfile,
    qualityDisabled,
    sizeDisabled,
    styleKeyword,
    sessions,
    activeSessionId,
    activeSession,
    ensureSession,
    createSession,
    selectSession,
    removeSession,
    clearActiveSession,
    renameSession,
    resetGeneration,
    addRevision,
    // 文本对话结果
    lastGenerationText,
    // 计费
    walletBalance,
    walletUnitPrice,
    lastChargedAmount,
    lastPricingUnit,
    refreshWallet,
    // 后端 API
    apiMode,
    templates,
    initialize,
    refreshSessions,
    refreshModelOptions,
    refreshTemplates,
    ensureBackendSession,
    refreshSession,
    generateImages,
    stopGeneration,
  };
});
