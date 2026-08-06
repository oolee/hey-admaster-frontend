<script setup lang="ts">
import type {
  AiGeneratedImage,
  ChatMessage,
  RefImage,
} from '#/store/aiDesignStore';

import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppHeader from '#/components/layout/AppHeader.vue';
import AiChatPanel from '#/features/ai-design/AiChatPanel.vue';
import AiSidebar from '#/features/ai-design/AiSidebar.vue';
import ImageLightbox from '#/features/ai-design/ImageLightbox.vue';
import SettingsDrawer from '#/features/ai-design/SettingsDrawer.vue';
import { useAiDesignStore } from '#/store/aiDesignStore';

const router = useRouter();
const store = useAiDesignStore();

// ── Sidebar state ──
const sidebarCollapsed = ref(false);

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

// ── Settings drawer ──
const showSettings = ref(false);

// ── Chat messages ──
const chatMessages = ref<ChatMessage[]>([]);
const isProcessing = ref(false);

function addMessage(
  role: 'assistant' | 'user',
  content: string,
  extra?: Partial<ChatMessage>,
) {
  const msg: ChatMessage = {
    id: `msg-${Date.now()}`,
    role,
    content,
    time: new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    modelUsed: store.selectedModel,
    ...extra,
  };
  chatMessages.value.push(msg);
  syncToSession(msg, extra);
}

function syncToSession(msg: ChatMessage, extra?: Partial<ChatMessage>) {
  const s = store.activeSession;
  if (!s) return;
  s.messages = [...chatMessages.value];
  if (extra?.images?.length) s.generatedImages = [...extra.images];
  if (store.selectedImage) s.selectedImageId = store.selectedImage;
  s.updatedAt = new Date().toISOString();
  if (msg.role === 'user' && s.title === '新对话' && msg.content.trim()) {
    s.title = msg.content.trim().replaceAll(/\s+/g, ' ').slice(0, 24);
  }
}

function loadActiveSession() {
  const s = store.activeSession;
  chatMessages.value = s ? [...s.messages] : [];
  store.generatedImages = s ? [...s.generatedImages] : [];
  store.selectedImage = s?.selectedImageId ?? null;
}

function newSession() {
  store.createSession();
  loadActiveSession();
}

function selectSession(id: string) {
  if (id === store.activeSessionId) return;
  store.selectSession(id);
  loadActiveSession();
}

function deleteSession(id: string) {
  store.removeSession(id);
  if (!store.activeSession) store.createSession();
  loadActiveSession();
}

function clearCurrentSession() {
  store.clearActiveSession();
  chatMessages.value = [];
  store.generatedImages = [];
  store.selectedImage = null;
}

// ── Reference images ──
const refImages = ref<RefImage[]>([]);
const fileInputRef = ref<HTMLInputElement>();
const uploadTag = ref<string>('other');

// Tag label map — matches store.tagOptions
const TAG_LABEL_MAP: Record<string, string> = {
  logo: 'LOGO',
  style: '风格',
  cad: 'CAD',
  site: '现场',
  material: '材质',
  other: '其他',
};

function triggerFilePicker(tag?: string) {
  uploadTag.value = tag ?? 'other';
  nextTick(() => fileInputRef.value?.click());
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  const currentTag = uploadTag.value;
  const tagLabel = TAG_LABEL_MAP[currentTag] ?? '其他';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || !file.type.startsWith('image/')) continue;
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      (e) => {
        const dataUrl = e.target?.result as string;
        refImages.value.push({
          id: `ref-${Date.now()}-${i}`,
          dataUrl,
          fileName: file.name,
          label: tagLabel,
          tag: currentTag,
        });
      },
      { once: true },
    );
    reader.readAsDataURL(file);
  }
  uploadTag.value = 'other';
  input.value = '';
}

function removeRefImage(id: string) {
  refImages.value = refImages.value.filter((r) => r.id !== id);
}

function updateRefImageNotes(id: string, notes: string) {
  const ref = refImages.value.find((r) => r.id === id);
  if (ref) ref.label = notes || ref.fileName;
}

function updateRefImageTag(id: string, tag: string) {
  const ref = refImages.value.find((r) => r.id === id);
  if (ref) ref.tag = tag;
}

// ── Lightbox ──
const lightboxImage = ref<AiGeneratedImage | null>(null);
const showLightbox = ref(false);

function openLightbox(img: AiGeneratedImage) {
  lightboxImage.value = img;
  showLightbox.value = true;
}

function closeLightbox() {
  showLightbox.value = false;
  lightboxImage.value = null;
}

function selectImageFromLightbox(img: AiGeneratedImage) {
  store.selectedImage = img.id;
  addMessage('user', `选中方案 ${img.title}`);
  closeLightbox();
}

