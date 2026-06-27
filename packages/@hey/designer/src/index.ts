import type { DesignDocument, DesignElement } from '@hey/core';

import { computed, defineComponent, h, reactive } from 'vue';

import { createHeyId } from '@hey/core';

export interface DesignerState {
  document: DesignDocument;
  historyLength: number;
  selectedElementId?: string;
  zoom: number;
}

export function createDefaultDocument(title = 'H5 邀请函'): DesignDocument {
  return {
    id: createHeyId('doc'),
    title,
    width: 390,
    height: 844,
    background: 'linear-gradient(180deg, #fff7ed 0%, #fdf2f8 100%)',
    elements: [
      {
        id: createHeyId('text'),
        kind: 'text',
        name: '主标题',
        x: 48,
        y: 112,
        width: 294,
        height: 72,
        text: '诚邀莅临',
        fontSize: 42,
        color: '#7c2d12',
      },
      {
        id: createHeyId('shape'),
        kind: 'shape',
        name: '信息卡片',
        x: 42,
        y: 242,
        width: 306,
        height: 178,
        fill: 'rgba(255,255,255,.82)',
        radius: 28,
      },
    ],
  };
}

const designerState = reactive<DesignerState>({
  document: createDefaultDocument(),
  selectedElementId: undefined,
  zoom: 0.92,
  historyLength: 1,
});

export function useDesignerStore() {
  const selectedElement = computed<DesignElement | undefined>(() =>
    designerState.document.elements.find(
      (item) => item.id === designerState.selectedElementId,
    ),
  );

  function selectElement(id?: string) {
    designerState.selectedElementId = id;
  }

  function setZoom(zoom: number) {
    designerState.zoom = Math.min(Math.max(zoom, 0.25), 2);
  }

  return {
    ...designerState,
    selectElement,
    selectedElement,
    setZoom,
  };
}

function renderElement(item: DesignElement) {
  const style = {
    left: `${item.x}px`,
    top: `${item.y}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    transform: `rotate(${item.rotation ?? 0}deg)`,
  };
  if (item.kind === 'text') {
    return h(
      'div',
      {
        class: 'hey-designer-element text',
        style: { ...style, color: item.color, fontSize: `${item.fontSize}px` },
      },
      item.text,
    );
  }
  if (item.kind === 'shape') {
    return h('div', {
      class: 'hey-designer-element shape',
      style: {
        ...style,
        background: item.fill,
        borderRadius: `${item.radius ?? 0}px`,
      },
    });
  }
  if (item.kind === 'image' || item.kind === 'generated-asset') {
    return h('img', {
      class: 'hey-designer-element image',
      style,
      src: item.src,
      alt: item.name,
    });
  }
  return h('div', { class: 'hey-designer-element', style }, item.name);
}

export const DesignerWorkspace = defineComponent({
  name: 'DesignerWorkspace',
  setup() {
    const store = useDesignerStore();
    const canvasStyle = computed(() => ({
      width: `${store.document.width}px`,
      height: `${store.document.height}px`,
      background: store.document.background,
      transform: `scale(${store.zoom})`,
    }));
    return () =>
      h('section', { class: 'hey-designer-shell' }, [
        h('aside', { class: 'hey-designer-sidebar' }, [
          h('strong', '素材 / 模板 / 页面'),
          h('button', '模板库'),
          h('button', '文本'),
          h('button', '图片'),
        ]),
        h('main', { class: 'hey-designer-stage' }, [
          h(
            'div',
            { class: 'hey-designer-canvas', style: canvasStyle.value },
            store.document.elements.map(renderElement),
          ),
        ]),
        h('aside', { class: 'hey-designer-inspector' }, [
          h('strong', '属性检查器'),
          h('p', store.selectedElement.value?.name ?? '未选择元素'),
          h('strong', '图层'),
          h(
            'ol',
            store.document.elements.map((item) =>
              h(
                'li',
                { onClick: () => store.selectElement(item.id) },
                item.name,
              ),
            ),
          ),
        ]),
      ]);
  },
});

export const H5Renderer = defineComponent({
  name: 'H5Renderer',
  props: {
    document: {
      type: Object as () => DesignDocument,
      default: createDefaultDocument,
    },
  },
  setup(props) {
    return () =>
      h(
        'article',
        {
          class: 'hey-h5-renderer',
          style: {
            width: `${props.document.width}px`,
            minHeight: `${props.document.height}px`,
            background: props.document.background,
          },
        },
        props.document.elements.map(renderElement),
      );
  },
});
