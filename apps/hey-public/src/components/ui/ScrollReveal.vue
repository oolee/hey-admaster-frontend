<script setup lang="ts">
import { useScrollReveal } from '#/composables/useScrollReveal'

const props = withDefaults(defineProps<{
  threshold?: number
}>(), {
  threshold: 0.15,
})

const { target, isRevealed } = useScrollReveal(props.threshold)
</script>

<template>
  <div ref="target" class="scroll-reveal-section">
    <!-- 遮罩层 -->
    <Transition name="reveal-mask">
      <div v-if="!isRevealed" class="scroll-reveal-mask" />
    </Transition>
    <!-- 内容 -->
    <div class="scroll-reveal-content" :class="{ revealed: isRevealed, 'reveal-trigger': isRevealed }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scroll-reveal-section {
  position: relative;
  overflow: hidden;
}

.scroll-reveal-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: #0a0a0f;
  pointer-events: none;
}

.scroll-reveal-content {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}

.scroll-reveal-content.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* 遮罩过渡 */
.reveal-mask-leave-active {
  transition: opacity 0.35s ease-out;
}

.reveal-mask-leave-to {
  opacity: 0;
}
</style>