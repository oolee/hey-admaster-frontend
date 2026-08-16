import type { V2ChatMessage, V2Conversation } from '@/api';
import type { SkillId, SkillInfo } from '@/skills/registry';

import { computed, ref } from 'vue';

import { useAgentStore } from '@/stores/agent';
// 工作台数据 store
import { defineStore } from 'pinia';

export const useWorkspaceStore = defineStore('workspace', () => {
  const agent = useAgentStore();

  const taskType = ref<SkillId>('chat');
  const sidebarCollapsed = ref(false);
  const templateDrawer = ref(true);
  const convPanelOpen = ref(false); // 小屏会话抽屉
  const conversations = ref<V2Conversation[]>([]);
  const activeConvId = ref<null | string>(null);
  const messagesByConv = ref<Record<string, V2ChatMessage[]>>({});

  /** 当前技能（元数据驱动；taskType 未命中时回退到清单首个技能） */
  const task = computed<SkillInfo | undefined>(
    () => agent.skills.find((t) => t.id === taskType.value) ?? agent.skills[0],
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

  /** 本地临时会话升级为后端会话（首次发送消息落库时调用） */
  function upgradeLocalConversation(oldId: string, conv: V2Conversation): void {
    const idx = conversations.value.findIndex((c) => c.id === oldId);
    if (idx === -1) return;
    const pending = messagesByConv.value[oldId];
    delete messagesByConv.value[oldId];
    conversations.value[idx] = { ...conv };
    if (activeConvId.value === oldId) activeConvId.value = conv.id;
    if (pending && pending.length > 0) messagesByConv.value[conv.id] = pending;
  }

  return {
    taskType,
    sidebarCollapsed,
    templateDrawer,
    convPanelOpen,
    conversations,
    activeConvId,
    messagesByConv,
    task,
    setConversations,
    ensureMessages,
    appendMessage,
    updateLastMessage,
    selectConv,
    addConversation,
    removeConversation,
    upgradeLocalConversation,
    toggleConvPanel() {
      convPanelOpen.value = !convPanelOpen.value;
    },
    closeConvPanel() {
      convPanelOpen.value = false;
    },
  };
});