// ── Modify dialog ──
const showModifyDialog = ref(false);
const modifyingImg = ref<AiGeneratedImage | null>(null);
const modifyFeedback = ref('');

function openModify(img: AiGeneratedImage) {
  modifyingImg.value = img;
  modifyFeedback.value = '';
  showModifyDialog.value = true;
}

async function submitModify() {
  if (!modifyFeedback.value.trim()) return;
  showModifyDialog.value = false;
  isProcessing.value = true;
  addMessage('user', `修改：${modifyFeedback.value}`);
  await new Promise((r) => setTimeout(r, 1500));
  store.revisionCounter++;
  const seed = 90 + store.revisionCounter;
  const newImg: AiGeneratedImage = {
    id: `img-${seed}`,
    url: `https://picsum.photos/600/400?random=${seed}`,
    title: `修改版 ${store.revisionCounter}`,
  };
  store.generatedImages = [newImg];
  store.selectedImage = newImg.id;
  store.revisionHistory.unshift({
    Id: `dr-mod-${Date.now()}`,
    DesignSessionId: 'ds-001',
    RevisionNo: store.revisionCounter,
    ImageUrl: newImg.url,
    ThumbnailUrl: newImg.url.replace('600/400', '200/100'),
    Prompt: null,
    OptimizedPrompt: null,
    UserFeedback: modifyFeedback.value,
    Source: 'AI_GptImage2',
    Status: 'Current',
    Width: store.designWidth * 10,
    Height: store.designHeight * 10,
    FileSize: 260_000,
    CreatedAt: new Date().toISOString(),
  });
  store.currentRevision = store.revisionCounter;
  addMessage('assistant', '已按修改意见重绘：', { images: [newImg] });
  isProcessing.value = false;
}

// ── Regenerate ──
function regenerate() {
  isProcessing.value = true;
  addMessage('user', '换一批方案');
  setTimeout(() => {
    const lastUserMsg = [...chatMessages.value]
      .toReversed()
      .find(
        (m) =>
          m.role === 'user' &&
          !m.content.includes('换一批方案') &&
          !m.content.includes('选中方案') &&
          !m.content.includes('修改：'),
      );
    const styleName = store.styleKeyword;
    const palName =
      store.colorPalettes.find((p) => p.id === store.selectedPalette)?.name ||
      '默认';
    const sizeText =
      store.designWidth && store.designHeight
        ? `${store.designWidth}×${store.designHeight}cm`
        : '未指定尺寸';
    const modelLabel = store.currentModel?.shortLabel || 'GPT-image2';

    addMessage(
      'assistant',
      `已分析需求：${styleName}风格，${sizeText}，${palName}配色\n\n正在生成 ${store.generateCount} 套方案... （模型：${modelLabel}）`,
      {},
    );

    setTimeout(() => {
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

      addMessage(
        'assistant',
        `已生成 ${count} 套方案（${modelLabel}），点击查看大图，或「重生成」换一批。`,
        {
          images: [...store.generatedImages],
        },
      );
      isProcessing.value = false;
    }, 1500);
  }, 100);
}

function runProductionCheck() {
  const allPass = store.revisionCounter >= 3;
  const text = allPass
    ? '### 生产就绪检查：✅ 通过\n\n- ✅ 尺寸 @ 300dpi\n- ✅ 色域 ΔE=2.1\n- ✅ 文字矢量 0 处'
    : '### 生产就绪检查：⚠️ 部分未通过\n\n- ❌ 尺寸 @ 150dpi\n- ❌ 色域 ΔE=8.5\n- ❌ 文字矢量 3 处\n\n> 建议转人工设计进一步处理';
  addMessage('assistant', text, { isCheckResult: true });
  const latest = store.revisionHistory.at(0);
  if (latest) latest.Status = 'Selected';
}

