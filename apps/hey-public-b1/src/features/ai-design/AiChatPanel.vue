<script setup lang="ts">
import type {
  AiGeneratedImage,
  ChatMessage,
  RefImage,
} from '#/store/aiDesignStore';
import type { AdTemplate } from '#/types/ai';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import {
  AiModelCapability,
  AiModelType,
  AiPricingUnitLabels,
  createAiTemplateFromGeneration,
  incrementAiTemplateUsage,
  optimizeAiPrompt,
  queryAiGenerationTask,
  retryPersistAiImages,
} from '#/api/ai-design';
import {
  GPT_IMAGE_TIER_SIZES,
  useAiDesignGeneration,
} from '#/composables/useAiDesignGeneration';
import { useAuth } from '#/composables/useAuth';
import { useAiDesignStore } from '#/store/aiDesignStore';
import { buildPrompt, getTemplatesByCategory } from '#/utils/templates';

const props = defineProps<{
  chatMessages: ChatMessage[];
  isProcessing: boolean;
  refImages: RefImage[];
  sidebarCollapsed?: boolean;
}>();

const emit = defineEmits<{
  addMessage: [
    role: 'assistant' | 'user',
    content: string,
    extra?: Partial<ChatMessage>,
  ];
  openBrandAssets: [];
  openLightbox: [img: AiGeneratedImage];
  openModify: [img: AiGeneratedImage];
  openSettings: [];
  processingChange: [processing: boolean];
  regenerate: [];
  removeRefImage: [id: string];
  replaceLastMessage: [content: string, extra?: Partial<ChatMessage>];
  retry: [msg: ChatMessage];
  retryPersist: [msg: ChatMessage];
  runProductionCheck: [];
  stopGeneration: [];
  triggerUpload: [tag?: string];
  updateRefNotes: [id: string, notes: string];
  updateRefTag: [id: string, tag: string];
}>();

const store = useAiDesignStore();
const { generate: generateImages } = useAiDesignGeneration();
const { user } = useAuth();

/** 用户头像：优先使用真实头像（有则显示），否则回退为昵称/用户名首字母 */
const userAvatarUrl = computed(() => user.value?.avatar || '');
/** 用户头像文字（昵称/用户名首字符） */
const userAvatarText = computed(() =>
  (user.value?.realName || user.value?.username || '用')
    .slice(0, 1)
    .toUpperCase(),
);

/** 模型选项按渠道分组（后端已按渠道优先级排序，保持原有顺序分组即可） */
const modelGroups = computed(() => {
  const groups: {
    channelId: string;
    channelName: string;
    models: typeof store.modelOptions;
  }[] = [];
  const byChannel = new Map<string, (typeof groups)[number]>();
  for (const m of store.modelOptions) {
    const key = m.channelId || m.id;
    let group = byChannel.get(key);
    if (!group) {
      group = {
        channelId: key,
        channelName: m.channelName || '默认渠道',
        models: [],
      };
      byChannel.set(key, group);
      groups.push(group);
    }
    group.models.push(m);
  }
  return groups;
});

/** 判断用户输入是否已包含某关键词（避免重复追加已描述的设计参数） */
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => k && text.includes(k));
}

/** 尺寸文本：仅当用户明确选择了设计类型或尺寸（比例/自定义）时才返回；「无」时不追加 */
function buildSizeText(): string {
  const hasDesignType = Boolean(store.selectedDesignType);
  const hasRatio = store.selectedAspectRatio !== 'auto';
  if (!hasDesignType && !hasRatio) return '';
  return store.designWidth && store.designHeight
    ? `${store.designWidth}×${store.designHeight}cm`
    : '';
}

/** 检测输入是否已包含尺寸描述（如 300×150、300x150、5米、2m、10cm），避免重复附加 */
function containsSizePattern(text: string): boolean {
  return (
    /\d+(?:\.\d+)?\s*[x×X*]\s*\d+(?:\.\d+)?/.test(text) ||
    /(?:宽|长|高)?\s*\d+(?:\.\d+)?\s*(?:cm|厘米|mm|毫米|m|米|寸|英寸)/i.test(
      text,
    )
  );
}

/**
 * 按选中的设计参数拼接到用户提示词后（逗号分隔）：
 * - 选择「无」/未选择的参数不追加
 * - 用户输入已描述相同内容（风格/配色关键词）时不再追加
 * - 尺寸：设计类型用于设定尺寸；用户显式选择比例/自定义尺寸时以选择的尺寸为准（始终附加）
 * - 提示词已包含设计类型名（如「门头」）时，仅跳过该类型「隐含」的尺寸，避免重复/冲突
 * - 提示词已包含尺寸描述时不再追加，尊重用户原文
 */
function buildOptimizedPrompt(input: string): string {
  const parts: string[] = [];
  const styleName = store.styleKeyword;
  const palName =
    store.colorPalettes.find((p) => p.id === store.selectedPalette)?.name || '';
  const sizeText = buildSizeText();
  const hasSize = sizeText.trim().length > 0;
  const designTypeName = store.selectedDesignType;
  const inputHasDesignType = Boolean(
    designTypeName && containsAny(input, [designTypeName]),
  );
  const inputHasSize = containsSizePattern(input);
  if (styleName && !containsAny(input, [styleName])) parts.push(styleName);
  if (palName && !containsAny(input, [palName])) parts.push(palName);
  if (hasSize && !inputHasSize) {
    // 仅「设计类型隐含的尺寸」在提示词已含类型名时跳过；显式尺寸（比例/自定义）以选择的尺寸为准
    const implicitFromType = store.sizeSource === 'designType';
    if (!(implicitFromType && inputHasDesignType)) {
      parts.push(sizeText);
    }
  }
  return parts.length > 0 ? `${input}，${parts.join('，')}` : input;
}

