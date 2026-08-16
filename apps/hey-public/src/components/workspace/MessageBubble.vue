<script setup lang="ts">
import { computed, ref } from 'vue';

import ArtCanvas from '@/components/ui/ArtCanvas.vue';
import Badge from '@/components/ui/Badge.vue';
import { toast } from '@/utils/toast';
import {
  Check,
  ClipboardCopy,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  Globe,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-vue-next';

const props = defineProps({
  message: { type: Object, required: true },
});

const emit = defineEmits(['action']);

const isUser = computed(() => props.message.role === 'user');

const artifactMeta = computed(() => {
  const m = props.message;
  if (!m.artifact) return null;
  switch (m.artifact.type) {
    case 'code': {
      return { label: '代码片段', icon: FileCode, tone: 'success' };
    }
    case 'image': {
      return { label: '图像生成', icon: ImageIcon, tone: 'accent' };
    }
    case 'ppt': {
      return { label: 'HTML 动效 PPT', icon: FileCode, tone: 'ai' };
    }
    case 'web': {
      return { label: '网页预览', icon: Globe, tone: 'ai' };
    }
    default: {
      return { label: m.artifact.type, icon: ImageIcon, tone: 'neutral' };
    }
  }
});

function copy() {
  toast.success('提示词已复制');
}
function download() {
  toast.info('已发起下载');
}
function retry() {
  emit('action', { type: 'retry' });
}

const copied = ref(false);
async function copyImage() {
  /* 真机可通过 navigator.clipboard.write 复制真实图片；
     这里把生成内容文字（提示词 + 元数据）复制到剪贴板，
     演示模式下给出明确反馈，让用户感知能力可用 */
  try {
    const meta = props.message.artifact;
    const text = [
      `Hey 19 AI 生成图像`,
      meta?.label ? `类型：${meta.label}` : null,
      props.message.content ? `说明：${props.message.content}` : null,
      props.message.cost ? `消耗：${props.message.cost} 积分` : null,
    ]
      .filter(Boolean)
      .join('\n');
    if (navigator.clipboard && text) {
      await navigator.clipboard.writeText(text);
      copied.value = true;
      setTimeout(() => (copied.value = false), 1600);
      toast.success('图像信息已复制到剪贴板');
    } else {
      toast.info('当前环境不支持剪贴板');
    }
  } catch (error) {
    toast.error(
      `复制失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
</script>

<template>
  <div class="msg" :class="[message.role, { streaming: message.streaming }]">
    <div class="msg-avatar">
      {{ isUser ? 'U' : 'AI' }}
    </div>
    <div class="msg-body">
      <!-- 头部标签：技能 / 模型 -->
      <div v-if="!isUser && (message.task || message.model)" class="msg-meta">
        <Badge v-if="message.task" tone="ai">{{ message.task }}</Badge>
        <Badge v-if="message.model" tone="neutral">{{ message.model }}</Badge>
        <span v-if="message.cost" class="msg-cost"
          >消耗 {{ message.cost }} 积分</span
        >
      </div>

      <div class="msg-bubble">
        <p v-if="message.content" class="msg-text">{{ message.content }}</p>
        <span v-if="message.streaming" class="caret"></span>

        <!-- 图像产物 -->
        <div
          v-if="message.artifact?.type === 'image'"
          class="artifact artifact-image"
        >
          <template v-if="message.artifact.images?.length">
            <img
              v-for="img in message.artifact.images"
              :key="img.url"
              :src="img.url"
              class="artifact-img"
              alt="AI 生成图像"
            />
          </template>
          <ArtCanvas
            v-else
            variant="poster"
            :seed="message.id"
            :label="message.content"
          />
        </div>

        <!-- PPT 产物（带 HTML 预览） -->
        <div
          v-else-if="message.artifact?.type === 'ppt'"
          class="artifact artifact-ppt"
        >
          <div class="ppt-frame">
            <iframe
              v-if="message.artifact.html"
              :srcdoc="message.artifact.html"
              sandbox="allow-scripts"
              loading="lazy"
              class="ppt-iframe"
            ></iframe>
          </div>
          <div class="artifact-bar">
            <Badge tone="ai">
              {{ message.artifact.pages || 5 }} 页 · 自动动效
            </Badge>
            <button class="t-btn" @click="download">
              <Download :size="14" /> 导出
            </button>
          </div>
        </div>

        <!-- 网页产物 -->
        <div
          v-else-if="message.artifact?.type === 'web'"
          class="artifact artifact-web"
        >
          <div class="web-frame">
            <iframe
              v-if="message.artifact.html"
              :srcdoc="message.artifact.html"
              sandbox="allow-scripts"
              class="web-iframe"
              loading="lazy"
            ></iframe>
          </div>
          <div class="artifact-bar">
            <Badge tone="ai">单页响应式</Badge>
            <button class="t-btn" @click="download">
              <Download :size="14" />
            </button>
            <button
              class="t-btn"
              @click="
                emit('action', { type: 'open', url: message.artifact.url })
              "
            >
              <ExternalLink :size="14" /> 新窗口
            </button>
          </div>
        </div>

        <!-- 代码产物 -->
        <div
          v-else-if="message.artifact?.type === 'code'"
          class="artifact artifact-code"
        >
          <pre><code>{{ message.artifact.code }}</code></pre>
        </div>
      </div>

      <!-- 提示操作（图片产物的标签 + 工具按钮右对齐到「继续」chips 之后） -->
      <div
        v-if="message.actions?.length || message.artifact?.type === 'image'"
        class="msg-actions"
      >
        <button
          v-for="a in message.actions"
          :key="a"
          class="mini-chip"
          @click="emit('action', { type: 'quick', label: a })"
        >
          {{ a }}
        </button>
        <template v-if="message.artifact?.type === 'image'">
          <span class="msg-spacer"></span>
          <span class="msg-artifact-label">
            {{ message.artifact.label || '图像' }}
          </span>
          <div class="artifact-tools">
            <button
              class="t-btn"
              :title="copied ? '已复制' : '复制图像信息'"
              @click="copyImage"
            >
              <Check v-if="copied" :size="14" />
              <ClipboardCopy v-else :size="14" />
            </button>
            <button class="t-btn" title="下载" @click="download">
              <Download :size="14" />
            </button>
            <button class="t-btn" title="复制提示词" @click="copy">
              <Copy :size="14" />
            </button>
            <button class="t-btn" title="重新生成" @click="retry">
              <RefreshCw :size="14" />
            </button>
          </div>
        </template>
      </div>

      <!-- 上传的图片 -->
      <div v-if="message.attachment" class="msg-attachment">
        <img :src="message.attachment" alt="上传图片" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex;
  gap: var(--sp-3);
}

.msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 50%;
}

.msg.user .msg-avatar {
  color: var(--color-text-1);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.msg-body {
  max-width: 78%;
}

.msg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding-left: 6px;
  margin-bottom: 6px;
}

.msg-cost {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.msg-bubble {
  padding: var(--sp-4) var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-sm);
}

.msg.user .msg-bubble {
  color: var(--color-text-inverse);
  background: var(--color-primary-deep);
  border-color: transparent;
  border-bottom-right-radius: 4px;
}

.msg.ai .msg-bubble {
  border-bottom-left-radius: 4px;
}

.msg.streaming .msg-bubble {
  box-shadow:
    0 0 0 2px var(--color-ai-soft),
    var(--shadow-sm);
}

.msg-text {
  font-size: var(--text-base);
  line-height: 1.8;
  white-space: pre-line;
}

.msg.user .msg-text {
  color: var(--color-text-inverse);
}

.caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--color-accent);
  animation: breathe 1s infinite;
}

/* 产物容器 */
.artifact {
  margin-top: var(--sp-3);
  overflow: hidden;
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.artifact-img {
  display: block;
  width: 100%;
  max-width: 480px;
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
}

.artifact-image {
  position: relative;
  aspect-ratio: 16/10;
}

.artifact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.artifact-tools {
  display: flex;
  gap: 4px;
}

.t-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 10px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.t-btn:hover {
  color: var(--color-text-1);
  border-color: var(--color-border-strong);
}

.ppt-frame,
.web-frame {
  width: 100%;
  background: #fff;
}

.ppt-iframe {
  display: block;
  width: 100%;
  aspect-ratio: 16/9;
  border: 0;
}

.web-iframe {
  display: block;
  width: 100%;
  height: 380px;
  border: 0;
}

.artifact-code pre {
  padding: var(--sp-4);
  margin: 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-1);
}

.artifact-code code {
  background: transparent;
}

.msg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  align-items: center;
  margin-top: var(--sp-2);
}

.msg-spacer {
  flex: 1;
}

.msg-artifact-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-3);
}

.mini-chip {
  padding: 0.4rem 0.9rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.mini-chip:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.msg-attachment {
  max-width: 240px;
  margin-top: var(--sp-2);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
}

.msg-attachment img {
  display: block;
  width: 100%;
}
</style>
