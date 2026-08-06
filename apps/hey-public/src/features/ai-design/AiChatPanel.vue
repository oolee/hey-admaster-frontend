<script setup lang="ts">
import type {
  AiGeneratedImage,
  ChatMessage,
  RefImage,
} from '#/store/aiDesignStore';
import type { AdTemplate } from '#/types/ai';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

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
  openLightbox: [img: AiGeneratedImage];
  openModify: [img: AiGeneratedImage];
  openSettings: [];
  regenerate: [];
  removeRefImage: [id: string];
  runProductionCheck: [];
  triggerUpload: [tag?: string];
  updateRefNotes: [id: string, notes: string];
  updateRefTag: [id: string, tag: string];
}>();

const store = useAiDesignStore();

const chatInput = ref('');
const chatContainer = ref<HTMLDivElement>();
const textareaRef = ref<HTMLTextAreaElement>();

// Popup menus
const showPlusMenu = ref(false);
const showModelMenu = ref(false);
const showCountMenu = ref(false);
const showRatioMenu = ref(false);

// Quick ratio presets for the toolbar dropdown
const quickRatioOptions = [
  { value: 'auto', label: '自动' },
  { value: '2:1', label: '2:1' },
  { value: '1:2', label: '1:2' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
];

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
const templateCategories = computed(() => getTemplatesByCategory());

// Resolution options
const resolutionOptions = [
  { value: '1k', label: '1K', desc: '1024×1024' },
  { value: '2k', label: '2K', desc: '2048×2048' },
  { value: '4k', label: '4K', desc: '4096×4096' },
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
  return TEMPLATE_IMAGES[tpl.id] || '/images/fede/fede.jpg';
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
  templateHint.value = `已填入「${tpl.name}」提示词，可继续编辑`;
  window.setTimeout(() => {
    templateHint.value = '';
  }, 2500);
  nextTick(() => textareaRef.value?.focus());
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
    // Page-level scroll — scroll to very bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
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

  const styleName = store.styleKeyword;
  const palName =
    store.colorPalettes.find((p) => p.id === store.selectedPalette)?.name ||
    '默认';
  const sizeText =
    store.designWidth && store.designHeight
      ? `${store.designWidth}×${store.designHeight}cm`
      : '未指定尺寸';
  const refTags = props.refImages
    .map((r) => getTagInfo(r.tag).label)
    .filter(Boolean)
    .join('、');
  const modelLabel = currentModel.value?.shortLabel || 'GPT-image2';

  let userContent = input;
  if (props.refImages.length > 0) userContent += `\n[参考图: ${refTags}]`;
  addMessage('user', userContent || '根据参考图生成设计', {
    refImages: props.refImages.length > 0 ? [...props.refImages] : undefined,
  });

  // Simulate AI processing
  await new Promise((r) => setTimeout(r, 800));

  const optimized = `${styleName}风格广告设计，${sizeText}，${palName}配色${input ? `，${input}` : ''}，专业印刷级质量。`;
  store.optimizedPrompt = optimized;
  addMessage(
    'assistant',
    `已分析需求：${optimized}\n\n正在生成 ${store.generateCount} 套方案... （模型：${modelLabel}）`,
    {},
  );

  await new Promise((r) => setTimeout(r, 1500));
  store.revisionCounter++;
  const count = store.generateCount;

  const seeds = Array.from(
    { length: count },
    (_, i) => 85 + store.revisionCounter * 12 + i,
  );
  store.generatedImages = seeds.map((seed, i) => ({
    id: `img-${seed}`,
    url: `https://picsum.photos/600/400?random=${seed}`,
    title: `方案 ${String.fromCodePoint(65 + i)}`,
  }));

  const firstImage = store.generatedImages.at(0);
  store.revisionHistory.unshift({
    Id: `dr-gen-${Date.now()}`,
    DesignSessionId: 'ds-001',
    RevisionNo: store.revisionCounter,
    ImageUrl: firstImage?.url ?? '',
    ThumbnailUrl: firstImage?.url.replace('600/400', '200/100') ?? '',
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

  addMessage(
    'assistant',
    `已生成 ${count} 套方案（${modelLabel}），点击查看大图，或「重生成」换一批。`,
    {
      images: [...store.generatedImages],
    },
  );

  chatInput.value = '';
  showPlusMenu.value = false;
}

// ── Prompt optimization ──
async function optimizePrompt() {
  if (!chatInput.value.trim()) return;
  isOptimizing.value = true;
  showPlusMenu.value = false;
  const styleName = store.styleKeyword;
  const palName =
    store.colorPalettes.find((p) => p.id === store.selectedPalette)?.name ||
    '默认';
  const sizeText =
    store.designWidth && store.designHeight
      ? `${store.designWidth}×${store.designHeight}cm`
      : '未指定尺寸';
  await new Promise((r) => setTimeout(r, 600));
  optimizedPreview.value = [
    `${styleName}风格广告设计，${sizeText}，${palName}配色，`,
    `${chatInput.value.trim()}，`,
    '高对比度、视觉冲击力强、适合广告行业使用，',
    '专业印刷级质量，CMYK色域兼容。',
  ].join('');
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
  showTemplatesDrawer.value = false;
}

function toggleModelMenu() {
  showModelMenu.value = !showModelMenu.value;
  showPlusMenu.value = false;
  showCountMenu.value = false;
  showRatioMenu.value = false;
}

function toggleCountMenu() {
  showCountMenu.value = !showCountMenu.value;
  showPlusMenu.value = false;
  showModelMenu.value = false;
}

function toggleRatioMenu() {
  showRatioMenu.value = !showRatioMenu.value;
  showPlusMenu.value = false;
  showModelMenu.value = false;
  showCountMenu.value = false;
}

// Apply a quick ratio from the toolbar dropdown
function applyQuickRatio(value: string) {
  store.selectedAspectRatio = value;
  if (value === 'auto' || value === 'custom') {
    showRatioMenu.value = false;
    return;
  }
  const parts = value.split(':');
  if (parts.length === 2) {
    const [rwStr, rhStr] = parts as [string, string];
    const rw = Number.parseFloat(rwStr);
    const rh = Number.parseFloat(rhStr);
    if (rw && rh) {
      const w = store.designWidth;
      store.designHeight = Math.round(((w * rh) / rw) * 10) / 10;
    }
  }
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
}

// Click templates btn — use stop + ensure other menus closed
function toggleTemplatesSafe(e: MouseEvent) {
  e.stopPropagation();
  showPlusMenu.value = false;
  showModelMenu.value = false;
  showCountMenu.value = false;
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

onMounted(() => {
  window.addEventListener('click', onWindowClick);
  scrollToBottom();
});

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick);
});
</script>

<template>
  <div class="ai-chat">
    <!-- Chat messages area -->
    <div ref="chatContainer" class="chat-messages chat-messages-padded">
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
              store.designWidth = p.w;
              store.designHeight = p.h;
              chatInput = `做一个${p.label}，${p.w}×${p.h}cm`;
            "
          >
            {{ p.label }} {{ p.w }}×{{ p.h }}cm
          </button>
        </div>
      </div>

      <!-- Messages -->
      <template v-for="msg in chatMessages" :key="msg.id">
        <!-- User message -->
        <div v-if="msg.role === 'user'" class="msg-row msg-user">
          <div class="msg-bubble msg-bubble-user">
            <!-- Multi-line content: collapsible text block with hover-to-expand -->
            <div
              v-if="msg.content.split('\n').length > 3"
              class="msg-content msg-content-collapsible"
              :title="msg.content"
            >
              {{ msg.content.split('\n').slice(0, 2).join('\n')
              }}<span class="msg-more-hint">
                …（共
                {{ msg.content.split('\n').length }} 行，悬停查看全部）</span
              >
            </div>
            <div v-else class="msg-content">{{ msg.content }}</div>
            <div v-if="msg.refImages && msg.refImages.length" class="msg-refs">
              <div v-for="ref in msg.refImages" :key="ref.id" class="msg-ref">
                <img :src="ref.dataUrl" class="msg-ref-img" />
                <span class="msg-ref-tag">{{ getTagInfo(ref.tag).label }}</span>
              </div>
            </div>
          </div>
          <div class="msg-time">{{ msg.time }}</div>
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
                          :class="{ selected: store.selectedImage === img.id }"
                          @click.stop="selectImage(img)"
                        >
                          {{ store.selectedImage === img.id ? '已选' : '选择' }}
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
            <div class="msg-time">{{ msg.time }}</div>
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
              <span>AI 正在生成设计稿...</span>
              <span class="processing-info">
                {{ currentModel?.shortLabel || 'GPT-image2' }} ·
                {{ store.generateCount }}张
              </span>
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
              refImages.length > 0 && !chatInput.trim()
                ? '请输入设计需求描述后再发送...'
                : '描述设计需求...'
            "
            rows="1"
            @keydown.enter.exact.prevent="analyzeAndGenerate"
          ></textarea>

          <!-- Bottom toolbar -->
          <div class="input-toolbar">
            <!-- Model -->
            <div class="model-menu-area">
              <button
                class="toolbar-btn"
                :class="{ active: showModelMenu }"
                @click="toggleModelMenu"
              >
                {{ currentModel?.shortLabel || 'GPT-image2' }}
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
                <button
                  v-for="m in store.modelOptions"
                  :key="m.id"
                  :disabled="m.disabled"
                  class="dropdown-item"
                  :class="[
                    {
                      active: store.selectedModel === m.id,
                      disabled: m.disabled,
                    },
                  ]"
                  @click="
                    store.selectedModel = m.id;
                    showModelMenu = false;
                  "
                >
                  <span>{{ m.label }}</span>
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
                </button>
              </div>
            </div>

            <div class="toolbar-divider"></div>

            <!-- Count -->
            <div class="count-menu-area">
              <button
                class="toolbar-btn"
                :class="{ active: showCountMenu }"
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

            <div class="toolbar-divider"></div>

            <!-- Resolution -->
            <div class="resolution-group">
              <button
                v-for="r in resolutionOptions"
                :key="r.value"
                class="resolution-btn"
                :class="{ active: store.resolution === r.value }"
                @click="store.resolution = r.value"
                :title="r.desc"
              >
                {{ r.label }}
              </button>
            </div>

            <div class="toolbar-divider"></div>

            <!-- Quick aspect ratio selector -->
            <div class="ratio-menu-area">
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
                <span>{{
                  store.selectedAspectRatio === 'auto'
                    ? '自动'
                    : store.selectedAspectRatio === 'custom'
                      ? '自定义'
                      : store.selectedAspectRatio
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
              <div v-if="showRatioMenu" class="toolbar-dropdown ratio-dropdown">
                <div class="dropdown-title">尺寸比例</div>
                <button
                  v-for="r in quickRatioOptions"
                  :key="r.value"
                  class="dropdown-item"
                  :class="[{ active: store.selectedAspectRatio === r.value }]"
                  @click="applyQuickRatio(r.value)"
                >
                  <span>{{ r.label }}</span>
                  <svg
                    v-if="store.selectedAspectRatio === r.value"
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

            <div class="toolbar-divider"></div>

            <!-- Templates -->
            <button
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

            <div class="toolbar-divider"></div>

            <!-- Design params (renamed from 详细设置) -->
            <button
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

          <!-- Send button — simple up arrow -->
          <button
            class="send-btn"
            :disabled="!hasContent || isProcessing"
            @click="analyzeAndGenerate"
            title="发送"
          >
            <svg
              v-if="!isProcessing"
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
            <div v-else class="send-spinner"></div>
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
                  <button
                    v-for="tpl in list"
                    :key="tpl.id"
                    class="template-card"
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
                    </span>
                    <span class="template-name">{{ tpl.name }}</span>
                    <span class="template-tag-row">
                      <span class="template-tag">{{
                        tpl.recommendedModel
                      }}</span>
                      <span class="template-tag template-tag-dim">{{
                        tpl.defaultSize
                      }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 20px 40px;
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
  max-width: 560px;
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

.msg-user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
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
  max-width: 78%;
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

.msg-time {
  margin-top: 4px;
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

.msg-user .msg-time {
  margin-right: 4px;
  text-align: right;
}

.msg-ai .msg-time {
  margin-left: 4px;
}

/* Reference images in messages */
.msg-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 8px;
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
  bottom: 12px;
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
  padding: 18px 58px 58px 64px;
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

/* Toolbar */
.input-toolbar {
  position: absolute;
  right: 58px;
  bottom: 12px;
  left: 60px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  row-gap: 5px;
  align-items: center;
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

/* Dropdowns */
.toolbar-dropdown {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 60;
  min-width: 140px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow:
    0 12px 40px rgb(0 0 0 / 18%),
    0 0 0 1px rgb(255 255 255 / 4%) inset;
  backdrop-filter: blur(20px) saturate(140%);
  transform-origin: bottom left;
  animation: dropdown-in 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdown-in {
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

.dropdown-title {
  padding: 4px 10px 8px;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.dropdown-item {
  display: flex;
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
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 60;
  width: 240px;
  padding: 10px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow:
    0 24px 64px rgb(0 0 0 / 18%),
    0 0 0 1px rgb(255 255 255 / 5%) inset;
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
  bottom: 12px;
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
</style>