function formatPrice(value: null | number | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 积分换算：1 积分 = 0.01 元（1 元 = 100 积分） */
function formatPoints(value: null | number | undefined): string {
  return Math.round(Number(value ?? 0) * 100).toLocaleString('zh-CN');
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds}s`;
}

/** 后端返回 UTC 时间（ABP 序列化不带时区标识），补 Z 按 UTC 解析再转本地时区显示 */
function formatMsgTime(value?: null | string): string {
  if (!value) return '';
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 生成耗时计时（处理中指示条显示已用时） */
const generationElapsed = ref(0);
let elapsedTimer: null | ReturnType<typeof setInterval> = null;
function startElapsedTimer() {
  stopElapsedTimer();
  generationElapsed.value = 0;
  const startedAt = Date.now();
  elapsedTimer = setInterval(() => {
    generationElapsed.value = Math.round((Date.now() - startedAt) / 1000);
  }, 1000);
}
function stopElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

/** 当前模型能力：无图片生成能力（对话/文本模型）时隐藏图片生成相关设置。
 *  能力位优先：多模态视觉模型若仅配置 Chat（纯聊天），同样按文本处理 */
const isTextModel = computed(() => {
  const m = store.currentModel;
  if (!m) return false;
  const caps = m.capabilities ?? 0;
  if (caps !== 0) {
    return (
      (caps &
        (AiModelCapability.ImageGeneration |
          AiModelCapability.ImageEditing)) ===
      0
    );
  }
  return m.modelType === AiModelType.Text;
});

/** 模型计价单位文案（按模型自身 pricingUnit） */
function modelUnitLabel(unit: number | undefined): string {
  return unit !== undefined && unit in AiPricingUnitLabels
    ? (AiPricingUnitLabels[unit] ?? '元/张')
    : '元/张';
}

/** 计价单位文案（元/张、元/次、元/1M tokens） */
const priceUnitLabel = computed(() =>
  modelUnitLabel(store.currentModel?.pricingUnit),
);

const chatInput = ref('');
const chatContainer = ref<HTMLDivElement>();
const textareaRef = ref<HTMLTextAreaElement>();

// Popup menus
const showPlusMenu = ref(false);
const showModelMenu = ref(false);
const showCountMenu = ref(false);
const showRatioMenu = ref(false);
const showQualityMenu = ref(false);

// ── 尺寸可选项：按当前模型后台声明的 supportedSizes 动态过滤（未配置则显示全部）──
/** 分辨率档位默认项（模型未声明 supportedSizes 时使用全部档位） */
const DEFAULT_TIER_OPTIONS: {
  label: string;
  value: '1k' | '2k' | '4k' | 'auto';
}[] = [
  { value: 'auto', label: '自动' },
  { value: '1k', label: '1K' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
];

/** 比例默认项（模型未声明 supportedSizes 时使用全部比例） */
const DEFAULT_QUICK_RATIOS = [
  { value: 'auto', label: '自动' },
  { value: '2:1', label: '2:1' },
  { value: '1:2', label: '1:2' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
];

/** 按长边判断尺寸所属档位（1k/2k/4k），无法解析返回 null */
function tierOfSize(size: string): '1k' | '2k' | '4k' | null {
  const [wStr, hStr] = size.split('x') as [string, string];
  const w = Number.parseInt(wStr, 10);
  const h = Number.parseInt(hStr, 10);
  if (!w || !h) return null;
  const longEdge = Math.max(w, h);
  if (longEdge <= 1280) return '1k';
  if (longEdge <= 2048) return '2k';
  return '4k';
}

/** 最大公约数（用于简化宽高比） */
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** 尺寸归一键（小x大，忽略横竖）：1024x1536 与 1536x1024 视为同一尺寸 */
function normalizeSizeKey(size: string): string {
  const [wStr, hStr] = size.split('x') as [string, string];
  const w = Number.parseInt(wStr, 10);
  const h = Number.parseInt(hStr, 10);
  if (!w || !h) return size.trim().toLowerCase();
  return `${Math.min(w, h)}x${Math.max(w, h)}`;
}

/** 尺寸 → 简化宽高比（如 1536x1024 → 3:2） */
function ratioOfSize(size: string): string {
  const [wStr, hStr] = size.split('x') as [string, string];
  const w = Number.parseInt(wStr, 10);
  const h = Number.parseInt(hStr, 10);
  if (!w || !h) return '';
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

/** 档位显示名（精确尺寸分组标题） */
const TIER_LABELS: Record<'1k' | '2k' | '4k', string> = {
  '1k': '1K Fast',
  '2k': '2K Recommended',
  '4k': '4K Detail',
};

/** 档位显示名 */
function tierLabelOf(tier: '1k' | '2k' | '4k'): string {
  return TIER_LABELS[tier];
}

/** 当前模型后台声明的支持尺寸（未配置时为空数组 → 显示全部） */
const modelSupportedSizes = computed(
  () => store.currentModel?.supportedSizes ?? [],
);

/** 分辨率档位（模糊选择）：模型声明了 supportedSizes 时仅显示包含的档位 */
const resolutionTierOptions = computed<
  { label: string; value: '1k' | '2k' | '4k' | 'auto' }[]
>(() => {
  const supported = modelSupportedSizes.value;
  if (supported.length === 0) return DEFAULT_TIER_OPTIONS;
  const tiers = new Set<'1k' | '2k' | '4k'>();
  for (const s of supported) {
    const tier = tierOfSize(s);
    if (tier) tiers.add(tier);
  }
  const list: { label: string; value: '1k' | '2k' | '4k' }[] = [];
  if (tiers.has('1k')) list.push({ value: '1k', label: '1K' });
  if (tiers.has('2k')) list.push({ value: '2k', label: '2K' });
  if (tiers.has('4k')) list.push({ value: '4k', label: '4K' });
  return [{ value: 'auto', label: '自动' }, ...list];
});

/** 比例快捷选择：模型声明了 supportedSizes 时按其包含的比例展示 */
const quickRatioOptions = computed(() => {
  const supported = modelSupportedSizes.value;
  if (supported.length === 0) return DEFAULT_QUICK_RATIOS;
  const ratios = new Set<string>();
  for (const s of supported) {
    const ratio = ratioOfSize(s);
    if (ratio) ratios.add(ratio);
  }
  return [
    { value: 'auto', label: '自动' },
    ...[...ratios].map((r) => ({ value: r, label: r })),
  ];
});

// Upload dialog
const showUploadDialog = ref(false);
const uploadTag = ref('other');
const editingRefNote = ref<null | string>(null);
const editingRefValue = ref('');

function openUploadDialog(tag?: string) {
  if (tag) uploadTag.value = tag;
  showUploadDialog.value = true;
  showPlusMenu.value = false;
}

function closeUploadDialog() {
  showUploadDialog.value = false;
}

function triggerFileFromDialog() {
  emit('triggerUpload', uploadTag.value);
}

function handleRefUploaded() {
  // After upload, auto-generate note based on tag
  const tagInfo = store.tagOptions.find((t) => t.id === uploadTag.value);
  if (tagInfo && props.refImages.length > 0) {
    const lastRef = props.refImages[props.refImages.length - 1];
    if (lastRef && !lastRef.label) {
      emit('updateRefNotes', lastRef.id, tagInfo.label);
    }
  }
  showUploadDialog.value = false;
}

function startEditNote(id: string, currentLabel: string) {
  editingRefNote.value = id;
  editingRefValue.value = currentLabel;
}

function saveEditNote() {
  if (editingRefNote.value) {
    emit('updateRefNotes', editingRefNote.value, editingRefValue.value);
    editingRefNote.value = null;
    editingRefValue.value = '';
  }
}

function cancelEditNote() {
  editingRefNote.value = null;
  editingRefValue.value = '';
}

function getTagLabel(tagId: string) {
  return store.tagOptions.find((t) => t.id === tagId)?.label || '其他';
}

function getTagColor(tagId: string) {
  return store.tagOptions.find((t) => t.id === tagId)?.color || '#6b7280';
}

// Optimized prompt preview
const showOptimizedPreview = ref(false);
const optimizedPreview = ref('');
const isOptimizing = ref(false);

// Modify dialog
const showModifyDialog = ref(false);
const modifyingImg = ref<AiGeneratedImage | null>(null);
const modifyFeedback = ref('');

// Lightbox
const showLightbox = ref(false);
const lightboxImage = ref<AiGeneratedImage | null>(null);

// Check results
const checkResults = ref<any>(null);

// Templates drawer
const showTemplatesDrawer = ref(false);
const templateHint = ref('');
const lastAppliedTemplateId = ref<null | string>(null);
const backendTemplates = computed<AdTemplate[]>(() =>
  store.templates.map((t) => ({
    id: t.templateId,
    backendId: t.id,
    name: t.name,
    category: t.category,
    icon: t.icon ?? 'mdi:apps',
    description: t.description ?? '',
    promptTemplate: t.promptTemplate,
    promptHint: t.promptHint ?? '',
    recommendedModel: t.recommendedModel ?? '',
    recommendedModelLabel: t.recommendedModelLabel ?? '',
    channelId: t.channelId ?? null,
    channelName: t.channelName ?? '',
    defaultQuality: t.defaultQuality ?? '',
    defaultSize: t.defaultSize ?? '',
    printSize: t.printSize ?? '',
    source: t.source ?? 0,
    coverImageUrl: t.coverImageUrl ?? '',
    usageCount: t.usageCount ?? 0,
  })),
);
const templateCategories = computed(() =>
  getTemplatesByCategory(
    backendTemplates.value.length > 0 ? backendTemplates.value : undefined,
  ),
);
// 模板抽屉：每分类默认展示前 4 个，超出部分通过「查看更多」展开
const expandedTemplateCats = ref<Set<string>>(new Set());
const TEMPLATE_PREVIEW_LIMIT = 4;

/** 某分类当前应展示的模板列表（未展开时截断前 4 个） */
function visibleTemplates(list: AdTemplate[]): AdTemplate[] {
  return expandedTemplateCats.value.has(list[0]?.category ?? '')
    ? list
    : list.slice(0, TEMPLATE_PREVIEW_LIMIT);
}

function toggleTemplateCategory(cat: string) {
  const next = new Set(expandedTemplateCats.value);
  if (next.has(cat)) next.delete(cat);
  else next.add(cat);
  expandedTemplateCats.value = next;
}

// 存为模板弹窗（对话沉淀 → 用户共享模板）
const showSaveTemplateDialog = ref(false);
const saveTemplateTaskId = ref<null | string>(null);
const saveTemplateCategory = ref('');
const saveTemplateName = ref('');
const saveTemplateDesc = ref('');
const saveTemplateBusy = ref(false);
const saveTemplateCategoryOptions = computed(() => [
  ...new Set(Object.keys(templateCategories.value).filter(Boolean)),
]);

// 生成质量选项（替换原 1K/2K/4K 分辨率档位：分辨率属于 size/比例维度，质量才是 auto/low/medium/high）
const qualityOptions = [
  { value: 'auto', label: '自动', desc: '模型自动选择最优质量（推荐）' },
  { value: 'low', label: '快速', desc: '低质量·生成快·更省' },
  { value: 'medium', label: '标准', desc: '中等质量·速度与细节均衡' },
  { value: 'high', label: '精细', desc: '高质量·细节丰富·更贵' },
];

const TEMPLATE_IMAGES: Record<string, string> = {
  'door-sign': '/images/fede/airbag-01.jpg',
  'door-sign-3d': '/images/fede/cme-01.jpg',
  'vi-logo': '/images/fede/bratina-01.jpg',
  'vi-business-card': '/images/fede/fede.jpg',
  'vi-envelope': '/images/fede/things-01.jpg',
  'dm-flyer': '/images/fede/postop-01.jpg',
  'dm-menu': '/images/fede/unisve-01.jpg',
  'wall-party': '/images/fede/raccagni-01.jpg',
  'wall-enterprise': '/images/fede/abbracci-01.jpg',
  'wall-school': '/images/fede/airbag-02.jpg',
  '3d-interior': '/images/fede/cme-02.jpg',
  '3d-exhibition': '/images/fede/unisve-02.jpg',
};

function templateImage(tpl: AdTemplate): string {
  // 用户共享模板优先展示真实生成图封面；内置模板回退到本地占位图
  return (
    tpl.coverImageUrl || TEMPLATE_IMAGES[tpl.id] || '/images/fede/fede.jpg'
  );
}

function toggleTemplates() {
  showTemplatesDrawer.value = !showTemplatesDrawer.value;
  showPlusMenu.value = false;
}

function applyTemplate(tpl: AdTemplate) {
  const styleName = store.styleKeyword;
  const inputs: Record<string, string> = {
    name: '「品牌名称」',
    brand: '「品牌名称」',
    company: '「公司名称」',
    organization: '「单位名称」',
    school: '「学校名称」',
    industry: '广告行业',
    style: styleName,
    material: '铝塑板/发光字',
    title: '活动主题',
    space: '空间类型',
    event: '展会名称',
  };
  chatInput.value = buildPrompt(tpl, inputs);
  lastAppliedTemplateId.value = tpl.id;

  // 应用模板沉淀时的参数设置（模型/尺寸/质量），生成张数固定 1 张
  const warnings: string[] = [];
  if (tpl.recommendedModel) {
    const target = store.modelOptions.find(
      (m) =>
        (tpl.channelId &&
          m.channelId === tpl.channelId &&
          m.modelName === tpl.recommendedModel) ||
        (!tpl.channelId && m.modelName === tpl.recommendedModel),
    );
    if (target) {
      if (target.disabled) {
        warnings.push(
          `模板推荐的模型「${tpl.recommendedModelLabel || tpl.recommendedModel}」当前已禁用，请手动选择其他模型`,
        );
      } else {
        store.selectedModel = target.id;
      }
    } else {
      warnings.push(
        `模板推荐的模型「${tpl.recommendedModelLabel || tpl.recommendedModel}」未配置或已下架，请手动选择模型`,
      );
    }
  }
  if (
    tpl.defaultQuality &&
    qualityOptions.some((q) => q.value === tpl.defaultQuality)
  ) {
    store.quality = tpl.defaultQuality;
  }
  if (tpl.defaultSize && /^\d+x\d+$/i.test(tpl.defaultSize)) {
    store.exactSize = tpl.defaultSize;
    store.resolutionTier = 'auto';
  }
  store.generateCount = 1;

  templateHint.value =
    warnings.length > 0
      ? `已填入「${tpl.name}」提示词（${warnings.join('；')}）`
      : `已填入「${tpl.name}」提示词，已同步模板的模型/尺寸/质量参数，可继续编辑`;
  window.setTimeout(() => {
    templateHint.value = '';
  }, 4000);
  nextTick(() => textareaRef.value?.focus());
  // 选用一次：热度 +1（仅后端模板）
  if (tpl.backendId) {
    incrementAiTemplateUsage(tpl.backendId).catch(() => {});
  }
}

/** 复制共享模板的原始提示词到剪贴板（「共享提示词参考」） */
function copyTemplatePrompt(tpl: AdTemplate) {
  navigator.clipboard
    ?.writeText(tpl.promptTemplate)
    .then(() => {
      templateHint.value = `已复制「${tpl.name}」提示词，可粘贴到任意输入框`;
      window.setTimeout(() => {
        templateHint.value = '';
      }, 2500);
    })
    .catch(() => {
      templateHint.value = '复制失败，请手动选择提示词复制';
      window.setTimeout(() => {
        templateHint.value = '';
      }, 2500);
    });
}

/** 打开「存为模板」弹窗（仅限有生成结果的成功任务） */
function openSaveTemplateDialog(msg: ChatMessage) {
  if (!msg.taskId || !msg.images?.length) return;
  saveTemplateTaskId.value = msg.taskId;
  saveTemplateCategory.value = '';
  saveTemplateName.value = '';
  saveTemplateDesc.value = '';
  showSaveTemplateDialog.value = true;
}

/** 确认沉淀：按分类把本次生成的提示词 + 封面图存入模板库 */
async function confirmSaveTemplate() {
  const taskId = saveTemplateTaskId.value;
  const category = saveTemplateCategory.value.trim();
  if (!taskId || saveTemplateBusy.value) return;
  if (!category) {
    templateHint.value = '请选择或输入模板分类';
    window.setTimeout(() => {
      templateHint.value = '';
    }, 2500);
    return;
  }
  saveTemplateBusy.value = true;
  try {
    await createAiTemplateFromGeneration({
      taskId,
      category,
      name: saveTemplateName.value.trim() || null,
      description: saveTemplateDesc.value.trim() || null,
      promptHint: null,
    });
    await store.refreshTemplates();
    showSaveTemplateDialog.value = false;
    templateHint.value = `已存入模板库（分类：${category}），可打开「创意模版」查看`;
    window.setTimeout(() => {
      templateHint.value = '';
    }, 3000);
  } catch (error: unknown) {
    alert(
      error instanceof Error
        ? `保存模板失败：${error.message}`
        : '保存模板失败，请稍后重试',
    );
  } finally {
    saveTemplateBusy.value = false;
  }
}

// Computed
const currentModel = computed(() => store.currentModel);
const hasContent = computed(() => chatInput.value.trim().length > 0);

function getTagInfo(tagId: string) {
  return (
    store.tagOptions.find((t) => t.id === tagId) ??
    store.tagOptions[5] ?? { id: 'other', label: '其他', color: '#6b7280' }
  );
}

function scrollToBottom() {
  nextTick(() => {
    // 页面级滚动：输入区 fixed 在视口底部，滚到 body 最底部即可
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
}

const showBackToBottom = ref(false);
const BACK_TO_BOTTOM_THRESHOLD = 320;

function onWindowScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  showBackToBottom.value =
    window.scrollY + BACK_TO_BOTTOM_THRESHOLD < maxScroll;
}

function addMessage(
  role: 'assistant' | 'user',
  content: string,
  extra?: Partial<ChatMessage>,
) {
  emit('addMessage', role, content, extra);
}

// ── Generation ──
async function analyzeAndGenerate() {
  const input = chatInput.value.trim();
  if (!input) return;
  if (props.isProcessing) return; // 防止重复提交

  const refTags = props.refImages
    .map((r) => getTagInfo(r.tag).label)
    .filter(Boolean)
    .join('、');
  const modelLabel = currentModel.value?.shortLabel || 'GPT-image2';

  // 文本对话模型：直接发送原文，不拼接设计参数；
  // 图片模型：按已选参数拼接（未选/选择「无」的不追加，用户已描述过的不重复追加）
  const optimized = isTextModel.value ? input : buildOptimizedPrompt(input);
  store.optimizedPrompt = optimized;

  let userContent = input;
  if (props.refImages.length > 0) userContent += `\n[参考图: ${refTags}]`;
  addMessage('user', userContent || '根据参考图生成设计', {
    refImages: props.refImages.length > 0 ? [...props.refImages] : undefined,
    optimizedPrompt: isTextModel.value ? undefined : optimized,
  });

  emit('processingChange', true);
  chatInput.value = '';
  showPlusMenu.value = false;
  const startTime = Date.now();
  startElapsedTimer();

  try {
    const images = await generateImages(input, {
      model: currentModel.value?.id,
      templateId: isTextModel.value ? null : lastAppliedTemplateId.value,
      count: isTextModel.value ? 1 : store.generateCount,
      referenceImages: props.refImages,
      autoOptimize: !isTextModel.value && store.autoOptimizePrompt,
    });

    store.revisionCounter++;
    store.generatedImages = images;
    store.selectedImage = images[0]?.id ?? null;
    store.revisionHistory.unshift({
      Id: `dr-gen-${Date.now()}`,
      DesignSessionId: store.activeSession?.id ?? '',
      RevisionNo: store.revisionCounter,
      ImageUrl: images[0]?.url ?? '',
      ThumbnailUrl: images[0]?.url ?? '',
      Prompt: input,
      OptimizedPrompt: optimized,
      UserFeedback: null,
      Source: 'AI_GptImage2',
      Status: store.revisionCounter === 1 ? 'Current' : 'Archived',
      Width: store.designWidth * 10,
      Height: store.designHeight * 10,
      FileSize: 250_000,
      CreatedAt: new Date().toISOString(),
    });
    if (store.revisionCounter === 1) store.currentRevision = 1;

    // 文本模型：直接展示模型返回的文本
    if (isTextModel.value) {
      const text = store.lastGenerationText || '（模型未返回内容）';
      const costText =
        store.lastChargedAmount > 0
          ? `，本次消耗 ¥${formatPrice(store.lastChargedAmount)}（${
              AiPricingUnitLabels[store.lastPricingUnit] ?? '元/次'
            }）`
          : '';
      emit(
        'replaceLastMessage',
        `${text}\n\n（耗时 ${formatDuration(Date.now() - startTime)}${costText}）`,
        {
          cost:
            store.lastChargedAmount > 0 ? store.lastChargedAmount : undefined,
        },
      );
      return;
    }
    const costText =
      store.lastChargedAmount > 0
        ? `，本次消耗 ¥${formatPrice(store.lastChargedAmount)}（${
            AiPricingUnitLabels[store.lastPricingUnit] ?? '元/张'
          }）`
        : '';
    const summary =
      images.length > 0
        ? `已生成 ${images.length} 套方案（${modelLabel}），耗时 ${formatDuration(Date.now() - startTime)}${costText}，点击查看大图，或「重生成」换一批。`
        : '生成完成，但没有返回图片，请稍后重试。';
    emit('replaceLastMessage', summary, { images });
  } catch (error: unknown) {
    // 用户点击「停止」：不展示失败信息，追加一条「已停止」提示（未扣费）
    if (
      error instanceof Error &&
      (error.name === 'AbortError' ||
        ((error as { cause?: unknown }).cause instanceof Error &&
          ((error as { cause?: Error }).cause as Error).name === 'AbortError'))
    ) {
      emit('replaceLastMessage', '已停止生成，本次未扣费。');
      return;
    }
    const message =
      error instanceof Error ? error.message : '未知错误，请稍后重试';
    const taskErr = error as {
      externalImageUrls?: string[];
      taskId?: string;
    };
    emit(
      'replaceLastMessage',
      `生成失败：${message}（耗时 ${formatDuration(Date.now() - startTime)}）`,
      {
        isCheckResult: true,
        retry: { prompt: input, count: store.generateCount },
        taskId: taskErr.taskId,
        // 上游已返回图片但首次落库失败：标记「可重新加载落库」
        persistFailed:
          Boolean(taskErr.taskId) &&
          (taskErr.externalImageUrls?.length ?? 0) > 0,
      },
    );
  } finally {
    stopElapsedTimer();
    lastAppliedTemplateId.value = null;
    emit('processingChange', false);
  }
}

// ── Prompt optimization ──
async function optimizePrompt() {
  if (!chatInput.value.trim()) return;
  isOptimizing.value = true;
  showPlusMenu.value = false;
  const styleName = store.styleKeyword;
  const palName =
    store.colorPalettes.find((p) => p.id === store.selectedPalette)?.name || '';
  const sizeText = buildSizeText();
  const params: string[] = [];
  if (styleName) params.push(`${styleName}风格`);
  if (sizeText) params.push(sizeText);
  if (palName) params.push(`${palName}配色`);
  try {
    // 优先走后端「提示词优化」接口（deepseek 等文本模型，可配置开关/模型）
    const result = await optimizeAiPrompt({
      prompt: chatInput.value.trim(),
      styleName: styleName || null,
      paletteName: palName || null,
      sizeText: sizeText || null,
    });
    optimizedPreview.value = result.optimizedPrompt;
  } catch {
    // 后端不可用/未启用优化：回退本地结构化拼接
    optimizedPreview.value = [
      `${chatInput.value.trim()}，`,
      ...params,
      '高对比度、视觉冲击力强、适合广告行业使用，',
      '专业印刷级质量，CMYK色域兼容。',
    ].join('');
  }
  showOptimizedPreview.value = true;
  isOptimizing.value = false;
}

function adoptOptimized() {
  chatInput.value = optimizedPreview.value;
  showOptimizedPreview.value = false;
}

// ── Image actions ──
function selectImage(img: AiGeneratedImage) {
  store.selectedImage = img.id;
  addMessage('user', `选中方案 ${img.title}`);
}

function openLightbox(img: AiGeneratedImage) {
  emit('openLightbox', img);
}

function openModifyDialog(img: AiGeneratedImage) {
  emit('openModify', img);
}

function downloadImage(url: string, title: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.jpg`;
  a.click();
}

