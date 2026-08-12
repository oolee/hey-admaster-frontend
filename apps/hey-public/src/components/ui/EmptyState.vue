<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';

const props = defineProps({
  title: { type: String, default: '暂无数据' },
  desc: { type: String, default: '换个筛选条件试试，或点击下方按钮开始创作' },
  actionText: { type: String, default: '' },
  to: { type: String, default: '' },
});

const emit = defineEmits(['action']);

function onClick() {
  if (props.to) return; // router-link 自行处理
  emit('action');
}
</script>

<template>
  <div class="empty">
    <div class="empty-icon"><Inbox :size="28" /></div>
    <h3>{{ title }}</h3>
    <p>{{ desc }}</p>
    <router-link
      v-if="actionText && to"
      :to="to"
      class="btn btn--primary btn--md"
    >
      {{ actionText }}
    </router-link>
    <button
      v-else-if="actionText"
      class="btn btn--primary btn--md"
      @click="onClick"
    >
      {{ actionText }}
    </button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1.5rem;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 0.4rem;
  color: var(--color-text-3);
  background: var(--color-surface-2);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--r-xl);
}

.empty h3 {
  font-size: var(--text-lg);
}

.empty p {
  max-width: 40ch;
  margin-bottom: 0.6rem;
  font-size: var(--text-sm);
  color: var(--color-text-3);
}
</style>
