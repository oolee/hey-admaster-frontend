<script setup lang="ts">
import type { SkillInfo } from '@/skills/registry';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useAgentStore } from '@/stores/agent';
import { useWorkspaceStore } from '@/stores/workspace';
import { toast } from '@/utils/toast';
import { Check, ChevronDown, GripVertical, Sparkles } from 'lucide-vue-next';

const store = useWorkspaceStore();
const agent = useAgentStore();
const open = ref(false);
const wrap = ref<HTMLElement | null>(null);
const dragging = ref(false);
let dragOffset = { x: 0, y: 0 };

const FALLBACK_SKILL: SkillInfo = {
  id: 'chat',
  name: '聊天',
  slash: '/chat',
  icon: Sparkles,
  desc: '智能对话助手',
  example: '',
  modality: 0,
  color: { hue: '#6c7a89', light: 'rgba(108,122,137,0.14)' },
};

/* 当前技能（元数据驱动）—— 模型已 auto 隐藏，不再有模型选择 */
const currentSkill = computed<SkillInfo>(
  () =>
    agent.skills.find((s) => s.id === store.taskType) ??
    agent.skills[0] ??
    FALLBACK_SKILL,
);
/** 当前技能基础平台价（§16.2 事前透明，明码标价） */
const basePrice = computed(() => agent.basePriceOf(currentSkill.value.id));
const skillColor = computed(() => currentSkill.value.color);

/* 拖动位置（持久化到 localStorage），null = 默认 ws-top 位置 */
const pos = ref<{ dock: boolean; x: null | number; y: null | number }>({
  x: null,
  y: null,
  dock: true,
});

function loadPos() {
  try {
    const saved = localStorage.getItem('hey19-v2-floatingdock-pos');
    if (saved) {
      const p = JSON.parse(saved);
      if (typeof p.x === 'number' && typeof p.y === 'number') pos.value = p;
    }
  } catch {}
}
function savePos() {
  try {
    localStorage.setItem(
      'hey19-v2-floatingdock-pos',
      JSON.stringify(pos.value),
    );
  } catch {}
}

function onPointerDown(e: MouseEvent) {
  // 仅左侧手柄区域触发拖动
  const handle = (e.target as HTMLElement | null)?.closest('.fd-handle');
  if (!handle || !wrap.value) return;
  dragging.value = true;
  const r = wrap.value.getBoundingClientRect();
  dragOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
  e.preventDefault();
  document.body.style.userSelect = 'none';
}
function onPointerMove(e: MouseEvent) {
  if (!dragging.value) return;
  const next = {
    x: e.clientX - dragOffset.x,
    y: e.clientY - dragOffset.y,
    dock: false,
  };
  // 边界限制
  const maxX = window.innerWidth - 240;
  const maxY = window.innerHeight - 48;
  next.x = Math.max(8, Math.min(next.x, maxX));
  next.y = Math.max(8, Math.min(next.y, maxY));
  pos.value = next;
}
function onPointerUp() {
  if (!dragging.value) return;
  dragging.value = false;
  document.body.style.userSelect = '';
  savePos();
}

function resetPos() {
  pos.value = { x: null, y: null, dock: true };
  try {
    localStorage.removeItem('hey19-v2-floatingdock-pos');
  } catch {}
  toast.info('已复位到顶部');
}

const isFloating = computed(() => pos.value.x !== null);

const style = computed<Record<string, number | string>>(() => {
  if (!isFloating.value) return {} as Record<string, number | string>;
  return {
    position: 'fixed',
    top: `${pos.value.y ?? 0}px`,
    left: `${pos.value.x ?? 0}px`,
    transform: 'none',
    zIndex: 40,
  };
});

/* 下拉面板：floating 时定位到按钮下方，默认时位置由 CSS 处理 */
const dropdownStyle = computed<Record<string, number | string>>(() => {
  if (!isFloating.value) return {} as Record<string, number | string>;
  return {
    position: 'fixed',
    top: `${(pos.value.y ?? 0) + 48}px`,
    left: `${pos.value.x ?? 0}px`,
    transform: 'none',
    zIndex: 41,
  };
});

function onClickOutside(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as Node | null;
  if (wrap.value && target && !wrap.value.contains(target)) {
    const dd = document.querySelector('#fd-dropdown');
    if (!dd || !dd.contains(target)) open.value = false;
  }
}
onMounted(() => {
  loadPos();
  document.addEventListener('click', onClickOutside);
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);
  document.addEventListener('mousedown', onPointerDown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('mousemove', onPointerMove);
  document.removeEventListener('mouseup', onPointerUp);
  document.removeEventListener('mousedown', onPointerDown);
});

function setSkill(id: string) {
  store.taskType = id;
  open.value = false;
}
function toggle() {
  open.value = !open.value;
}
</script>