// ── Check ──
function runProductionCheck() {
  showPlusMenu.value = false;
  emit('runProductionCheck');
}

// ── Clear / Transfer ──
function clearSession() {
  if (confirm('清空当前会话？')) {
    emit('addMessage', 'assistant', '会话已清空，开始新的创作吧。');
  }
}

function transferToDesigner() {
  if (confirm('确认转人工设计？')) {
    addMessage('user', '转人工设计');
    addMessage('assistant', '已转人工设计。设计师将接手并与你确认最终方案。');
    showPlusMenu.value = false;
  }
}

// ── Menu toggles ──
function togglePlusMenu() {
  showPlusMenu.value = !showPlusMenu.value;
  showModelMenu.value = false;
  showCountMenu.value = false;
  showRatioMenu.value = false;
  showQualityMenu.value = false;
  showTemplatesDrawer.value = false;
}

function toggleModelMenu() {
  showModelMenu.value = !showModelMenu.value;
  showPlusMenu.value = false;
  showCountMenu.value = false;
  showRatioMenu.value = false;
  showQualityMenu.value = false;
  // 打开下拉时刷新一次模型列表：管理端新增渠道/模型后无需刷新页面即可生效
  if (showModelMenu.value) {
    void store.refreshModelOptions();
  }
}

function toggleCountMenu() {
  showCountMenu.value = !showCountMenu.value;
  showPlusMenu.value = false;
  showModelMenu.value = false;
  showQualityMenu.value = false;
}

function toggleRatioMenu() {
  showRatioMenu.value = !showRatioMenu.value;
  showPlusMenu.value = false;
  showModelMenu.value = false;
  showCountMenu.value = false;
  showQualityMenu.value = false;
}

function toggleQualityMenu() {
  showQualityMenu.value = !showQualityMenu.value;
  showPlusMenu.value = false;
  showModelMenu.value = false;
  showCountMenu.value = false;
  showRatioMenu.value = false;
}

// Apply a quick ratio from the toolbar dropdown
function applyQuickRatio(value: string) {
  store.selectedAspectRatio = value;
  // 切换到「比例」模式时清空精确尺寸，避免精确尺寸覆盖比例选择
  store.exactSize = '';
  if (value === 'auto' || value === 'custom') {
    // 自动/自定义：解除设计类型对尺寸的锁定，尺寸交给比例/自定义控制
    store.selectedDesignType = '';
    if (value === 'custom') {
      store.sizeSource = 'custom'; // 显式自定义尺寸：以选择的尺寸为准
    } else {
      store.designWidth = 0;
      store.designHeight = 0;
      store.sizeSource = 'none';
    }
    showRatioMenu.value = false;
    return;
  }
  const parts = value.split(':');
  if (parts.length === 2) {
    const [rwStr, rhStr] = parts as [string, string];
    const rw = Number.parseFloat(rwStr);
    const rh = Number.parseFloat(rhStr);
    if (rw && rh) {
      // 未选设计类型/尺寸时用默认工作宽度 100，保证比例可计算且提示词可附加尺寸
      const w = store.designWidth || 100;
      store.designWidth = Math.round(w);
      store.designHeight = Math.round(((w * rh) / rw) * 10) / 10;
      // 用户显式选择比例：以选择的尺寸为准，设计类型不再匹配
      store.selectedDesignType = '';
      store.sizeSource = 'ratio';
    }
  }
  showRatioMenu.value = false;
}

/** 精确尺寸按钮文案：精确尺寸 > 比例+档位 > 自动 */
const sizeButtonText = computed(() => {
  if (store.exactSize) return store.exactSize;
  const ratio =
    store.selectedAspectRatio === 'auto'
      ? '自动'
      : store.selectedAspectRatio === 'custom'
        ? '自定义'
        : store.selectedAspectRatio;
  return store.resolutionTier === 'auto'
    ? ratio
    : `${ratio} · ${store.resolutionTier.toUpperCase()}`;
});

/** 精确尺寸去重：同一档内仅保留长宽对中的一种（横版优先），并记录对调后的尺寸，
 * 避免 1280x848 / 848x1280 这类只是长宽互换的重复选项。
 */
