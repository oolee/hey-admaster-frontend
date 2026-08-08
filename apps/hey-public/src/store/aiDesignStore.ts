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
  label: string;
  shortLabel: string;
  recommended?: boolean;
  disabled?: boolean;
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
    url: asset.url || aiImageUrl(asset.id),
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
    .map(mapAssetToGeneratedImage);

  return {
    id: msg.id,
    role: msg.role === 0 ? 'user' : 'assistant',
    content: msg.content ?? msg.prompt ?? '',
    time: msg.creationTime,
    modelUsed: msg.modelUsed ?? undefined,
    isCheckResult: msg.messageType === 20,
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
    generatedImages: dto.images.map(mapAssetToGeneratedImage),
    selectedImageId: null,
  };
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
  const countOptions = [1, 2, 4, 6, 8];

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
  const designWidth = ref(300);
  const designHeight = ref(150);
  const selectedStyle = ref('flat');
  const selectedPalette = ref('pal-3');
  const optimizedPrompt = ref('');
  const resolution = ref('1k');
  const selectedDesignType = ref('门头');
  const selectedAspectRatio = ref('2:1');

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

  // ── 计费状态（登录后从后端加载）──
  const walletBalance = ref<null | number>(null);
  const walletUnitPrice = ref(0);
  const lastChargedAmount = ref(0);
  const templates = ref<AiTemplate[]>([]); // 后端模板（面板回退本地 AD_TEMPLATES）
  const createClientRequestId = () =>
    `req-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const activeSession = computed(
    () => sessions.value.find((s) => s.id === activeSessionId.value) ?? null,
  );

  const currentModel = computed(() =>
    modelOptions.find((m) => m.id === selectedModel.value),
  );

  // 风格关键词（去掉尾部「风格/风」，用于拼入模板 prompt 的 {style}风格 占位）
  const styleKeyword = computed(() => {
    const name =
      stylePresets.find((s) => s.id === selectedStyle.value)?.name ||
      '现代简约';
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
          const prev = sessions.value[idx]!;
          backend.messages =
            prev.messages.length > 0 ? prev.messages : backend.messages;
          backend.generatedImages =
            prev.generatedImages.length > 0
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
      sessions.value = list.map(mapSessionDtoToChatSession);
      if (activeId && sessions.value.some((s) => s.id === activeId)) {
        activeSessionId.value = activeId;
      } else {
        activeSessionId.value = sessions.value[0]?.id ?? null;
      }
    } catch {
      apiMode.value = false;
    }
  }

  async function refreshModelOptions() {
    try {
      const options = await fetchAiModelOptions();
      if (options.length === 0) return;
      modelOptions.splice(
        0,
        modelOptions.length,
        ...options.map(toModelOption),
      );
      if (!options.some((o) => o.name === selectedModel.value)) {
        const def = options.find((o) => o.isDefault) ?? options[0];
        if (def) selectedModel.value = def.name;
      }
    } catch {
      // 后端不可用时保留本地默认模型列表
    }
  }

  function toModelOption(option: AiModelOption): ModelOption {
    return {
      id: option.name,
      label: option.displayName || option.name,
      shortLabel: option.displayName || option.name,
      recommended: option.isDefault || undefined,
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
        const prev = sessions.value[idx]!;
        mapped.selectedImageId = prev.selectedImageId;
        sessions.value[idx] = mapped;
      }
      if (activeSessionId.value === id) {
        generatedImages.value = mapped.generatedImages;
      }
    } catch {
      // 忽略详情刷新失败（保留本地缓存）
    }
  }

  /** 调后端生图：同步返回图片或轮询异步任务，随后刷新会话 */
  async function generateImages(
    input: Omit<AiGenerationInput, 'sessionId'> & { sessionId?: null | string },
  ): Promise<AiGeneratedImage[]> {
    const sessionId = input.sessionId ?? (await ensureBackendSession());
    const result = await generateAiImage({
      ...input,
      sessionId,
      clientRequestId: input.clientRequestId ?? createClientRequestId(),
    });
    let final = result;
    if (
      result.status === AiGenerationStatus.Pending ||
      result.status === AiGenerationStatus.Processing
    ) {
      final = await pollGenerationTask(result.taskId);
    }
    if (
      final.status === AiGenerationStatus.Failed ||
      final.status === AiGenerationStatus.Canceled
    ) {
      throw new Error(final.failReason || 'AI 生成失败，请稍后重试');
    }
    const images = final.images.map(mapAssetToGeneratedImage);
    // 回写计费结果（余额/本次扣费）供界面展示
    if (typeof final.walletBalance === 'number') {
      walletBalance.value = final.walletBalance;
    }
    lastChargedAmount.value = final.chargedAmount ?? 0;
    await refreshSession(sessionId);
    return images;
  }

  async function pollGenerationTask(
    taskId: string,
    maxPolls = 30,
  ): Promise<AiGenerationResult> {
    let last = await queryAiGenerationTask(taskId);
    for (
      let i = 0;
      i < maxPolls &&
      (last.status === AiGenerationStatus.Pending ||
        last.status === AiGenerationStatus.Processing);
      i++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      last = await queryAiGenerationTask(taskId);
    }
    return last;
  }
  // ── Actions ──
  function resetGeneration() {
    generatedImages.value = [];
    selectedImage.value = null;
    optimizedPrompt.value = '';
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
    sizePresets,
    designTypeRatios,
    aspectRatioOptions,
    designWidth,
    designHeight,
    selectedStyle,
    selectedPalette,
    resolution,
    optimizedPrompt,
    selectedDesignType,
    selectedAspectRatio,
    stylePresets,
    colorPalettes,
    tagOptions,
    generatedImages,
    selectedImage,
    revisionHistory,
    currentRevision,
    revisionCounter,
    currentModel,
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
    // 计费
    walletBalance,
    walletUnitPrice,
    lastChargedAmount,
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
  };
});