function downloadImage(url: string, title: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.jpg`;
  a.click();
}

function goBack() {
  router.push('/');
}

function handleLightboxKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showLightbox.value) closeLightbox();
}

onMounted(() => {
  window.addEventListener('keydown', handleLightboxKeydown);
  store.ensureSession();
  loadActiveSession();
});
onUnmounted(() => window.removeEventListener('keydown', handleLightboxKeydown));
</script>

<template>
  <div class="ai-design-page">
    <!-- ═══ Main site header ═══ -->
    <AppHeader />

    <!-- ═══ Body ═══ -->
    <div
      class="ai-design-body"
      :class="{ 'sidebar-collapsed': sidebarCollapsed }"
    >
      <AiSidebar
        :collapsed="sidebarCollapsed"
        @toggle="toggleSidebar"
        @new-session="newSession"
        @select-session="selectSession"
        @delete-session="deleteSession"
      />

      <div class="chat-area">
        <AiChatPanel
          :chat-messages="chatMessages"
          :is-processing="isProcessing"
          :ref-images="refImages"
          :sidebar-collapsed="sidebarCollapsed"
          @add-message="addMessage"
          @open-lightbox="openLightbox"
          @open-modify="openModify"
          @regenerate="regenerate"
          @run-production-check="runProductionCheck"
          @trigger-upload="triggerFilePicker"
          @remove-ref-image="removeRefImage"
          @update-ref-notes="updateRefImageNotes"
          @update-ref-tag="updateRefImageTag"
          @open-settings="showSettings = true"
        />
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden-input"
      @change="handleFilesSelected"
    />

    <!-- Lightbox -->
    <ImageLightbox
      :image="lightboxImage"
      :selected-image-id="store.selectedImage"
      :visible="showLightbox"
      @close="closeLightbox"
      @download="downloadImage"
      @modify="openModify"
      @select="selectImageFromLightbox"
    />

    <!-- Settings drawer -->
    <SettingsDrawer :visible="showSettings" @close="showSettings = false" />

    <!-- Modify dialog -->
    <Teleport to="body">
      <div v-if="showModifyDialog" class="modify-overlay">
        <div class="modify-backdrop" @click="showModifyDialog = false"></div>
        <div class="modify-dialog">
          <div class="modify-header">
            <h3 class="modify-title">局部修改 — {{ modifyingImg?.title }}</h3>
            <button class="modify-close" @click="showModifyDialog = false">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <textarea
            v-model="modifyFeedback"
            class="modify-textarea"
            rows="3"
            placeholder="例如：标题字体改成粗体红色、背景调亮..."
          ></textarea>
          <div class="modify-tags">
            <button class="modify-tag" @click="modifyFeedback += '颜色调整：'">
              🎨 颜色
            </button>
            <button class="modify-tag" @click="modifyFeedback += '字体修改：'">
              🔤 字体
            </button>
            <button class="modify-tag" @click="modifyFeedback += '布局调整：'">
              📐 布局
            </button>
            <button class="modify-tag" @click="modifyFeedback += '元素增删：'">
              ➕ 增删
            </button>
          </div>
          <div class="modify-actions">
            <button class="modify-cancel" @click="showModifyDialog = false">
              取消
            </button>
            <button class="modify-submit" @click="submitModify">
              提交修改
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ai-design-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
}

/* Ambient background atmosphere */
.ai-design-page::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: '';
  background:
    radial-gradient(
      ellipse 800px 600px at 20% 10%,
      var(--color-neon-glow) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 600px 400px at 85% 90%,
      rgb(122 158 0 / 4%) 0%,
      transparent 55%
    );
  opacity: 0.7;
}

:global(.dark) .ai-design-page::before {
  background:
    radial-gradient(
      ellipse 800px 600px at 20% 10%,
      rgb(122 158 0 / 8%) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 600px 400px at 85% 90%,
      rgb(122 158 0 / 5%) 0%,
      transparent 55%
    );
}

/* ═══ Body ═══ */
.ai-design-body {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
  padding-top: 60px;
}

.chat-area {
  flex: 1;
  min-width: 0;

  /* Page-level scroll — increase bottom padding so last content clears the fixed input.
     Input area is ~230px tall + 24px safe margin */
  padding-bottom: 280px;
  margin-left: 264px;
  transition: margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-design-body.sidebar-collapsed .chat-area {
  margin-left: 60px;
}

@media (max-width: 768px) {
  .chat-area,
  .ai-design-body.sidebar-collapsed .chat-area {
    margin-left: 0;
  }
}

/* Hidden input */
.hidden-input {
  display: none;
}

/* Modify dialog */
.modify-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modify-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 40%);
}

.modify-dialog {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 20px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgb(0 0 0 / 30%);
}

.modify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.modify-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.modify-close {
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

.modify-close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.modify-textarea {
  width: 100%;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: none;
  outline: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.modify-textarea:focus {
  border-color: var(--color-neon-dim);
}

.modify-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.modify-tag {
  padding: 4px 10px;
  font-size: 0.68rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  transition: all 0.2s;
}

.modify-tag:hover {
  color: var(--color-neon);
  border-color: var(--color-neon-dim);
}

.modify-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.modify-cancel {
  padding: 8px 16px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.modify-cancel:hover {
  background: var(--color-bg-primary);
}

.modify-submit {
  padding: 8px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  transition: background 0.2s;
}

.modify-submit:hover {
  background: #2563eb;
}
</style>
