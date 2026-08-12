<script setup lang="ts">
import type { SkillInfo } from '@/skills/registry';

import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import Badge from '@/components/ui/Badge.vue';
import { SKILLS } from '@/skills/registry';
import { toast } from '@/utils/toast';
import { FileUp, Plus, ScanLine, X } from 'lucide-vue-next';

const emit = defineEmits(['select', 'close']);

const open = ref(false);
const btnRef = ref<HTMLElement | null>(null);
const panelPos = ref({ top: 0, left: 0 });

function toggle() {
  open.value = !open.value;
  if (open.value) nextTick(calcPos);
}
function calcPos() {
  const btn = btnRef.value;
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  panelPos.value = {
    top: r.top - 8, // 显示在按钮上方
    left: r.right - 300, // 面板右对齐到按钮右边缘（300px 是面板宽度）
  };
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return;
  const panel = document.querySelector('#skill-picker-portal');
  const target = e.target as Node | null;
  if (
    panel &&
    target &&
    !panel.contains(target) &&
    !btnRef.value?.contains(target)
  ) {
    open.value = false;
  }
}
function onResize() {
  if (open.value) calcPos();
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  window.removeEventListener('resize', onResize);
});

function choose(skill: SkillInfo) {
  emit('select', skill);
  open.value = false;
  toast.success(`已切换技能：${skill.name}`);
}
</script>

<template>
  <button
    ref="btnRef"
    class="plus-btn"
    :class="{ active: open }"
    @click.stop="toggle"
    :title="open ? '关闭' : '添加技能 / 文件'"
    aria-label="添加技能或文件"
  >
    <X v-if="open" :size="18" />
    <Plus v-else :size="18" />

    <!-- 弹层 Teleport 到 body，规避父级 overflow:hidden 裁剪 -->
    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="open"
          id="skill-picker-portal"
          class="plus-panel"
          :style="{ top: `${panelPos.top}px`, left: `${panelPos.left}px` }"
        >
          <div class="pp-head">
            <p class="pp-title">快捷操作</p>
            <span class="pp-hint">选择技能或添加文件</span>
          </div>

          <p class="pp-group">技能库</p>
          <div class="skill-grid">
            <button
              v-for="s in SKILLS.filter((x) => !x.experimental)"
              :key="s.id"
              class="skill-item"
              @click="choose(s)"
            >
              <span class="skill-icon"
                ><component :is="s.icon" :size="16"
              /></span>
              <span class="skill-name">{{ s.name }}</span>
            </button>
          </div>

          <p class="pp-group">实验技能</p>
          <button
            v-for="s in SKILLS.filter((x) => x.experimental)"
            :key="s.id"
            class="skill-item experimental"
            @click="choose(s)"
          >
            <span class="skill-icon"
              ><component :is="s.icon" :size="16"
            /></span>
            <span class="skill-name">{{ s.name }}</span>
            <Badge tone="warning" class="beta">Beta</Badge>
          </button>

          <p class="pp-group">添加文件</p>
          <button class="action-row" @click="emit('select', 'file')">
            <span class="action-icon"><FileUp :size="15" /></span>
            上传图片文件
            <span class="action-tip">支持 PNG / JPG / WebP</span>
          </button>
          <button class="action-row" @click="emit('select', 'scan')">
            <span class="action-icon"><ScanLine :size="15" /></span>
            扫描 / 粘贴
            <span class="action-tip">Ctrl+V 直接粘贴</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </button>
</template>

<style scoped>
.plus-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 2px;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) var(--ease-out-expo);
}

.plus-btn:hover,
.plus-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: rotate(90deg);
}

/* 弹层：通过 Teleport 到 body 避免被 composer-box overflow:hidden 裁剪 */
.plus-panel {
  position: fixed;
  z-index: 1000;
  width: 300px;
  max-width: calc(100vw - 32px);
  padding: var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  transform: translateY(-100%); /* 显示在按钮上方 */
}

.pp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--sp-3);
}

.pp-title {
  font-size: var(--text-sm);
  font-weight: 700;
}

.pp-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.pp-group {
  margin: var(--sp-3) 0 var(--sp-2);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
}

.pp-group:first-of-type {
  margin-top: 0;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
}

.skill-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: var(--sp-3) 4px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.skill-item:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.skill-icon {
  display: flex;
}

.skill-item.experimental {
  position: relative;
  background: linear-gradient(
    135deg,
    var(--color-accent-soft),
    var(--color-ai-soft)
  );
}

.beta {
  position: absolute;
  top: -6px;
  right: -4px;
  padding: 1px 5px;
  font-size: 9px;
}

.action-row {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  width: 100%;
  padding: 0.65rem 0.8rem;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: left;
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.action-row:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.action-icon {
  display: flex;
  color: var(--color-accent);
}

.action-tip {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.2s var(--ease-out-expo);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-100%) translateY(10px) scale(0.97);
}
</style>
