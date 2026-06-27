import { onMounted, onUnmounted, ref } from 'vue';

export function useMousePosition() {
  const x = ref(0);
  const y = ref(0);
  const isHovering = ref(false);

  function onMouseMove(e: MouseEvent) {
    x.value = e.clientX;
    y.value = e.clientY;
    isHovering.value = true;
  }

  function onMouseLeave() {
    isHovering.value = false;
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
  });

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
  });

  return { x, y, isHovering };
}
