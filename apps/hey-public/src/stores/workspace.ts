import type { V2ChatMessage, V2Conversation } from '@/api';
import type { ModelInfo, SkillId, SkillInfo } from '@/skills/registry';

import { computed, ref } from 'vue';

import { MODELS, SKILLS as TASK_TYPES } from '@/skills/registry';
// 工作台数据 store
import { defineStore } from 'pinia';

export { MODELS, TASK_TYPES };

export const useWorkspaceStore = defineStore('workspace', () => {
  const taskType = ref<SkillId>('chat');
  const model = ref('auto');
  const sidebarCollapsed = ref(false);
  const templateDrawer = ref(true);
  const convPanelOpen = ref(false); // 小屏会话抽屉
  const conversations = ref<V2Conversation[]>([]);
  const activeConvId = ref<null | string>(null);
  const messagesByConv = ref<Record<string, V2ChatMessage[]>>({});

  const activeModel = computed<ModelInfo | undefined>(
    () => MODELS.find((m) => m.id === model.value) || MODELS[0],
  );
  const task = computed<SkillInfo | undefined>(() =>
    TASK_TYPES.find((t) => t.id === taskType.value),
  );

  function setConversations(list: V2Conversation[]): void {
    conversations.value = list;
    const first = list[0];
    if (!activeConvId.value && first) activeConvId.value = first.id;
  }

  function ensureMessages(convId: string): V2ChatMessage[] {
    if (!messagesByConv.value[convId]) messagesByConv.value[convId] = [];
    return messagesByConv.value[convId];
  }

  function appendMessage(convId: string, msg: V2ChatMessage): void {
    const list = ensureMessages(convId);
    list.push(msg);
  }

  function updateLastMessage(
    convId: string,
    patch: Partial<V2ChatMessage>,
  ): void {
    const list = messagesByConv.value[convId];
    const last = list?.[list.length - 1];
    if (!last) return;
    Object.assign(last, patch);
  }

  function selectConv(id: string): void {
    activeConvId.value = id;
  }

  function addConversation(conv: V2Conversation): void {
    conversations.value.unshift(conv);
    activeConvId.value = conv.id;
    messagesByConv.value[conv.id] = [];
  }

  function removeConversation(id: string): void {
    conversations.value = conversations.value.filter((c) => c.id !== id);
    delete messagesByConv.value[id];
    if (activeConvId.value === id) {
      activeConvId.value = conversations.value[0]?.id ?? null;
    }
  }

  return {
    taskType,
    model,
    sidebarCollapsed,
    templateDrawer,
    convPanelOpen,
    conversations,
    activeConvId,
    messagesByConv,
    activeModel,
    task,
    setConversations,
    ensureMessages,
    appendMessage,
    updateLastMessage,
    selectConv,
    addConversation,
    removeConversation,
    toggleConvPanel() {
      convPanelOpen.value = !convPanelOpen.value;
    },
    closeConvPanel() {
      convPanelOpen.value = false;
    },
  };
});
