<script setup lang="ts">
import type { ArtifactActionDef } from '@/skills/artifacts';

import type { Component } from 'vue';

import { computed } from 'vue';

import Badge from '@/components/ui/Badge.vue';
import {
  artifactViewers,
  fallbackViewer,
  resolveArtifactActions,
} from '@/skills/artifacts';
import { useAgentStore } from '@/stores/agent';
import {
  Check,
  ClipboardCopy,
  Copy,
  Download,
  ExternalLink,
  Link,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-vue-next';

const props = defineProps({
  message: { type: Object, required: true },
});

const emit = defineEmits(['action']);

const agent = useAgentStore();

const isUser = computed(() => props.message.role === 'user');

/** 产物渲染器：注册表按 type 分发，未知类型走兜底 viewer（§19.4 档一） */
const viewerComponent = computed<Component>(() => {
  const type = props.message.artifact?.type as string | undefined;
  if (!type) return fallbackViewer;
  return (
    artifactViewers[type as keyof typeof artifactViewers] ?? fallbackViewer
  );
});

/** 产物操作按钮：插件声明（按 kind）+ 内核通用操作（§19.2） */
const actionDefs = computed<ArtifactActionDef[]>(() => {
  const type = props.message.artifact?.type as string | undefined;
  if (!type) return [];
  return resolveArtifactActions(type, agent.capabilities);
});

const actionIcons: Record<string, Component> = {
  'clipboard-copy': ClipboardCopy,
  copy: Copy,
  download: Download,
  'refresh-cw': RefreshCw,
  wand2: Wand2,
  link: Link,
  'external-link': ExternalLink,
  check: Check,
};

function actionIcon(name: string): Component {
  return actionIcons[name] ?? Sparkles;
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

        <!-- 产物渲染：注册表按 type 分发（未知类型兜底，不会看不见） -->
        <component
          :is="viewerComponent"
          v-if="message.artifact"
          :artifact="message.artifact"
          :message-id="message.id"
          class="artifact"
        />
      </div>

      <!-- 操作区：消息自带 quick chips + 注册表产物操作（§19.2） -->
      <div
        v-if="message.actions?.length || actionDefs.length"
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
        <template v-if="actionDefs.length">
          <span class="msg-spacer"></span>
          <span v-if="message.artifact?.label" class="msg-artifact-label">
            {{ message.artifact.label }}
          </span>
          <div class="artifact-tools">
            <button
              v-for="a in actionDefs"
              :key="a.id"
              class="t-btn"
              :title="a.label"
              @click="
                emit('action', {
                  type: a.id,
                  action: a,
                  artifact: message.artifact,
                  message,
                })
              "
            >
              <component :is="actionIcon(a.icon)" :size="14" />
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

/* 产物容器（viewer 根节点） */
.artifact {
  margin-top: var(--sp-3);
  overflow: hidden;
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
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