const compactTierSizes = computed(() => {
  // 后台声明了 supportedSizes：按档位分组展示支持项（代表项取横版/方形，竖版可对调）
  const supported = modelSupportedSizes.value;
  if (supported.length > 0) {
    const groups: {
      sizes: {
        flippedSize: string;
        name: string;
        ratio: string;
        size: string;
      }[];
      tier: '1k' | '2k' | '4k';
      tierLabel: string;
    }[] = [];
    for (const size of supported) {
      const tier = tierOfSize(size);
      if (!tier) continue;
      let group = groups.find((g) => g.tier === tier);
      if (!group) {
        group = { tier, tierLabel: tierLabelOf(tier), sizes: [] };
        groups.push(group);
      }
      const [wStr, hStr] = size.split('x') as [string, string];
      const w = Number.parseInt(wStr, 10);
      const h = Number.parseInt(hStr, 10);
      const horizontal = `${Math.max(w, h)}x${Math.min(w, h)}`;
      const flipped = `${Math.min(w, h)}x${Math.max(w, h)}`;
      // 同一档内长宽互换视为同一尺寸，仅保留横版代表项（竖版通过「对调长宽」获得）
      if (group.sizes.some((s) => s.size === horizontal)) continue;
      group.sizes.push({
        name: horizontal,
        ratio: ratioOfSize(size) || `${w}:${h}`,
        size: horizontal,
        flippedSize: flipped,
      });
    }
    return groups;
  }

  // 未配置 supportedSizes：回退 30 档预置表（同一档内仅保留长宽对中的一种，横版优先）
  return GPT_IMAGE_TIER_SIZES.map((g) => {
    const seen = new Set<string>();
    const sizes = g.sizes
      .map((s) => {
        const [wStr, hStr] = s.size.split('x') as [string, string];
        const w = Number.parseInt(wStr, 10);
        const h = Number.parseInt(hStr, 10);
        return { ...s, w, h };
      })
      .filter((s) => {
        const key = `${Math.min(s.w, s.h)}x${Math.max(s.w, s.h)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((s) => ({
        ratio: s.ratio,
        name: s.name,
        // 横版/方形作为代表项，竖版可通过「对调长宽」切换
        size: s.w >= s.h ? s.size : `${s.h}x${s.w}`,
        flippedSize: s.w >= s.h ? `${s.h}x${s.w}` : s.size,
      }));
    return { ...g, sizes };
  });
});

/** 预览对调后的尺寸（不修改状态） */
function swapPreview(size: string): string {
  const [wStr, hStr] = size.split('x') as [string, string];
  if (!wStr || !hStr) return size;
  return `${hStr}x${wStr}`;
}

/** 对调长宽：1280x848 → 848x1280（横竖互切） */
function swapSelectedSize() {
  if (!store.exactSize) return;
  const [wStr, hStr] = store.exactSize.split('x') as [string, string];
  if (!wStr || !hStr) return;
  store.exactSize = `${hStr}x${wStr}`;
}

/** 选择 30 档中的精确尺寸：与「比例/模糊档位」互斥，尺寸自带比例与分辨率。
 * 不关闭弹窗：选中后可立即「对调长宽」，或改选比例/档位切换。 */
function pickExactSize(size: string) {
  store.exactSize = size;
  store.resolutionTier = 'auto';
}

/** 选择模糊档位（1K/2K/4K）：与「精确尺寸」互斥，默认取该档最大分辨率 */
function pickResolutionTier(tier: '1k' | '2k' | '4k' | 'auto') {
  store.resolutionTier = tier;
  store.exactSize = '';
  showRatioMenu.value = false;
}

// ── Textarea auto-height (grows with content, scrollbar appears at max) ──
watch(chatInput, () => {
  nextTick(() => {
    const el = textareaRef.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  });
});

// 模型切换时：当前精确尺寸/档位/比例若不在模型支持列表内，回退到合法默认值
watch(
  () => store.currentModel?.id,
  () => {
    const supported = modelSupportedSizes.value;
    if (supported.length === 0) return;
    const normKeys = supported.map((s) => normalizeSizeKey(s));
    if (
      store.exactSize &&
      !normKeys.includes(normalizeSizeKey(store.exactSize))
    ) {
      store.exactSize = '';
    }
    const tiers = new Set<'1k' | '2k' | '4k'>();
    const ratios = new Set<string>();
    for (const s of supported) {
      const tier = tierOfSize(s);
      if (tier) tiers.add(tier);
      const ratio = ratioOfSize(s);
      if (ratio) ratios.add(ratio);
    }
    if (
      store.resolutionTier !== 'auto' &&
      !tiers.has(store.resolutionTier as '1k' | '2k' | '4k')
    ) {
      store.resolutionTier = 'auto';
    }
    if (
      store.selectedAspectRatio !== 'auto' &&
      store.selectedAspectRatio !== 'custom' &&
      !ratios.has(store.selectedAspectRatio)
    ) {
      store.selectedAspectRatio = 'auto';
      store.sizeSource = 'none';
    }
  },
);

// 新消息/生成状态变化时自动滚动到底部
watch(
  () => props.chatMessages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  },
);
watch(
  () => props.isProcessing,
  async () => {
    await nextTick();
    scrollToBottom();
  },
);

// 新建/切换会话时清空输入区与菜单状态
watch(
  () => store.activeSessionId,
  () => {
    chatInput.value = '';
    templateHint.value = '';
    showPlusMenu.value = false;
    showModelMenu.value = false;
    showCountMenu.value = false;
    showRatioMenu.value = false;
    showQualityMenu.value = false;
    showTemplatesDrawer.value = false;
  },
);
// Close popups on outside click
function onWindowClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (
    !target.closest('.input-plus-area') &&
    !target.closest('.tpl-drawer') &&
    !target.closest('[data-toolbar-tpl]')
  ) {
    showPlusMenu.value = false;
  }
  if (!target.closest('.model-menu-area')) showModelMenu.value = false;
  if (!target.closest('.count-menu-area')) showCountMenu.value = false;
  if (!target.closest('.ratio-menu-area')) showRatioMenu.value = false;
  if (!target.closest('.quality-menu-area')) showQualityMenu.value = false;
}

// Click templates btn — use stop + ensure other menus closed
function toggleTemplatesSafe(e: MouseEvent) {
  e.stopPropagation();
  showPlusMenu.value = false;
  showModelMenu.value = false;
  showCountMenu.value = false;
  showQualityMenu.value = false;
  showTemplatesDrawer.value = !showTemplatesDrawer.value;
}

// Click plus menu scene button — trigger upload directly
function handlePlusSceneClick(tagId: string, e: MouseEvent) {
  e.stopPropagation();
  showPlusMenu.value = false;
  nextTick(() => emit('triggerUpload', tagId));
}

// Open settings drawer from plus menu — same as toolbar settings button
function openSettingsFromPlus() {
  showPlusMenu.value = false;
  nextTick(() => emit('openSettings'));
}

// ── 调用留痕查看 / 图片重新落库 ──
/** JSON 美化输出（供留痕面板展示完整请求/响应参数，便于追踪问题） */
function prettyJson(value: null | string): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

const traceLoading = ref<string>('');

/** 展开/收起某条消息的「调用详情」（发送内容/提示词/完整API参数/返回内容/临时图片URL） */
async function toggleTrace(msg: ChatMessage) {
  if (!msg.taskId) return;
  if (msg.traceOpen) {
    msg.traceOpen = false;
    return;
  }
  if (msg.trace) {
    msg.traceOpen = true;
    return;
  }
  traceLoading.value = msg.taskId;
  try {
    const result = await queryAiGenerationTask(msg.taskId);
    msg.trace = {
      taskId: result.taskId,
      status: result.status,
      model: result.model,
      failReason: result.failReason ?? null,
      prompt: result.prompt ?? null,
      optimizedPrompt: result.optimizedPrompt ?? null,
      requestPayloadJson: result.requestPayloadJson ?? null,
      responsePayloadJson: result.responsePayloadJson ?? null,
      externalImageUrls: result.externalImageUrls ?? [],
      text: result.text ?? null,
      totalTokens: result.totalTokens ?? null,
      chargedAmount: result.chargedAmount ?? 0,
      pricingUnit: result.pricingUnit ?? 0,
    };
    msg.traceOpen = true;
  } catch {
    msg.trace = null;
  } finally {
    traceLoading.value = '';
  }
}

const persistLoading = ref(false);

/** 图片重新落库：从任务留痕的上游临时 URL 重新下载并入库（成功后通知父级刷新会话） */
async function onRetryPersist(msg: ChatMessage) {
  if (!msg.taskId || persistLoading.value) return;
  persistLoading.value = true;
  try {
    await retryPersistAiImages(msg.taskId);
    emit('retryPersist', msg);
  } catch (error: unknown) {
    alert(error instanceof Error ? error.message : '重新落库失败，请稍后重试');
  } finally {
    persistLoading.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', onWindowClick);
  window.addEventListener('scroll', onWindowScroll, { passive: true });
  scrollToBottom();
});

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick);
  window.removeEventListener('scroll', onWindowScroll);
  stopElapsedTimer();
});
</script>

<template>
  <div class="ai-chat">
    <div ref="chatContainer" class="chat-messages">
      <!-- Welcome -->
      <div v-if="chatMessages.length === 0" class="chat-welcome">
        <div class="welcome-mark">
          <svg
            viewBox="0 0 24 24"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01"
            />
          </svg>
        </div>
        <h2 class="welcome-title">Hey AI 创作</h2>
        <p class="welcome-desc">
          描述你想要的设计效果，或从底部「创意模版」选一个开始。AI
          将为你生成专业方案。
        </p>
        <div class="welcome-presets">
          <button
            v-for="p in store.sizePresets.slice(0, 5)"
            :key="p.label"
            class="welcome-preset-btn"
            @click="
              store.selectedDesignType = p.label;
              store.selectedAspectRatio =
                store.designTypeRatios[p.label] || 'auto';
              store.designWidth = p.w;
              store.designHeight = p.h;
              store.sizeSource = 'designType';
              chatInput = `做一个${p.label}，${p.w}×${p.h}cm`;
            "
          >
            {{ p.label }} {{ p.w }}×{{ p.h }}cm
          </button>
        </div>
      </div>

      <div class="chat-messages-padded">
        <!-- Messages -->
        <template v-for="msg in chatMessages" :key="msg.id">
          <!-- User message -->
          <div v-if="msg.role === 'user'" class="msg-row msg-user">
            <div class="msg-user-line">
              <div class="msg-bubble msg-bubble-user">
                <!-- Uploaded reference images: top of bubble -->
                <div
                  v-if="msg.refImages && msg.refImages.length"
                  class="msg-refs"
                >
                  <div
                    v-for="ref in msg.refImages"
                    :key="ref.id"
                    class="msg-ref"
                  >
                    <img :src="ref.dataUrl" class="msg-ref-img" />
                    <span class="msg-ref-tag">{{
                      getTagInfo(ref.tag).label
                    }}</span>
                  </div>
                </div>
                <!-- Multi-line content: collapsible text block with hover-to-expand -->
                <div
                  v-if="msg.content.split('\n').length > 3"
                  class="msg-content msg-content-collapsible"
                  :title="msg.content"
                >
                  {{ msg.content.split('\n').slice(0, 2).join('\n')
                  }}<span class="msg-more-hint">
                    …（共
                    {{ msg.content.split('\n').length }}
                    行，悬停查看全部）</span
                  >
                </div>
                <div v-else class="msg-content">{{ msg.content }}</div>
                <!-- 系统加工后的完整提示词（灰色小字） -->
                <div v-if="msg.optimizedPrompt" class="msg-optimized-prompt">
                  {{ msg.optimizedPrompt }}
                </div>
              </div>
              <div class="msg-avatar msg-avatar-user">
                <img
                  v-if="userAvatarUrl"
                  :src="userAvatarUrl"
                  class="msg-avatar-img"
                  alt=""
                />
                <template v-else>{{ userAvatarText }}</template>
              </div>
            </div>
            <div class="msg-time">{{ formatMsgTime(msg.time) }}</div>
          </div>

          <!-- AI message -->
          <div v-else class="msg-row msg-ai">
            <div class="msg-avatar">AI</div>
            <div class="msg-body">
              <div class="msg-bubble msg-bubble-ai">
                <div
                  class="msg-content"
                  v-html="msg.content.replace(/\n/g, '<br>')"
                ></div>

                <!-- 生成失败：重试按钮 -->
                <div v-if="msg.retry && !isProcessing" class="msg-retry-row">
                  <button class="msg-retry-btn" @click="emit('retry', msg)">
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.935 6M4 12h16M4 16v5h.582m15.356-2A8.001 8.001 0 0019.065 18"
                      />
                    </svg>
                    重试
                  </button>
                </div>

                <!-- 调用留痕：发送内容/提示词/完整API参数/返回内容/临时图片URL -->
                <div v-if="msg.taskId" class="msg-trace">
                  <button class="msg-trace-toggle" @click="toggleTrace(msg)">
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h3m8-16h3a2 2 0 012 2v14a2 2 0 01-2 2h-3m-5-18v18m-3-8h6"
                      />
                    </svg>
                    {{ msg.traceOpen ? '收起调用详情' : '调用详情' }}
                    <span
                      v-if="traceLoading === msg.taskId"
                      class="trace-loading"
                      >…</span
                    >
                  </button>
                  <button
                    v-if="msg.images && msg.images.length"
                    class="msg-trace-toggle msg-save-template-btn"
                    title="把本次生成的提示词与封面图按分类沉淀为共享模板"
                    @click="openSaveTemplateDialog(msg)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                    存为模板
                  </button>
                  <button
                    v-if="msg.persistFailed && !isProcessing"
                    class="msg-retry-btn msg-persist-btn"
                    :disabled="persistLoading"
                    @click="onRetryPersist(msg)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" />
                    </svg>
                    {{ persistLoading ? '落库中...' : '重新加载落库' }}
                  </button>
                </div>

                <!-- 留痕详情面板（懒加载，仅展开时请求后端任务留痕） -->
                <div v-if="msg.traceOpen && msg.trace" class="msg-trace-panel">
                  <div class="trace-row">
                    <span class="trace-label">模型</span>
                    <span class="trace-value">{{ msg.trace.model }}</span>
                  </div>
                  <div
                    v-if="msg.trace.status === 20 || msg.trace.status === 30"
                    class="trace-row"
                  >
                    <span class="trace-label">状态</span>
                    <span
                      class="trace-value"
                      :class="
                        msg.trace.status === 20 ? 'trace-ok' : 'trace-err'
                      "
                    >
                      {{ msg.trace.status === 20 ? '成功' : '失败' }}
                    </span>
                  </div>
                  <div v-if="msg.trace.failReason" class="trace-row">
                    <span class="trace-label">失败原因</span>
                    <span class="trace-value">{{ msg.trace.failReason }}</span>
                  </div>
                  <div v-if="msg.trace.prompt" class="trace-row">
                    <span class="trace-label">发送内容</span>
                    <span class="trace-value trace-pre">{{
                      msg.trace.prompt
                    }}</span>
                  </div>
                  <div v-if="msg.trace.optimizedPrompt" class="trace-row">
                    <span class="trace-label">加工后提示词</span>
                    <span class="trace-value trace-pre">{{
                      msg.trace.optimizedPrompt
                    }}</span>
                  </div>
                  <div v-if="msg.trace.text" class="trace-row">
                    <span class="trace-label">返回文本</span>
                    <span class="trace-value trace-pre">{{
                      msg.trace.text
                    }}</span>
                  </div>
                  <div v-if="msg.trace.requestPayloadJson" class="trace-row">
                    <span class="trace-label">请求参数</span>
                    <pre class="trace-json">{{
                      prettyJson(msg.trace.requestPayloadJson)
                    }}</pre>
                  </div>
                  <div v-if="msg.trace.responsePayloadJson" class="trace-row">
                    <span class="trace-label">返回内容</span>
                    <pre class="trace-json">{{
                      prettyJson(msg.trace.responsePayloadJson)
                    }}</pre>
                  </div>
                  <div
                    v-if="
                      msg.trace.externalImageUrls &&
                      msg.trace.externalImageUrls.length
                    "
                    class="trace-row"
                  >
                    <span class="trace-label">临时图片URL</span>
                    <ul class="trace-urls">
                      <li
                        v-for="(u, i) in msg.trace.externalImageUrls"
                        :key="i"
                      >
                        <a
                          :href="u"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ u }}</a
                        >
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Generated images -->
                <div v-if="msg.images && msg.images.length" class="msg-images">
                  <div
                    class="images-grid"
                    :class="[msg.images.length <= 4 ? 'grid-2' : 'grid-3']"
                  >
                    <div
                      v-for="img in msg.images"
                      :key="img.id"
                      class="image-card"
                      @click="openLightbox(img)"
                    >
                      <div class="image-card-preview">
                        <img
                          :src="img.url"
                          class="image-card-img"
                          loading="lazy"
                        />
                        <div class="image-card-overlay">
                          <button
                            class="image-card-edit-btn"
                            @click.stop="openModifyDialog(img)"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <path
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            编辑
                          </button>
                        </div>
                      </div>
                      <div class="image-card-footer">
                        <span class="image-card-title">{{ img.title }}</span>
                        <div class="image-card-actions">
                          <button
                            class="image-card-action-btn"
                            :class="{
                              selected: store.selectedImage === img.id,
                            }"
                            @click.stop="selectImage(img)"
                          >
                            {{
                              store.selectedImage === img.id ? '已选' : '选择'
                            }}
                          </button>
                          <button
                            class="image-card-action-btn modify"
                            @click.stop="openModifyDialog(img)"
                          >
                            局部修改
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Image action bar -->
                  <div class="image-action-bar">
                    <button
                      class="action-btn"
                      title="下载"
                      @click="
                        downloadImage(msg.images[0]!.url, msg.images[0]!.title)
                      "
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                    <button class="action-btn" title="满意">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.764 7.527A2 2 0 0114.236 22H10a2 2 0 01-2-2V9.828a2 2 0 01.586-1.414l2-2A2 2 0 0112 5h.828a2 2 0 011.414.586l.343.343a2 2 0 002.415 0l.343-.343a2 2 0 011.414-.586z"
                        />
                      </svg>
                    </button>
                    <button class="action-btn" title="不满意">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M10 14H5.236a2 2 0 01-1.789-2.894l3.764-7.527A2 2 0 018.764 2H12a2 2 0 012 2v8.828a2 2 0 01-.586 1.414l-2 2A2 2 0 0111 17h-.828a2 2 0 01-1.414-.586l-.343-.343a2 2 0 00-2.415 0l-.343.343A2 2 0 014.586 17H3a2 2 0 01-2-2z"
                        />
                      </svg>
                    </button>
                    <div class="action-divider"></div>
                    <button
                      class="action-btn regenerate"
                      @click="emit('regenerate')"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.935 6M4 12h16M4 16v5h.582m15.356-2A8.001 8.001 0 0019.065 18"
                        />
                      </svg>
                      重生成
                    </button>
                  </div>
                </div>
              </div>
              <div class="msg-time">
                {{ formatMsgTime(msg.time) }}
                <span v-if="msg.cost" class="msg-cost"
                  >本次消耗 ¥{{ formatPrice(msg.cost) }}</span
                >
              </div>
            </div>
          </div>
        </template>

        <!-- Processing -->
        <div v-if="isProcessing" class="msg-row msg-ai">
          <div class="msg-avatar">AI</div>
          <div class="msg-body">
            <div class="msg-bubble msg-bubble-processing">
              <div class="processing-content">
                <div class="processing-spinner"></div>
                <span>{{
                  isTextModel ? 'AI 正在思考...' : 'AI 正在生成设计稿...'
                }}</span>
                <span class="processing-info">
                  {{ currentModel?.shortLabel || 'GPT-image2'
                  }}<template v-if="!isTextModel">
                    · {{ store.generateCount }}张</template
                  >
                  · 已用时 {{ generationElapsed }}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Input area ── -->
    <div
      class="chat-input-area"
      :class="{ 'sidebar-collapsed': sidebarCollapsed }"
    >
      <div class="chat-input-inner">
        <!-- Reference images strip -->
        <div v-if="refImages.length > 0" class="ref-strip">
          <div v-for="ref in refImages" :key="ref.id" class="ref-strip-item">
            <img :src="ref.dataUrl" class="ref-strip-thumb" />
            <div class="ref-strip-meta">
              <!-- Editable note -->
              <template v-if="editingRefNote === ref.id">
                <input
                  v-model="editingRefValue"
                  class="ref-strip-edit-input"
                  @keydown.enter="saveEditNote"
                  @keydown.escape="cancelEditNote"
                  @blur="saveEditNote"
                  autofocus
                />
              </template>
              <template v-else>
                <span
                  class="ref-strip-label"
                  @click="startEditNote(ref.id, ref.label)"
                  >{{ ref.label }}</span
                >
              </template>
              <span class="ref-strip-tag">{{ getTagLabel(ref.tag) }}</span>
            </div>
            <button
              class="ref-strip-remove"
              @click="emit('removeRefImage', ref.id)"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            class="ref-strip-add"
            @click="
              emit('triggerUpload', 'other');
              showPlusMenu = false;
            "
          >
            + 添加
          </button>
        </div>

        <!-- Optimized prompt preview -->
        <div v-if="showOptimizedPreview" class="optimized-preview">
          <div class="optimized-header">
            <span class="optimized-title">AI 优化后的提示词</span>
            <button
              class="optimized-close"
              @click="showOptimizedPreview = false"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="optimized-text">{{ optimizedPreview }}</p>
          <div class="optimized-actions">
            <button class="optimized-adopt" @click="adoptOptimized">
              采用此提示词
            </button>
            <button class="optimized-retry" @click="optimizePrompt">
              重新优化
            </button>
          </div>
        </div>

        <!-- Main input card -->
        <div class="input-card">
          <!-- ChatGPT-style + icon button (left-bottom, inside input card) -->
          <div class="input-plus-area">
            <button
              class="input-plus-btn"
              :class="{ active: showPlusMenu }"
              @click="togglePlusMenu"
              :title="
                refImages.length > 0
                  ? `已添加 ${refImages.length} 张参考图`
                  : '添加参考图 / 设计参数'
              "
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span v-if="refImages.length > 0" class="plus-badge-count">{{
                refImages.length
              }}</span>
            </button>

            <!-- + Menu dropdown (pops above the + button) -->
            <div v-if="showPlusMenu" class="plus-dropdown">
              <div class="dropdown-title">添加参考图</div>
              <div class="plus-tags">
                <button
                  v-for="t in store.tagOptions"
                  :key="t.id"
                  class="plus-tag"
                  @click="handlePlusSceneClick(t.id, $event)"
                >
                  <span class="tag-dot" :style="{ background: t.color }"></span>
                  {{ t.label }}
                </button>
              </div>

              <div class="plus-divider"></div>

              <button
                class="plus-item brand"
                @click.stop="
                  emit('openBrandAssets');
                  showPlusMenu = false;
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                品牌资产库
              </button>

              <button
                class="plus-item settings"
                @click.stop="openSettingsFromPlus"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  />
                </svg>
                设计参数
              </button>
              <button class="plus-item check" @click.stop="runProductionCheck">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                检查生产就绪
              </button>
              <button
                class="plus-item transfer"
                @click.stop="transferToDesigner"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
                转人工设计
              </button>
            </div>
          </div>

          <!-- Textarea -->
          <textarea
            ref="textareaRef"
            v-model="chatInput"
            class="input-textarea"
            :placeholder="
              isTextModel
                ? '输入消息，按 Enter 发送...'
                : refImages.length > 0 && !chatInput.trim()
                  ? '请输入设计需求描述后再发送...'
                  : '描述设计需求...'
            "
            rows="1"
            @keydown.enter.exact.prevent="analyzeAndGenerate"
          ></textarea>

          <!-- Bottom toolbar -->
          <div class="input-toolbar">
            <!-- Wallet badge -->
            <div
              v-if="store.walletBalance !== null"
              class="wallet-badge"
              :title="`当前模型单价 ¥${formatPrice(store.walletUnitPrice)}${priceUnitLabel}`"
            >
              <span class="wallet-dot"></span>
              <span
                >余额 ¥{{ formatPrice(store.walletBalance) }}（{{
                  formatPoints(store.walletBalance)
                }}
                积分）</span
              >
              <span v-if="store.walletUnitPrice > 0" class="wallet-unit">
                ¥{{ formatPrice(store.walletUnitPrice) }}{{ priceUnitLabel }}
              </span>
            </div>
            <div
              class="toolbar-divider"
              v-if="store.walletBalance !== null"
            ></div>
            <!-- Model -->
            <div class="model-menu-area">
              <button
                class="toolbar-btn model-btn"
                :class="{ active: showModelMenu }"
                :title="currentModel?.label || 'GPT-image2'"
                @click="toggleModelMenu"
              >
                <span class="model-btn-label">{{
                  currentModel?.shortLabel || 'GPT-image2'
                }}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div v-if="showModelMenu" class="toolbar-dropdown model-dropdown">
                <div class="dropdown-title">选择模型</div>
                <template v-for="group in modelGroups" :key="group.channelId">
                  <div class="model-group-title">
                    {{ group.channelName }}
                  </div>
                  <button
                    v-for="m in group.models"
                    :key="`${group.channelId}:${m.id}`"
                    :disabled="m.disabled"
                    class="dropdown-item"
                    :class="[
                      {
                        active: store.selectedModel === m.id,
                        disabled: m.disabled,
                      },
                    ]"
                    :title="m.label"
                    @click="
                      store.selectedModel = m.id;
                      showModelMenu = false;
                    "
                  >
                    <span class="model-item-main">
                      <span class="dropdown-item-label">{{ m.label }}</span>
                      <span
                        v-if="(m.price ?? 0) > 0"
                        class="dropdown-model-price"
                        title="模型单价"
                        >¥{{ formatPrice(m.price)
                        }}{{ modelUnitLabel(m.pricingUnit) }}</span
                      >
                    </span>
                    <span class="model-item-side">
                      <span
                        v-if="m.modelType === 1"
                        class="dropdown-type-tag"
                        title="非多模态：仅文本对话，不能生成图片"
                        >非多模态</span
                      >
                      <span
                        v-else
                        class="dropdown-type-tag dropdown-type-tag-image"
                        title="多模态：支持图片生成"
                        >多模态</span
                      >
                      <span v-if="m.recommended" class="dropdown-recommend"
                        >推荐</span
                      >
                      <svg
                        v-if="store.selectedModel === m.id"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </button>
                </template>
                <div v-if="modelGroups.length === 0" class="dropdown-empty">
                  暂无可用模型，请先在管理端配置渠道
                </div>
              </div>
            </div>

            <div v-if="!isTextModel" class="toolbar-divider"></div>

            <!-- Count（仅图片模型）：渠道固定张数/禁用 n 时仅 1 张可选 -->
            <div v-if="!isTextModel" class="count-menu-area">
              <button
                class="toolbar-btn"
                :class="{
                  active: showCountMenu,
                  'is-disabled': store.countOptions.length <= 1,
                }"
                :disabled="store.countOptions.length <= 1"
                :title="
                  store.countOptions.length <= 1
                    ? '该模型仅支持生成 1 张'
                    : '生成数量'
                "
                @click="toggleCountMenu"
              >
                {{ store.generateCount }} 张
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div v-if="showCountMenu" class="toolbar-dropdown count-dropdown">
                <div class="dropdown-title">生成数量</div>
                <button
                  v-for="n in store.countOptions"
                  :key="n"
                  class="dropdown-item"
                  :class="[{ active: store.generateCount === n }]"
                  @click="
                    store.generateCount = n;
                    showCountMenu = false;
                  "
                >
                  <span>生成 {{ n }} 张</span>
                  <svg
                    v-if="store.generateCount === n"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div v-if="!isTextModel" class="toolbar-divider"></div>

            <!-- 生成质量（仅图片模型）：auto/low/medium/high，对应模型 quality 参数；渠道禁用/固定时置灰 -->
            <div v-if="!isTextModel" class="quality-menu-area">
              <button
                class="toolbar-btn"
                :class="{
                  active: showQualityMenu,
                  'is-disabled': store.qualityDisabled,
                }"
                :disabled="store.qualityDisabled"
                :title="
                  store.qualityDisabled
                    ? '该模型不支持画质设置（由渠道固定）'
                    : '画质选择'
                "
                @click="toggleQualityMenu"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                <span>{{
                  qualityOptions.find((q) => q.value === store.quality)
                    ?.label ?? '自动'
                }}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div
                v-if="showQualityMenu"
                class="toolbar-dropdown quality-dropdown"
              >
                <div class="dropdown-title">画质选择</div>
                <button
                  v-for="q in qualityOptions"
                  :key="q.value"
                  class="dropdown-item"
                  :class="{ active: store.quality === q.value }"
                  :title="q.desc"
                  @click="
                    store.quality = q.value;
                    showQualityMenu = false;
                  "
                >
                  <span class="dropdown-item-label">{{ q.label }}</span>
                  <svg
                    v-if="store.quality === q.value"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              v-if="!isTextModel && !store.sizeDisabled"
              class="toolbar-divider"
            ></div>

            <!-- Quick aspect ratio selector（仅图片模型）；渠道禁用 size 时隐藏 -->
            <div
              v-if="!isTextModel && !store.sizeDisabled"
              class="ratio-menu-area"
            >
              <button
                class="toolbar-btn"
                :class="{ active: showRatioMenu }"
                @click="toggleRatioMenu"
                title="尺寸比例快捷选择"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="6" width="18" height="12" rx="1.5" />
                  <path d="M9 6v12M15 6v12" stroke-dasharray="2 2" />
                </svg>
                <span>{{ sizeButtonText }}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div v-if="showRatioMenu" class="toolbar-dropdown ratio-dropdown">
                <div class="dropdown-title">尺寸比例</div>
                <button
                  v-for="r in quickRatioOptions"
                  :key="r.value"
                  class="dropdown-item"
                  :class="[
                    {
                      active:
                        store.exactSize === '' &&
                        store.selectedAspectRatio === r.value,
                    },
                  ]"
                  @click="applyQuickRatio(r.value)"
                >
                  <span>{{ r.label }}</span>
                  <svg
                    v-if="
                      store.exactSize === '' &&
                      store.selectedAspectRatio === r.value
                    "
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>

                <div class="dropdown-divider"></div>
                <div class="dropdown-title">
                  精确尺寸（按 1K/2K/4K 分组，长宽对已去重）
                </div>
                <div class="exact-size-groups">
                  <div
                    v-for="g in compactTierSizes"
                    :key="g.tier"
                    class="exact-size-group"
                  >
                    <div class="exact-size-group-title">
                      {{ g.tierLabel }}
                      <span class="exact-size-group-hint"
                        >选尺寸后可用「对调长宽」切横竖版</span
                      >
                    </div>
                    <div class="exact-size-grid">
                      <button
                        v-for="s in g.sizes"
                        :key="s.size"
                        class="exact-size-item"
                        :class="{
                          active:
                            store.exactSize === s.size ||
                            store.exactSize === s.flippedSize,
                        }"
                        :title="`${s.name} ${s.ratio} ${s.size}${s.flippedSize === s.size ? '' : `（对调 ${s.flippedSize}）`}`"
                        @click="pickExactSize(s.size)"
                      >
                        {{ s.size }}
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="store.exactSize" class="exact-lock-hint">
                  已锁定精确尺寸（比例与分辨率档位自动失效），可在此对调长宽
                </div>
                <div v-if="store.exactSize" class="swap-size-row">
                  <span class="swap-size-current">{{ store.exactSize }}</span>
                  <button
                    class="swap-size-btn"
                    :title="`将 ${store.exactSize} 对调为 ${swapPreview(store.exactSize)}`"
                    @click="swapSelectedSize"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    对调长宽
                  </button>
                </div>

                <div class="dropdown-divider"></div>
                <div class="dropdown-title">分辨率档位（模糊选择）</div>
                <button
                  v-for="t in resolutionTierOptions"
                  :key="t.value"
                  class="dropdown-item"
                  :class="[
                    {
                      active:
                        store.exactSize === '' &&
                        store.resolutionTier === t.value,
                    },
                  ]"
                  title="选 1K/2K/4K 时默认取该档最大分辨率；与精确尺寸互斥"
                  @click="pickResolutionTier(t.value)"
                >
                  <span>{{ t.label }}</span>
                  <svg
                    v-if="
                      store.exactSize === '' && store.resolutionTier === t.value
                    "
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div v-if="!isTextModel" class="toolbar-divider"></div>

            <!-- Templates（仅图片模型） -->
            <button
              v-if="!isTextModel"
              class="toolbar-btn"
              :class="{ active: showTemplatesDrawer }"
              data-toolbar-tpl
              @click="toggleTemplatesSafe"
              title="创意模版"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>模版</span>
            </button>

            <div v-if="!isTextModel" class="toolbar-divider"></div>

            <!-- Design params（仅图片模型） -->
            <button
              v-if="!isTextModel"
              class="toolbar-btn settings-btn"
              @click="emit('openSettings')"
              title="设计参数"
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                />
              </svg>
              <span>设计参数</span>
            </button>

            <div class="toolbar-divider"></div>

            <!-- Optimize — always visible, disabled when no input -->
            <button
              class="toolbar-btn optimize-btn"
              :class="{
                loading: isOptimizing,
                disabled: !hasContent || isProcessing,
              }"
              :disabled="!hasContent || isProcessing"
              @click="optimizePrompt"
              title="AI 优化提示词"
            >
              <svg
                v-if="!isOptimizing"
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M12 3l1.7 5.1L18.8 10l-5.1 1.9L12 17l-1.7-5.1L5.2 10l5.1-1.9L12 3z"
                />
                <path
                  d="M19 15l.8 2.4 2.2.6-2.2.6L19 21l-.8-2.4-2.2-.6 2.2-.6L19 15z"
                />
              </svg>
              <div v-else class="mini-spinner"></div>
              <span class="optimize-label">优化</span>
            </button>
          </div>

          <!-- Send / Stop：生成中变为方形停止按钮，点击中止生成（未扣费） -->
          <button
            v-if="isProcessing"
            class="send-btn send-btn-stop"
            @click="emit('stopGeneration')"
            title="停止生成"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
          <button
            v-else
            class="send-btn"
            :class="{ 'send-btn-text': isTextModel }"
            :disabled="!hasContent"
            @click="analyzeAndGenerate"
            :title="isTextModel ? '发送' : '生成'"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>

        <!-- Footer hint -->
        <div class="input-hint">
          AI 生成的设计稿仅供参考，印刷前需人工确认生产细节
        </div>
      </div>
    </div>

    <!-- ═══ Templates Drawer (top-level, outside fixed input wrapper for safe z-index) ═══ -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="showTemplatesDrawer"
          class="tpl-drawer-overlay"
          @click.self="toggleTemplatesSafe($event)"
        >
          <div class="tpl-drawer">
            <div class="tpl-drawer-header">
              <h3 class="tpl-drawer-title">创意模版</h3>
              <button
                class="tpl-drawer-close"
                @click.stop="toggleTemplatesSafe($event)"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div v-if="templateHint" class="tpl-hint">{{ templateHint }}</div>
            <div class="tpl-drawer-body">
              <div
                v-for="(list, cat) in templateCategories"
                :key="cat"
                class="tpl-group"
              >
                <div class="tpl-group-title">{{ cat }}</div>
                <div class="tpl-group-list">
                  <div
                    v-for="tpl in visibleTemplates(list)"
                    :key="tpl.id"
                    class="template-card"
                    role="button"
                    tabindex="0"
                    :title="tpl.description"
                    @click.stop="
                      applyTemplate(tpl);
                      toggleTemplatesSafe($event);
                    "
                  >
                    <span class="template-thumb-wrap">
                      <img
                        :src="templateImage(tpl)"
                        class="template-thumb"
                        loading="lazy"
                        alt=""
                      />
                      <span class="template-cat">{{ tpl.category }}</span>
                      <span
                        v-if="tpl.source === 1"
                        class="template-shared-badge"
                        title="用户对话沉淀的共享模板"
                        >共享</span
                      >
                      <button
                        v-if="tpl.source === 1"
                        class="template-copy-btn"
                        title="复制原始提示词（共享提示词参考）"
                        @click.stop="copyTemplatePrompt(tpl)"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path
                            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                          />
                        </svg>
                        复制
                      </button>
                    </span>
                    <span class="template-name">{{ tpl.name }}</span>
                    <span class="template-tag-row">
                      <span class="template-tag">{{
                        tpl.recommendedModelLabel || tpl.recommendedModel
                      }}</span>
                      <span class="template-tag template-tag-dim">{{
                        tpl.defaultSize
                      }}</span>
                      <span
                        v-if="(tpl.usageCount ?? 0) > 0"
                        class="template-tag template-tag-heat"
                        >热度 {{ tpl.usageCount }}</span
                      >
                    </span>
                  </div>
                </div>
                <div
                  v-if="list.length > TEMPLATE_PREVIEW_LIMIT"
                  class="tpl-view-more"
                  @click.stop="toggleTemplateCategory(cat)"
                >
                  {{
                    expandedTemplateCats.has(cat)
                      ? '收起'
                      : `查看更多（${list.length - TEMPLATE_PREVIEW_LIMIT}）`
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 存为模板弹窗（对话沉淀 → 共享模板） -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="showSaveTemplateDialog"
          class="tpl-drawer-overlay save-tpl-overlay"
          @click.self="showSaveTemplateDialog = false"
        >
          <div class="tpl-drawer save-tpl-dialog">
            <div class="tpl-drawer-header">
              <h3 class="tpl-drawer-title">存为模板</h3>
              <button
                class="tpl-drawer-close"
                @click="showSaveTemplateDialog = false"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="save-tpl-body">
              <p class="save-tpl-tip">
                将本次生成使用的提示词与封面图沉淀为共享模板，其他用户可参考与复用。
              </p>
              <label class="save-tpl-label" for="save-tpl-category"
                >分类（必填）</label
              >
              <input
                id="save-tpl-category"
                v-model="saveTemplateCategory"
                class="save-tpl-input"
                list="save-tpl-categories"
                placeholder="选择或输入新分类，如：门头设计"
              />
              <datalist id="save-tpl-categories">
                <option
                  v-for="cat in saveTemplateCategoryOptions"
                  :key="cat"
                  :value="cat"
                ></option>
              </datalist>
              <label class="save-tpl-label" for="save-tpl-name">模板名称</label>
              <input
                id="save-tpl-name"
                v-model="saveTemplateName"
                class="save-tpl-input"
                placeholder="留空自动命名（分类+时间）"
              />
              <label class="save-tpl-label" for="save-tpl-desc">备注说明</label>
              <textarea
                id="save-tpl-desc"
                v-model="saveTemplateDesc"
                class="save-tpl-textarea"
                rows="2"
                placeholder="可选：补充适用场景 / 使用建议"
              ></textarea>
              <div class="save-tpl-actions">
                <button
                  class="save-tpl-btn"
                  @click="showSaveTemplateDialog = false"
                >
                  取消
                </button>
                <button
                  class="save-tpl-btn save-tpl-btn-primary"
                  :disabled="saveTemplateBusy"
                  @click="confirmSaveTemplate"
                >
                  {{ saveTemplateBusy ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 回到底部（悬浮于输入区上方，页面滚动远离底部时出现） -->
    <button
      v-if="showBackToBottom"
      class="back-to-bottom-btn"
      :class="{ 'sidebar-collapsed': sidebarCollapsed }"
      title="回到底部"
      @click="scrollToBottom"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.ai-chat {
  position: relative;
  width: 100%;
  background: var(--color-bg-primary);
}

/* ── Chat messages ── */
.chat-messages {
  width: 100%;
  padding: 28px 0 32px;

  /* Page-level scrolling: NO internal overflow, let <body> own the scrollbar */
  overflow: visible;
}

/* ── Chat messages padded: 68px + requested +20px = 88px total ── */
.chat-messages-padded {
  box-sizing: border-box;
  max-width: 1160px;
  margin-right: 88px;
  margin-left: 88px;
}

@media (max-width: 1280px) {
  .chat-messages-padded {
    margin-right: 64px;
    margin-left: 64px;
  }
}

@media (max-width: 1024px) {
  .chat-messages-padded {
    margin-right: 36px;
    margin-left: 36px;
  }
}

@media (max-width: 640px) {
  .chat-messages-padded {
    margin-right: 14px;
    margin-left: 14px;
  }
}

/* Welcome */
.chat-welcome {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* 与底部输入框同宽同居中（输入区左右 padding 各 16px），任意屏宽/侧栏状态均对齐 */
  width: min(980px, calc(100% - 32px));
  padding: 60px 20px 40px;
  margin: 0 auto;
  text-align: center;
  animation: welcome-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes welcome-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.welcome-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-bottom: 22px;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 24px;
  box-shadow:
    0 8px 28px var(--color-neon-glow),
    0 0 0 4px var(--color-neon-glow) inset;
  animation: welcome-pulse 2.4s ease-in-out infinite;
}

@keyframes welcome-pulse {
  0%,
  100% {
    box-shadow:
      0 8px 28px var(--color-neon-glow),
      0 0 0 4px var(--color-neon-glow) inset;
    transform: scale(1);
  }

  50% {
    box-shadow:
      0 12px 36px var(--color-neon-glow),
      0 0 0 6px var(--color-neon-glow) inset;
    transform: scale(1.04);
  }
}

.welcome-title {
  margin: 0 0 12px;
  font-size: 2rem;
  font-weight: 800;
  color: transparent;
  letter-spacing: -0.02em;
  background: linear-gradient(
    135deg,
    var(--color-text-primary) 0%,
    var(--color-neon) 100%
  );
  background-clip: text;
}

.welcome-desc {
  max-width: 480px;
  margin: 0 0 32px;
  font-size: 0.94rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.welcome-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  max-width: 100%;
}

.welcome-preset-btn {
  position: relative;
  padding: 11px 18px;
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 4%);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.welcome-preset-btn::before {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(135deg, var(--color-neon) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.2s;
}

.welcome-preset-btn:hover {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-color: transparent;
  box-shadow: 0 12px 28px var(--color-neon-glow);
  transform: translateY(-3px);
}

.welcome-preset-btn:hover::before {
  opacity: 0.2;
}

/* Message rows */
.msg-row {
  display: flex;
  width: 100%;
  margin-bottom: 28px;
  animation: msg-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* Stagger msg rows for an organic feel */
.msg-row:nth-child(even) {
  animation-delay: 0.03s;
}

@keyframes msg-in {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: translateY(10px) scale(0.995);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }
}

.msg-ai {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.msg-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-bg-primary);
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, var(--color-neon), rgb(122 158 0 / 70%));
  border-radius: 13px;
  box-shadow:
    0 6px 16px var(--color-neon-glow),
    0 0 0 2px rgb(255 255 255 / 8%) inset;
}

.msg-body {
  min-width: 0;
  max-width: 85%;
}

/* Bubbles */
.msg-bubble {
  position: relative;
  z-index: 1;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
  padding: 16px 20px;
  line-height: 1.65;
  border-radius: 20px;
  transition:
    box-shadow 0.25s,
    transform 0.2s;
}

.msg-bubble::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(135deg, rgb(255 255 255 / 6%), transparent 50%);
  border-radius: inherit;
  opacity: 0.6;
}

.msg-bubble-user {
  max-width: 66%;
  color: var(--color-bg-primary);
  background: linear-gradient(
    135deg,
    var(--color-neon) 0%,
    rgb(122 158 0 / 94%) 100%
  );
  border: none;
  border-bottom-right-radius: 7px;
  box-shadow:
    0 6px 22px var(--color-neon-glow),
    0 0 0 1px rgb(255 255 255 / 10%) inset;
}

.msg-bubble-ai {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom-left-radius: 7px;
  box-shadow:
    0 4px 14px rgb(0 0 0 / 4%),
    0 0 0 1px rgb(255 255 255 / 3%) inset;
  backdrop-filter: blur(8px);
}

.msg-bubble-processing {
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  box-shadow: 0 0 0 3px var(--color-neon-glow);
}

.msg-content {
  font-size: 0.9rem;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

/* 生成失败重试按钮 */
.msg-retry-row {
  display: flex;
  margin-top: 12px;
}

.msg-retry-btn {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 6px 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-neon);
  cursor: pointer;
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 10px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toolbar-btn.is-disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.45;
  transform: none;
}

.msg-retry-btn:hover {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transform: translateY(-1px);
}

/* 调用留痕 / 图片重新落库 */
.msg-trace {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.msg-trace-toggle {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.18s ease;
}

.msg-trace-toggle:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.trace-loading {
  color: var(--color-neon);
}

.msg-persist-btn {
  padding: 4px 10px;
  margin: 0;
  font-size: 0.75rem;
}

.msg-persist-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.msg-save-template-btn {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.msg-save-template-btn:hover {
  color: var(--color-bg-primary);
  background: var(--color-neon);
}

.msg-trace-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  padding: 12px;
  margin-top: 10px;
  overflow-y: auto;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.trace-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}

.trace-label {
  flex: none;
  width: 84px;
  color: var(--color-text-secondary);
}

.trace-value {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.trace-pre {
  white-space: pre-wrap;
}

.trace-ok {
  color: #52c41a;
}

.trace-err {
  color: #ff4d4f;
}

.trace-json {
  flex: 1;
  max-height: 180px;
  padding: 8px;
  margin: 0;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.7rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  white-space: pre;
  background: rgb(0 0 0 / 25%);
  border-radius: 6px;
}

.trace-urls {
  flex: 1;
  min-width: 0;
  padding-left: 16px;
  margin: 0;
  list-style: disc;
}

.trace-urls a {
  color: var(--color-neon);
  overflow-wrap: anywhere;
}

/* Multi-line collapsible text block — shows preview, expands on hover via title */
.msg-content-collapsible {
  position: relative;
  max-height: 3.6em;
  overflow: hidden;
  cursor: help;
  transition: max-height 0.25s ease;
}

.msg-content-collapsible:hover {
  max-height: 500px;
  overflow: auto;
}

.msg-more-hint {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--color-neon);
  white-space: nowrap;
}

.msg-content-collapsible:hover .msg-more-hint {
  display: none;
}

/* User bubble text uses dark-mode safe vars */
.msg-bubble-user .msg-content {
  color: inherit;
}

/* 用户消息下方：系统加工后的完整提示词（灰色小字） */
.msg-optimized-prompt {
  padding-top: 8px;
  margin-top: 8px;
  font-size: 0.72rem;
  line-height: 1.6;
  color: rgb(0 0 0 / 55%);
  word-break: break-all;
  white-space: pre-wrap;
  border-top: 1px dashed rgb(0 0 0 / 20%);
}

.msg-time {
  margin-top: 4px;
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

.msg-user .msg-time {
  padding-right: 4px;
  margin-top: 0;
  text-align: right;
}

/* 用户头像（右侧） */
.msg-user {
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  justify-content: flex-end;
}

.msg-user-line {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: flex-end;
  width: 100%;
}

.msg-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.msg-avatar-user {
  overflow: hidden;
  color: rgb(255 255 255 / 92%);
  background: linear-gradient(135deg, rgb(80 100 255), rgb(140 90 240));
  border-radius: 50%;
  box-shadow: 0 6px 16px rgb(80 100 255 / 30%);
}

.msg-ai .msg-time {
  margin-left: 4px;
}

.msg-cost {
  margin-left: 6px;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Reference images in messages */
.msg-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.msg-ref {
  position: relative;
  width: 64px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.msg-ref-img {
  width: 64px;
  height: 44px;
  object-fit: cover;
}

.msg-ref-tag {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 1px 4px;
  font-size: 0.55rem;
  color: #fff;
  text-align: center;
  background: rgb(0 0 0 / 60%);
}

/* Processing */
.processing-content {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.88rem;
  color: var(--color-neon);
}

.processing-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-neon-dim);
  border-top-color: var(--color-neon);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.processing-info {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

/* Generated images */
.msg-images {
  margin-top: 10px;
}

.images-grid {
  display: grid;
  gap: 10px;
}

.images-grid.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.images-grid.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 640px) {
  .images-grid.grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

.image-card {
  overflow: hidden;
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.image-card:hover {
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
}

.image-card-preview {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--color-bg-card);
}

.image-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.image-card:hover .image-card-img {
  transform: scale(1.05);
}

.image-card-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 10px;
  background: linear-gradient(to top, rgb(0 0 0 / 50%), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.image-card:hover .image-card-overlay {
  opacity: 1;
}

.image-card-edit-btn {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 6px 12px;
  font-size: 0.7rem;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 20%);
  border: none;
  border-radius: 8px;
  backdrop-filter: blur(4px);
  transition: background 0.2s;
}

.image-card-edit-btn:hover {
  background: rgb(255 255 255 / 30%);
}

.image-card-footer {
  padding: 10px;
}

.image-card-title {
  display: block;
  margin-bottom: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.image-card-actions {
  display: flex;
  gap: 6px;
}

.image-card-action-btn {
  padding: 4px 10px;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.2s;
}

.image-card-action-btn:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.image-card-action-btn.selected {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

.image-card-action-btn.modify:hover {
  color: #f97316;
  background: #fff7ed;
  border-color: #fed7aa;
}

/* Image action bar */
.image-action-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 0;
  margin-top: 8px;
  color: var(--color-text-muted);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.action-btn:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.action-btn.regenerate {
  gap: 4px;
  width: auto;
  padding: 0 8px;
  font-size: 0.72rem;
}

.action-divider {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--color-border);
}

/* ── Input area (fixed bottom) ── */
.chat-input-area {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 264px;
  z-index: 50;
  padding: 14px 16px 20px;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgb(248 249 250 / 0%),
    var(--color-bg-primary) 22%,
    var(--color-bg-primary) 100%
  );
  transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-input-area.sidebar-collapsed {
  left: 60px;
}

@media (max-width: 768px) {
  .chat-input-area,
  .chat-input-area.sidebar-collapsed {
    left: 0;
  }
}

/* Soft ambient glow behind the input card — premium feel */
.chat-input-area::before {
  position: absolute;
  bottom: 20px;
  left: 50%;
  width: min(980px, calc(100% - 32px));
  height: 140px;
  pointer-events: none;
  content: '';
  background: radial-gradient(
    ellipse at center,
    rgb(122 158 0 / 20%) 0%,
    transparent 70%
  );
  opacity: 0.75;
  filter: blur(30px);
  transform: translateX(-50%);
}

:global(.dark) .chat-input-area {
  background: linear-gradient(
    to bottom,
    rgb(10 10 15 / 0%),
    var(--color-bg-primary) 22%,
    var(--color-bg-primary) 100%
  );
}

:global(.dark) .chat-input-area::before {
  background: radial-gradient(
    ellipse at center,
    rgb(122 158 0 / 26%) 0%,
    transparent 70%
  );
}

.chat-input-inner {
  position: relative;
  z-index: 2;
  max-width: 980px;
  padding: 14px 14px 12px;
  margin: 0 auto;
  pointer-events: auto;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 22px;
  box-shadow:
    0 -10px 56px rgb(0 0 0 / 12%),
    0 0 0 1px rgb(255 255 255 / 4%) inset;
  backdrop-filter: blur(28px) saturate(150%);
  transition:
    box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-input-inner:focus-within {
  border-color: var(--color-neon);
  box-shadow:
    0 -14px 72px rgb(122 158 0 / 22%),
    0 0 0 3px var(--color-neon-glow),
    0 0 0 1px rgb(255 255 255 / 6%) inset;
}

/* Reference images strip */
.ref-strip {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.ref-strip::-webkit-scrollbar {
  height: 4px;
}

.ref-strip::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.ref-strip-item {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  max-width: 220px;
  padding: 6px 10px 6px 6px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 4%);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ref-strip-item:hover {
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 14px rgb(122 158 0 / 12%);
  transform: translateY(-2px);
}

.ref-strip-thumb {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
}

.ref-strip-meta {
  flex: 1;
  min-width: 0;
}

.ref-strip-edit-input {
  width: 100%;
  padding: 2px 6px;
  font-size: 0.68rem;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-neon-dim);
  border-radius: 6px;
}

.ref-strip-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  cursor: pointer;
}

.ref-strip-label:hover {
  color: var(--color-neon);
}

.ref-strip-tag {
  display: inline-block;
  padding: 0 6px;
  margin-top: 2px;
  font-size: 0.56rem;
  font-weight: 600;
  color: var(--color-bg-primary);
  letter-spacing: 0.02em;
  background: var(--color-neon);
  border-radius: 9999px;
}

.ref-strip-remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 6px;
  opacity: 0;
  transform: scale(0.85);
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ref-strip-item:hover .ref-strip-remove {
  opacity: 1;
  transform: scale(1);
}

.ref-strip-remove:hover {
  color: #fff;
  background: #ef4444;
  box-shadow: 0 4px 10px rgb(239 68 68 / 30%);
  transform: scale(1.15) translateY(-1px);
}

.ref-strip-add {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-neon);
  cursor: pointer;
  background: var(--color-neon-glow);
  border: 1px dashed var(--color-neon-dim);
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ref-strip-add:hover {
  color: #fff;
  background: var(--color-neon);
  border-style: solid;
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transform: translateY(-2px);
}

/* Optimized preview */
.optimized-preview {
  padding: 12px;
  margin-bottom: 10px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.optimized-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.optimized-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6366f1;
}

.optimized-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.optimized-close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.optimized-text {
  margin: 0 0 10px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.optimized-actions {
  display: flex;
  gap: 8px;
}

.optimized-adopt {
  flex: 1;
  padding: 7px 14px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: #6366f1;
  border: none;
  border-radius: 8px;
  transition: background 0.2s;
}

.optimized-adopt:hover {
  background: #4f46e5;
}

.optimized-retry {
  padding: 7px 14px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.optimized-retry:hover {
  background: var(--color-bg-primary);
}

/* Input card */
.input-card {
  position: relative;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 2%);
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-card:focus-within {
  border-color: var(--color-neon-dim);
  box-shadow:
    0 8px 28px rgb(122 158 0 / 14%),
    0 0 0 3px var(--color-neon-glow);
}

/* ChatGPT-style + button — sits at left-bottom inside input card */
.input-plus-area {
  position: absolute;
  bottom: 0;
  left: 12px;
  z-index: 3;
}

.input-plus-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 13px;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.input-plus-btn:hover {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-color: var(--color-neon);
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transform: translateY(-2px) rotate(90deg);
}

.input-plus-btn.active {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-color: var(--color-neon);
  box-shadow: 0 6px 18px var(--color-neon-glow);
  transform: translateY(-2px) rotate(45deg);
}

.input-textarea {
  width: 100%;
  min-height: 84px;
  padding: 18px 58px 12px 64px;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  letter-spacing: -0.005em;
  resize: none;
  outline: none;
  background: transparent;
  border: none;
}

.input-textarea::placeholder {
  color: var(--color-text-muted);
}

.input-textarea::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.input-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.input-textarea::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
  opacity: 0.4;
}

.input-textarea::-webkit-scrollbar-thumb:hover {
  background: var(--color-neon-dim);
}

.input-textarea {
  scrollbar-color: var(--color-border) transparent;
  scrollbar-width: thin;
}

/* Wallet badge */
.wallet-badge {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: default;
  user-select: none;
  background: rgb(255 255 255 / 6%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
}

.wallet-dot {
  width: 7px;
  height: 7px;
  background: var(--color-neon, #b4ff39);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--color-neon-glow, #b4ff39);
}

.wallet-badge .wallet-unit {
  font-weight: 500;
  color: var(--color-text-muted);
}

/* Toolbar */
.input-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  row-gap: 5px;
  align-items: center;
  margin: 4px 58px 0 60px;
}

.toolbar-btn {
  display: flex;
  flex-shrink: 0;
  gap: 5px;
  align-items: center;
  padding: 5px 11px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toolbar-btn.is-disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.45;
  transform: none;
}

/* 模型按钮：限制最大宽度，长模型名省略号显示，悬浮看完整名称 */
.model-btn {
  max-width: 168px;
}

.model-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-btn:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
  box-shadow: 0 4px 12px rgb(122 158 0 / 12%);
  transform: translateY(-2px);
}

.toolbar-btn:active {
  transform: translateY(0) scale(0.96);
  transition-duration: 0.06s;
}

.toolbar-btn.active {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-color: var(--color-neon);
  box-shadow: 0 4px 14px var(--color-neon-glow);
  transform: translateY(-2px);
}

.toolbar-btn.loading {
  color: #6366f1;
}

.optimize-label {
  display: none;
}

@media (min-width: 640px) {
  .optimize-label {
    display: inline;
  }
}

.toolbar-divider {
  flex-shrink: 0;
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--color-border);
}

/* Dropdowns — ensure containment context */
.model-menu-area,
.count-menu-area,
.ratio-menu-area {
  position: relative;
  z-index: 2;
  display: inline-flex;
}

.input-plus-area {
  position: absolute;
  bottom: 0;
  left: 12px;
  z-index: 3;
}

.toolbar-dropdown {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  z-index: 9999;
  min-width: 140px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow:
    0 12px 40px rgb(0 0 0 / 22%),
    0 0 0 1px rgb(255 255 255 / 6%) inset;
  backdrop-filter: blur(24px) saturate(160%);
  transform: translateX(-50%);
  transform-origin: bottom center;
  animation: dropdown-in 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Align model-dropdown to left edge since it's wider */
.model-dropdown {
  left: 0;
  min-width: 240px;
  max-width: 320px;
  max-height: 320px;

  /* 去掉顶部 padding：sticky 分组标题紧贴滚动容器顶部，避免出现缝隙 */
  padding: 0 0 6px;
  overflow: hidden auto;
  transform: none;
  transform-origin: bottom left;
  animation: dropdown-in-left 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.model-item-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.model-item-side {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

.dropdown-model-price {
  font-size: 0.66rem;
  line-height: 1.2;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.count-dropdown {
  min-width: 130px;
}

/* Fix the ratio dropdown same treatment */
.ratio-dropdown {
  min-width: 320px;
  max-width: 400px;
  max-height: 440px;
  padding: 8px;
  overflow: hidden auto;

  .quality-dropdown {
    min-width: 140px;
  }
}

/* ── 精确尺寸（按 1K/2K/4K 分组）── */
.exact-lock-hint {
  padding: 4px 10px 2px;
  font-size: 0.58rem;
  line-height: 1.4;
  color: var(--color-neon, #7df9ff);
  background: var(--color-neon-glow, rgb(125 249 255 / 10%));
  border-radius: 6px;
}

.swap-size-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px 8px;
}

.swap-size-current {
  padding: 3px 8px;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 6px;
}

.swap-size-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.62rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.15s ease;
}

.swap-size-btn:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.exact-size-groups {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.exact-size-group-title {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 2px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  background: var(--color-bg-secondary);

  /* 同模型分组标题：顶部不留边框，钉住时紧贴容器顶 */
  border-top: none;
}

.exact-size-group-hint {
  font-size: 0.56rem;
  font-weight: 400;
  color: var(--color-text-muted);
  opacity: 0.75;
}

.exact-size-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  padding: 2px 10px 8px;
}

.exact-size-item {
  padding: 3px 2px;
  font-size: 0.58rem;
  line-height: 1.3;
  color: var(--color-text-secondary);
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.15s ease;
}

.exact-size-item:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon-dim);
}

.exact-size-item.active {
  font-weight: 600;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-neon);
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* 左对齐菜单（model-dropdown 等 transform:none）专用动画，避免被 translateX(-50%) 拉偏 */
@keyframes dropdown-in-left {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.model-dropdown {
  min-width: 220px;
}

.count-dropdown {
  min-width: 130px;
}

.dropdown-divider {
  height: 1px;
  margin: 4px 10px;
  background: var(--color-border, rgb(229 231 235 / 60%));
}

.dropdown-title {
  padding: 4px 10px 8px;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.model-group-title {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 6px 12px 4px;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  background: var(--color-bg-secondary);

  /* 顶部不留边框：钉住时紧贴滚动容器顶，避免出现缝隙/双线；
     分组分隔线用上投影绘制，钉住滚动时被滚动容器裁剪、自然消失 */
  border-top: none;
  box-shadow: 0 -1px 0 var(--color-border);
}

.dropdown-empty {
  padding: 14px 10px;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  text-align: center;
}

.dropdown-item {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 12px;
  font-size: 0.82rem;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 10px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-item:hover:not(.disabled) {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  transform: translateX(2px);
}

.dropdown-item.active {
  font-weight: 600;
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.dropdown-item.disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.dropdown-recommend {
  padding: 1px 5px;
  font-size: 0.55rem;
  font-weight: 600;
  color: #16a34a;
  background: #dcfce7;
  border-radius: 4px;
}

.dropdown-type-tag {
  padding: 1px 5px;
  margin-left: 4px;
  font-size: 0.55rem;
  font-weight: 600;
  color: #0ea5e9;
  white-space: nowrap;
  background: rgb(14 165 233 / 12%);
  border-radius: 4px;
}

.dropdown-type-tag-image {
  color: #8b5cf6;
  background: rgb(139 92 246 / 12%);
}

/* + Menu */
.plus-menu-area {
  position: relative;
  flex-shrink: 0;
}

.plus-toolbar-btn {
  font-weight: 700 !important;
  color: var(--color-neon) !important;
  background: linear-gradient(
    135deg,
    rgb(122 158 0 / 8%),
    rgb(59 130 246 / 6%)
  ) !important;
  border: 1px solid var(--color-neon-dim) !important;
}

.plus-toolbar-btn:hover {
  color: #fff !important;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00) !important;
  border-color: var(--color-neon) !important;
  box-shadow: 0 4px 14px var(--color-neon-glow) !important;
}

.plus-toolbar-btn.active {
  color: #fff !important;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00) !important;
  border-color: var(--color-neon) !important;
  box-shadow: 0 4px 14px var(--color-neon-glow) !important;
}

:global(.dark) .plus-toolbar-btn.active,
:global(.dark) .plus-toolbar-btn:hover {
  background: linear-gradient(135deg, var(--color-neon), #a3cc00) !important;
}

.plus-badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 2px;
  font-size: 0.58rem;
  font-weight: 800;
  color: #fff;
  background: #ef4444;
  border-radius: 9999px;
  box-shadow: 0 2px 6px rgb(239 68 68 / 40%);
  animation: badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes badge-pop {
  from {
    transform: scale(0);
  }

  to {
    transform: scale(1);
  }
}

.plus-dropdown {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  z-index: 9999;
  width: 240px;
  padding: 10px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow:
    0 24px 64px rgb(0 0 0 / 22%),
    0 0 0 1px rgb(255 255 255 / 6%) inset;
  backdrop-filter: blur(28px) saturate(160%);
  transform-origin: bottom left;
  animation: plus-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes plus-pop {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: translateY(8px) scale(0.95);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }
}

.plus-item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 9px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 10px;
  transition: all 0.16s cubic-bezier(0.4, 0, 0.2, 1);
}

.plus-item:hover:not(.disabled) {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  transform: translateX(4px);
}

.plus-item.disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.plus-item.check:hover {
  color: #16a34a;
  background: #f0fdf4;
}

:global(.dark) .plus-item.check:hover {
  color: #4ade80;
  background: rgb(22 163 74 / 14%);
}

.plus-item.settings:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.plus-item.transfer:hover {
  color: #f97316;
  background: #fff7ed;
}

.plus-item.brand:hover {
  color: #e879f9;
  background: #fdf4ff;
}

:global(.dark) .plus-item.transfer:hover {
  color: #fdba74;
  background: rgb(249 115 22 / 14%);
}

.plus-badge {
  padding: 1px 6px;
  margin-left: auto;
  font-size: 0.6rem;
  color: var(--color-text-muted);
  background: var(--color-bg-card);
  border-radius: 4px;
}

.plus-divider {
  height: 1px;
  margin: 8px 4px;
  background: var(--color-border);
}

/* Scene selection — the + button CORE functionality (compact) */
.plus-tags {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 2px 2px 6px;
}

.plus-tag {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 6px 3px 5px;
  overflow: hidden;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.plus-tag::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(135deg, currentcolor 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.22s;
}

.plus-tag:hover {
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 16px rgb(0 0 0 / 18%);
  transform: translateY(-2px) scale(1.03);
}

.plus-tag:hover::before {
  opacity: 0.1;
}

.plus-tag:active {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.06s;
}

.plus-tag:nth-child(1):hover {
  background: #7a9e00;
}

.plus-tag:nth-child(2):hover {
  background: #2563eb;
}

.plus-tag:nth-child(3):hover {
  background: #9333ea;
}

.plus-tag:nth-child(4):hover {
  background: #ea580c;
}

.plus-tag:nth-child(5):hover {
  background: #0d9488;
}

.plus-tag:nth-child(6):hover {
  background: #475569;
}

.plus-tag .tag-dot {
  width: 6px;
  height: 6px;
  margin-bottom: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgb(0 0 0 / 0%);
  transition:
    box-shadow 0.22s,
    transform 0.22s;
}

.plus-tag:hover .tag-dot {
  box-shadow: 0 0 0 3px rgb(255 255 255 / 22%);
  transform: scale(1.2);
}

/* Send button — theme-aware, always VISIBLE in light/dark */
.send-btn {
  position: absolute;
  right: 12px;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--color-neon) 0%, #5a7a00 100%);
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 13px;
  box-shadow:
    0 4px 14px var(--color-neon-glow),
    0 0 0 1px rgb(255 255 255 / 10%) inset;
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:global(.dark) .send-btn {
  background: linear-gradient(135deg, var(--color-neon) 0%, #a3cc00 100%);
  border-color: rgb(255 255 255 / 10%);
  box-shadow:
    0 6px 22px rgb(122 158 0 / 45%),
    0 0 0 1px rgb(255 255 255 / 6%) inset;
}

.send-btn:hover:not(:disabled) {
  box-shadow:
    0 10px 26px var(--color-neon-glow),
    0 0 0 1px rgb(255 255 255 / 16%) inset;
  transform: translateY(-3px) scale(1.08);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
}

.send-btn:disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.28;
  filter: saturate(0.5);
  transform: none;
}

.send-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgb(255 255 255 / 25%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.send-btn-stop {
  color: #fff;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  border-color: rgb(255 255 255 / 18%);
  box-shadow:
    0 4px 14px rgb(239 68 68 / 40%),
    0 0 0 1px rgb(255 255 255 / 10%) inset;
}

.send-btn-stop:hover:not(:disabled) {
  box-shadow:
    0 10px 26px rgb(239 68 68 / 45%),
    0 0 0 1px rgb(255 255 255 / 16%) inset;
  transform: translateY(-3px) scale(1.08);
}

/* 文本模型发送按钮：加宽容纳「发送」文字 */
.send-btn-text {
  width: 56px;
}

.send-text-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 1px;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #c7d2fe;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Input hint */
.input-hint {
  margin-top: 10px;
  font-size: 0.66rem;
  color: var(--color-text-muted);
  text-align: center;
  opacity: 0.7;
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Tag color dot */
.tag-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* ── 设计参数面板 ── */
.params-panel {
  padding: 12px;
  margin-top: 10px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 12%);
}

.params-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.params-row + .params-row {
  margin-top: 10px;
}

.params-label {
  flex-shrink: 0;
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

.params-label-gap {
  margin-left: 10px;
}

.params-chip {
  padding: 4px 10px;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.15s;
}

.params-chip:hover {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-border-hover);
}

.params-custom {
  display: flex;
  gap: 3px;
  align-items: center;
}

.params-input {
  width: 46px;
  padding: 3px 6px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-primary);
  text-align: center;
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.params-input:focus {
  border-color: var(--color-neon-dim);
}

.params-sep {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

.params-unit {
  font-size: 0.62rem;
  color: var(--color-text-muted);
}

.params-select {
  padding: 4px 8px;
  font-size: 0.72rem;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.params-select:focus {
  border-color: var(--color-neon-dim);
}

.params-swatch {
  display: flex;
  width: 24px;
  height: 24px;
  padding: 2px;
  overflow: hidden;
  cursor: pointer;
  background: none;
  border: 2px solid transparent;
  border-radius: 50%;
  transition: all 0.15s;
}

.params-swatch:hover {
  transform: scale(1.12);
}

.params-swatch.active {
  border-color: var(--color-neon);
  box-shadow: 0 0 8px var(--color-neon-glow);
  transform: scale(1.12);
}

.params-swatch-block {
  display: block;
  width: 33.33%;
  height: 100%;
}

/* ── 创意模版栏 ── */
.templates-wrap {
  margin-top: 10px;
}

.templates-toggle {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 12px;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.templates-toggle:hover,
.templates-toggle.active {
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border-color: var(--color-border-hover);
}

.templates-chevron {
  margin-left: 2px;
  transition: transform 0.2s;
}

.templates-chevron.rotated {
  transform: rotate(180deg);
}

.templates-bar {
  padding: 10px;
  margin-top: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 12%);
}

.template-hint {
  padding: 6px 10px;
  margin-bottom: 8px;
  font-size: 0.72rem;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 8px;
}

.templates-scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  padding-right: 4px;
  overflow-y: auto;
}

.templates-scroll::-webkit-scrollbar {
  width: 4px;
}

.templates-scroll::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.template-group-title {
  margin-bottom: 6px;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
}

.template-group-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.template-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: all 0.18s;
}

.template-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
  transform: translateY(-1px);
}

.template-thumb-wrap {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.template-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.template-card:hover .template-thumb {
  transform: scale(1.06);
}

.template-cat {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 8px;
  font-size: 0.58rem;
  color: #fff;
  background: rgb(0 0 0 / 55%);
  border-radius: 9999px;
  backdrop-filter: blur(4px);
}

.template-name {
  display: block;
  padding: 8px 10px 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.template-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 10px 8px;
}

.template-tag {
  padding: 1px 6px;
  font-size: 0.56rem;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 9999px;
}

.template-tag-dim {
  color: var(--color-text-muted);
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.template-tag-heat {
  color: #b45309;
  background: rgb(245 158 11 / 12%);
  border-color: rgb(245 158 11 / 30%);
}

.template-shared-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 8px;
  font-size: 0.56rem;
  font-weight: 600;
  color: #fff;
  background: rgb(122 158 0 / 85%);
  border-radius: 9999px;
}

.template-copy-btn {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: inline-flex;
  gap: 3px;
  align-items: center;
  padding: 3px 7px;
  font-size: 0.56rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: rgb(0 0 0 / 55%);
  border: none;
  border-radius: 9999px;
  backdrop-filter: blur(4px);
  transition: all 0.15s ease;
}

.template-copy-btn:hover {
  color: #fff;
  background: rgb(0 0 0 / 75%);
}

/* ── 存为模板弹窗 ── */
.save-tpl-overlay {
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.save-tpl-dialog {
  width: 440px;
  height: auto;
  max-height: 85vh;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgb(0 0 0 / 30%);
}

.save-tpl-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px 20px;
  overflow-y: auto;
}

.save-tpl-tip {
  margin: 0 0 8px;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.save-tpl-label {
  margin-top: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.save-tpl-input,
.save-tpl-textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  font-size: 0.8rem;
  color: var(--color-text-primary);
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.save-tpl-input:focus,
.save-tpl-textarea:focus {
  border-color: var(--color-neon-dim);
}

.save-tpl-textarea {
  font-family: inherit;
  resize: vertical;
}

.save-tpl-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 14px;
}

.save-tpl-btn {
  padding: 7px 18px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.save-tpl-btn:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.save-tpl-btn-primary {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  border-color: var(--color-neon);
}

.save-tpl-btn-primary:hover {
  color: var(--color-bg-primary);
  background: var(--color-neon);
  box-shadow: 0 6px 18px var(--color-neon-glow);
}

.save-tpl-btn-primary:disabled {
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.6;
}

/* ── Resolution group ── */
.resolution-group {
  display: flex;
  flex-shrink: 0;
  gap: 0;
  overflow: hidden;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 4%);
}

.resolution-btn {
  position: relative;
  padding: 5px 10px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  cursor: pointer;
  background: transparent;
  border: none;
  border-left: 1px solid var(--color-border);
  transition: all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.resolution-btn:first-child {
  border-left: none;
}

.resolution-btn:hover {
  z-index: 1;
  color: var(--color-neon);
  background: var(--color-neon-glow);
}

.resolution-btn.active {
  z-index: 1;
  color: #fff;
  background: linear-gradient(135deg, var(--color-neon) 0%, #5a7a00 100%);
  box-shadow: 0 2px 10px var(--color-neon-glow);
}

:global(.dark) .resolution-btn.active {
  background: linear-gradient(135deg, var(--color-neon) 0%, #a3cc00 100%);
}

/* ── Settings button — PROMINENT as requested ═══ */
.settings-btn {
  position: relative;
  padding: 5px 12px !important;
  overflow: hidden;
  font-weight: 700 !important;
  color: var(--color-neon) !important;
  background: linear-gradient(
    135deg,
    rgb(122 158 0 / 10%),
    rgb(59 130 246 / 8%)
  );
  border: 1px solid var(--color-neon-dim);
}

.settings-btn::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(135deg, var(--color-neon), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.settings-btn:hover {
  color: #fff !important;
  background: linear-gradient(135deg, var(--color-neon), #5a7a00) !important;
  border-color: var(--color-neon) !important;
  box-shadow: 0 6px 18px var(--color-neon-glow) !important;
  transform: translateY(-2px) scale(1.04);
}

.settings-btn:hover::after {
  opacity: 0.16;
}

/* ── Templates drawer ── */
.tpl-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  justify-content: flex-end;
  background: rgb(0 0 0 / 30%);
}

.tpl-drawer {
  display: flex;
  flex-direction: column;
  width: 400px;
  max-width: 90vw;
  height: 100%;
  background: var(--color-bg-secondary);
  border-left: 1px solid var(--color-border);
  box-shadow: -8px 0 40px rgb(0 0 0 / 20%);
}

.tpl-drawer-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.tpl-drawer-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.tpl-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.tpl-drawer-close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.tpl-hint {
  flex-shrink: 0;
  padding: 8px 12px;
  margin: 12px 20px 0;
  font-size: 0.75rem;
  color: var(--color-neon);
  background: var(--color-neon-glow);
  border: 1px solid var(--color-neon-dim);
  border-radius: 8px;
}

.tpl-drawer-body {
  flex: 1;
  padding: 16px 20px 24px;
  overflow-y: auto;
}

.tpl-drawer-body::-webkit-scrollbar {
  width: 4px;
}

.tpl-drawer-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.tpl-group {
  margin-bottom: 20px;
}

.tpl-group + .tpl-group {
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.tpl-group-title {
  margin-bottom: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
}

.tpl-group-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.tpl-view-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0 2px;
  margin-top: 4px;
  font-size: 0.72rem;
  color: var(--color-neon);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.tpl-view-more:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

/* Drawer transition */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-fade-enter-active .tpl-drawer,
.drawer-fade-leave-active .tpl-drawer {
  transition: transform 0.25s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from .tpl-drawer,
.drawer-fade-leave-to .tpl-drawer {
  transform: translateX(100%);
}

/* Back-to-bottom floating button：相对输入区水平居中（输入区 left 264px / 折叠 60px / 移动端 0） */
.back-to-bottom-btn {
  position: fixed;
  bottom: 258px; /* 输入区约 230px 高，按钮悬浮于输入卡上方，避免遮挡 */
  left: calc(50% + 132px);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--color-neon);
  cursor: pointer;
  background: color-mix(in srgb, var(--color-neon) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-neon) 45%, transparent);
  border-radius: 50%;
  box-shadow: 0 8px 22px rgb(0 0 0 / 28%);
  backdrop-filter: blur(10px);
  transform: translateX(-50%);
  transition:
    left 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s ease,
    opacity 0.2s ease;
  animation: back-to-bottom-in 0.25s ease;
}

.back-to-bottom-btn.sidebar-collapsed {
  left: calc(50% + 30px);
}

@media (max-width: 768px) {
  .back-to-bottom-btn,
  .back-to-bottom-btn.sidebar-collapsed {
    left: 50%;
  }
}

.back-to-bottom-btn:hover {
  background: color-mix(in srgb, var(--color-neon) 28%, transparent);
  transform: translateX(-50%) translateY(-3px) scale(1.06);
}

@keyframes back-to-bottom-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