<template>
  <div
    ref="wrap"
    class="fd"
    :class="{ 'is-floating': isFloating, 'is-dragging': dragging }"
    :style="{
      ...style,
      '--sh': skillColor.hue,
      '--sl': skillColor.light,
    }"
    @dblclick="resetPos"
  >
    <button
      class="fd-handle"
      :title="
        dragging ? '拖动中' : isFloating ? '按住拖动 · 双击复位' : '按住拖动'
      "
    >
      <GripVertical :size="14" />
    </button>
    <button class="fd-trigger" @click="toggle">
      <span class="fd-skill-icon"
        ><component :is="currentSkill.icon" :size="14"
      /></span>
      <span class="fd-skill-name">{{ currentSkill.name }}</span>
      <span v-if="basePrice" class="fd-price" title="基础价（参数档位可能影响价格）">
        {{ basePrice }} 积分起
      </span>
      <ChevronDown :size="13" class="fd-chev" :class="{ open }" />
    </button>

    <Teleport to="body">
      <Transition name="usdd">
        <div
          v-if="open"
          id="fd-dropdown"
          class="fd-dropdown"
          :style="dropdownStyle"
        >
          <div class="fd-skill-list">
            <button
              v-for="s in agent.skills.filter((x) => !x.experimental)"
              :key="s.id"
              class="fd-skill-item"
              :class="{ active: store.taskType === s.id }"
              :style="{
                '--sh': s.color.hue,
                '--sl': s.color.light,
              }"
              :title="`${s.desc}${s.example ? `\n示例：${s.example}` : ''}`"
              @click="setSkill(s.id)"
            >
              <span class="fd-si"><component :is="s.icon" :size="16" /></span>
              <span class="fd-sn">
                <span class="fd-sn-name">
                  {{ s.name }}
                  <span v-if="agent.basePriceOf(s.id)" class="fd-price">
                    {{ agent.basePriceOf(s.id) }} 积分起
                  </span>
                </span>
                <span class="fd-sn-desc">{{ s.desc }}</span>
              </span>
              <Check
                v-if="store.taskType === s.id"
                :size="14"
                class="fd-check"
              />
            </button>
            <template v-if="agent.skills.some((x) => x.experimental)">
              <p class="fd-exp-title">实验技能</p>
              <button
                v-for="s in agent.skills.filter((x) => x.experimental)"
                :key="s.id"
                class="fd-skill-item experimental"
                :style="{
                  '--sh': s.color.hue,
                  '--sl': s.color.light,
                }"
                :title="`${s.desc}${s.example ? `\n示例：${s.example}` : ''}`"
                @click="setSkill(s.id)"
              >
                <span class="fd-si"><component :is="s.icon" :size="16" /></span>
                <span class="fd-sn">
                  <span class="fd-sn-name"
                    >{{ s.name }} <span class="fd-beta">Beta</span></span
                  >
                  <span class="fd-sn-desc">{{ s.desc }}</span>
                </span>
              </button>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fd {
  position: relative;
  display: inline-flex;
  gap: 0;
  align-items: center;
  padding: 2px;
  background: var(--color-surface);
  border: 1.5px solid var(--sh);
  border-radius: 14px;
  transition: box-shadow var(--dur-fast) ease;
}

.fd:hover {
  box-shadow: var(--shadow-sm);
}

.fd.is-floating {
  box-shadow: var(--shadow-md);
}

.fd.is-dragging {
  cursor: grabbing;
  box-shadow: var(--shadow-lg);
}

.fd-handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 36px;
  color: var(--color-text-3);
  cursor: grab;
  border-radius: 10px;
  transition: all var(--dur-fast) ease;
}

.fd-handle:hover {
  color: var(--sh);
  background: var(--color-surface-2);
}

.fd.is-dragging .fd-handle {
  cursor: grabbing;
  background: var(--color-surface-2);
}

.fd-trigger {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 36px;
  padding: 0 10px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-1);
  white-space: nowrap;
  border-radius: 10px;
  transition: all var(--dur-fast) ease;
}

.fd-trigger:hover {
  background: var(--sl);
}

.fd-skill-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: #fff;
  background: var(--sh);
  border-radius: 50%;
}

.fd-skill-name {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--sh);
}

.fd-chev {
  flex-shrink: 0;
  color: var(--color-text-3);
  transition: transform var(--dur-fast) ease;
}

.fd-chev.open {
  transform: rotate(180deg);
}

/* dropdown：通过 Teleport 到 body 避免 overflow 裁剪 */
.fd-dropdown {
  z-index: 41;
  width: 300px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}

.fd-skill-list {
  max-height: 360px;
  padding: 6px;
  overflow-y: auto;
}

.fd-skill-item {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  width: 100%;
  padding: 0.65rem 0.8rem;
  margin-bottom: 2px;
  text-align: left;
  border-radius: var(--r-md);
  transition: background var(--dur-fast) ease;
}

.fd-skill-item:hover {
  background: var(--sl);
}

.fd-skill-item.active {
  background: var(--sl);
}

.fd-skill-item.active .fd-check {
  color: var(--sh);
}

.fd-si {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--sh);
  background: var(--sl);
  border-radius: var(--r-md);
}

.fd-skill-item.active .fd-si {
  color: #fff;
  background: var(--sh);
}

.fd-sn {
  flex: 1;
  min-width: 0;
}

.fd-sn-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-1);
}

.fd-sn-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.fd-beta {
  padding: 1px 5px;
  margin-left: 4px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: var(--color-warning);
  border-radius: var(--r-full);
}

.fd-exp-title {
  padding: var(--sp-3) 0.8rem 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
}

.fd-skill-item.experimental {
  background: linear-gradient(90deg, var(--sl), transparent);
}

.fd-check {
  color: var(--color-text-3);
}

.usdd-enter-active,
.usdd-leave-active {
  transition: all 0.2s var(--ease-out-expo);
}

.usdd-enter-from,
.usdd-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

@media (max-width: 768px) {
  .fd-trigger {
    padding: 0 8px;
  }
}

.fd-price {
  margin-left: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-full);
  white-space: nowrap;
}
</style>
