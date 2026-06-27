<script setup lang="ts">
import type { EditorElement } from '../types/editor';

const props = defineProps<{
  element: EditorElement;
}>();

const getElementStyle = (el: EditorElement) => {
  const bg = el.backgroundColor || 'transparent';
  const opacity = el.backgroundOpacity ?? 1;
  const flipH = el.flip?.horizontal ? -1 : 1;
  const flipV = el.flip?.vertical ? -1 : 1;
  return {
    position: 'absolute' as const,
    left: `${el.x || 0}px`,
    top: `${el.y || 0}px`,
    width: `${el.width || 100}px`,
    height: `${el.height || 100}px`,
    backgroundColor: bg,
    opacity: el.opacity ?? opacity,
    transform: `rotate(${el.rotation || 0}deg) scaleX(${flipH}) scaleY(${flipV})`,
    zIndex: el.zIndex || 0,
    borderRadius: el.borderRadius ? `${el.borderRadius}px` : '0',
    overflow: el.type === 'group' ? 'visible' : 'hidden',
    borderColor: el.borderColor || undefined,
    borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
    borderStyle: el.borderStyle || undefined,
  };
};

const getGroupBorder = (el: EditorElement) => {
  const bs = el.groupBorderStyle || 'none';
  if (bs === 'none') return 'none';
  return `${el.groupBorderWidth || 1}px ${bs} ${el.groupBorderColor || '#0d6efd'}`;
};

const iconClassMap: Record<string, string> = {
  heart: 'bi bi-heart-fill',
  star: 'bi bi-star-fill',
  bell: 'bi bi-bell-fill',
  gift: 'bi bi-gift-fill',
  ring: 'bi bi-gem',
  flower: 'bi bi-flower1',
  arrow: 'bi bi-arrow-right-circle-fill',
  check: 'bi bi-check-circle-fill',
  info: 'bi bi-info-circle-fill',
  location: 'bi bi-geo-alt-fill',
  phone: 'bi bi-telephone-fill',
  calendar: 'bi bi-calendar-fill',
  music: 'bi bi-music-note',
  camera: 'bi bi-camera-fill',
  chat: 'bi bi-chat-heart-fill',
  mail: 'bi bi-envelope-fill',
  link: 'bi bi-link-45deg',
  person: 'bi bi-person-fill',
  people: 'bi bi-people-fill',
  home: 'bi bi-house-heart-fill',
  tag: 'bi bi-tag-fill',
  shield: 'bi bi-shield-fill-check',
};

const getIconClass = (type: string) => {
  return iconClassMap[type] || 'bi bi-heart-fill';
};
</script>

<template>
  <div class="h5-element" :style="getElementStyle(element)">
    <!-- 文字 -->
    <template v-if="element.type === 'text'">
      <div
        class="h5-text"
        :style="{
          fontFamily: element.fontFamily || 'Microsoft YaHei',
          fontSize: `${element.fontSize || 16}px`,
          fontWeight: element.fontWeight || 'normal',
          textAlign: (element.textAlign as any) || 'center',
          color: element.textColor || '#333333',
        }"
      >
        {{ element.text || '' }}
      </div>
    </template>

    <!-- 装饰 -->
    <template v-else-if="element.type === 'decoration'">
      <div
        class="h5-decoration"
        :style="{
          fontSize: `${element.decorationSize || 32}px`,
          color: element.decorationColor || '#ff6b6b',
        }"
      >
        {{ element.decorationChar || '❤' }}
      </div>
    </template>

    <!-- 图片 -->
    <template v-else-if="element.type === 'image'">
      <img
        v-if="element.imageUrl"
        class="h5-image"
        :src="element.imageUrl"
        :style="
          ((): any => ({
            objectFit: element.imageFit || 'cover',
            opacity: element.imageOpacity ?? 1,
            borderRadius:
              (element.imageRadius ?? 0) ? `${element.imageRadius}px` : '0',
          }))()
        "
      />
      <div v-else class="h5-image h5-image-placeholder">
        <i class="bi bi-image"></i>
      </div>
    </template>

    <!-- 图标 -->
    <template v-else-if="element.type === 'icon'">
      <div
        class="h5-icon"
        :style="{
          fontSize: `${element.iconSize || 24}px`,
          color: element.iconColor || '#e94560',
        }"
      >
        <i :class="getIconClass(element.iconType || '')"></i>
      </div>
    </template>

    <!-- 形状 -->
    <template v-else-if="element.type === 'shape'">
      <div
        class="h5-shape"
        :style="{
          background: element.shapeBackground || '#ffcccc',
          borderRadius:
            element.shapeType === 'circle'
              ? '50%'
              : element.shapeType === 'rounded'
                ? '12px'
                : '0',
        }"
      ></div>
    </template>

    <!-- 边框 -->
    <template v-else-if="element.type === 'border'">
      <div
        class="h5-border"
        :style="{
          borderColor: element.borderColor || '#4b5563',
          borderWidth: `${element.borderWidth || 2}px`,
          borderStyle: element.borderStyle || 'solid',
          borderRadius: `${element.borderRadius || 0}px`,
        }"
      ></div>
    </template>

    <!-- 组合：递归渲染子元素 -->
    <template v-else-if="element.type === 'group'">
      <div
        class="h5-group-overlay"
        :style="{
          backgroundColor: element.groupBackgroundColor || 'transparent',
          border: getGroupBorder(element),
        }"
      ></div>
      <template v-if="element.children && element.children.length">
        <H5Element
          v-for="child in element.children"
          :key="child.id"
          :element="child"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.h5-element {
  position: absolute;
  transform-origin: center center;
}

.h5-text {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.h5-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.h5-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.h5-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 32px;
  color: #ccc;
  background: #f5f5f5;
}

.h5-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.h5-border {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border: 2px solid #e94560;
  border-radius: 8px;
}

.h5-shape {
  width: 100%;
  height: 100%;
}

.h5-group-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 4px;
}
</style>
