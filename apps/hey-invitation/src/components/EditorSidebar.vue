<script setup lang="ts">
import type { TemplateItem } from '../api/template';

import { computed, onMounted, reactive, ref } from 'vue';

import { listTemplates } from '../api/template';
import { builtinTemplates } from '../data/templates';
import { useEditorStore } from '../store/editor';
import { generateId } from '../types/editor';

const store = useEditorStore();

// 分类展开状态 - 文字默认展开，其他收起
const expandedCategories = reactive({
  text: true,
  decoration: false,
  image: false,
  border: false,
  icon: false,
  background: false,
});

const toggleCategory = (key: string) => {
  (expandedCategories as any)[key] = !(expandedCategories as any)[key];
};

// 自定义背景颜色
const customBgColor = ref('#ffffff');

// ========== 拖拽处理 ==========

const _buildElement = (data: Record<string, unknown>) => ({
  id: generateId(),
  zIndex: store.getNextZIndex(),
  backgroundColor: 'transparent',
  backgroundOpacity: 1,
  locked: false,
  visible: true,
  ...data,
});

// 文本拖拽
const onTextDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({ type: 'text', subType }),
  );
};

// 装饰拖拽
const onDecorationDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({ type: 'decoration', subType }),
  );
};

// 图片元素拖拽
const onImageDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({ type: 'image', subType }),
  );
};

// 边框元素拖拽
const onBorderDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({ type: 'border', subType }),
  );
};

// 图标元素拖拽
const onIconDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({ type: 'icon', subType }),
  );
};

// ========== 图片上传 ==========
const onUploadImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', (evt) => {
        const imageUrl = (evt.target as FileReader).result as string;
        store.addImageElement(imageUrl);
      });
      reader.readAsDataURL(file);
    }
  });
  input.click();
};

// ========== 背景设置 ==========
const setPageBg = (bg: string) => {
  store.updatePageBackground(bg);
};

const setPageBgGradient = () => {
  const bg = 'linear-gradient(135deg, #ffe4e6 0%, #fce7f3 100%)';
  store.updatePageBackground(bg);
  store.showToast('已应用图案背景', 'success');
};

const setPageBgPattern = () => {
  const bg =
    'repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #f0f9ff 10px, #f0f9ff 20px)';
  store.updatePageBackground(bg);
  store.showToast('已应用图案背景', 'success');
};

const onBgColorInput = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  customBgColor.value = color;
  store.updatePageBackground(color);
};

// ========== 模板（从 mock API） ==========
const templates = ref<TemplateItem[]>([]);
const templateLoading = ref(false);

// 模板分类
const templateCategories = [
  { key: 'all', label: '全部' },
  { key: 'chinese', label: '中式' },
  { key: 'western', label: '西式' },
  { key: 'minimal', label: '简约' },
  { key: 'creative', label: '创意' },
];
const activeTemplateCategory = ref('all');

// 模板分类映射
const templateCategoryMap: Record<string, string[]> = {
  chinese: ['builtin-003', 'builtin-009'], // 经典红金、中式古典
  western: ['builtin-001', 'builtin-002', 'builtin-004', 'builtin-010'], // 浪漫粉金、简约白绿、梦幻紫蓝、海滩婚礼
  minimal: ['builtin-002', 'builtin-011'], // 简约白绿、韩式简约
  creative: ['builtin-007', 'builtin-012'], // 星空梦幻、复古怀旧
};

const filteredTemplates = computed(() => {
  if (activeTemplateCategory.value === 'all') return templates.value;
  const ids = templateCategoryMap[activeTemplateCategory.value] || [];
  return templates.value.filter((t) => ids.includes(t.id));
});

const loadTemplates = async () => {
  templateLoading.value = true;
  try {
    const res = await listTemplates();
    if (res && res.code === 0 && Array.isArray(res.data)) {
      templates.value = res.data;
    }
  } catch {
    // 失败时降级为内置模板
    templates.value = builtinTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      preview: t.preview,
      pages: t.pages,
    })) as any;
  } finally {
    templateLoading.value = false;
  }
};

// 应用模板：替换当前编辑项目的全部页面
const onTemplateClick = (index: number) => {
  const tpl = filteredTemplates.value[index];
  if (!tpl) return;

  // 只在有未保存的操作时才提示
  if (
    store.hasUnsavedChanges &&
    window.confirm(
      `当前项目有未保存的更改。\n\n是否保存当前项目并切换到模板"${tpl.name}"？`,
    )
  ) {
    store.saveToLocal();
  }
  // 应用新模板
  store.projectName = tpl.name;
  store.pages = [];
  store.currentPageId = '';
  store.history = [];
  store.historyIndex = -1;
  doApplyTemplate(tpl);
};

const doApplyTemplate = (tpl: any) => {
  const builtin = builtinTemplates.find((b) => b.id === tpl.id);
  const dataSource = tpl.pages && tpl.pages.length > 0 ? tpl : builtin;
  if (!dataSource) {
    store.showToast('该模板暂无数据', 'warning');
    return;
  }
  try {
    const newPages = (dataSource.pages as any[]).map((p) => ({
      id: generateId(),
      name: p.name || '页面',
      backgroundColor: p.backgroundColor || '#ffffff',
      elements: (p.elements || []).map((el: any) => _buildElement(el)),
      thumbnail: null,
    }));
    store.setPages(newPages);
    store.showToast(`已应用模板：${dataSource.name}`, 'success');
  } catch (error) {
    console.error(error);
    store.showToast('模板应用失败', 'error');
  }
};

// ========== 纹理（纯 CSS 背景） ==========
const textureList = [
  {
    name: '条纹',
    bg: 'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #e0e0e0 10px, #e0e0e0 20px)',
  },
  {
    name: '渐变',
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: '网格',
    bg: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,0,0,0.08) 19px, rgba(0,0,0,0.08) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,0,0,0.08) 19px, rgba(0,0,0,0.08) 20px), #ffffff',
  },
  {
    name: '点阵',
    bg: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px), #ffffff',
    size: 'cover',
  },
  {
    name: '水波',
    bg: 'repeating-radial-gradient(circle at 50% 50%, rgba(59,130,246,0.08) 0px, rgba(59,130,246,0.08) 2px, transparent 2px, transparent 12px), #ffffff',
  },
  {
    name: '柔和',
    bg: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
  },
];

const applyTexture = (bg: string) => {
  store.updatePageBackground(bg);
  store.showToast('已应用纹理', 'success');
};

const onAIFeature = (feature: string) => {
  store.showToast(`AI ${feature} 功能即将上线，敬请期待`, 'info');
};

// 模板 tab 加载时自动拉取
onMounted(() => {
  loadTemplates();
});
</script>

<template>
  <aside class="editor-sidebar">
    <!-- 顶部标签页 -->
    <div class="sidebar-top-tabs">
      <button
        class="top-tab"
        :class="{ active: store.sidebarTab === 'elements' }"
        @click="store.setSidebarTab('elements')"
      >
        <i class="bi bi-palette"></i>
        <span>元素</span>
      </button>
      <button
        class="top-tab"
        :class="{ active: store.sidebarTab === 'templates' }"
        @click="store.setSidebarTab('templates')"
      >
        <i class="bi bi-grid"></i>
        <span>模板</span>
      </button>
      <button
        class="top-tab"
        :class="{ active: store.sidebarTab === 'ai' }"
        @click="store.setSidebarTab('ai')"
      >
        <i class="bi bi-stars"></i>
        <span>AI 助手</span>
      </button>
    </div>

    <!-- 设计元素标签页 -->
    <div v-if="store.sidebarTab === 'elements'" class="tab-content">
      <!-- 文本元素（默认展开） -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('text')">
          <h6 class="category-title">
            <i class="bi bi-type category-icon"></i> 文字元素
          </h6>
          <i
            class="bi"
            :class="
              expandedCategories.text ? 'bi-chevron-up' : 'bi-chevron-down'
            "
          ></i>
        </div>
        <div v-if="expandedCategories.text" class="category-content">
          <div class="elements-grid">
            <div
              class="element-item"
              draggable="true"
              @dragstart="onTextDragStart($event, 'title')"
            >
              <div class="element-preview">
                <div class="text-preview wedding-title">婚礼标题</div>
              </div>
              <span class="element-name">大标题</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onTextDragStart($event, 'subtitle')"
            >
              <div class="element-preview">
                <div class="text-preview wedding-subtitle">副标题文字</div>
              </div>
              <span class="element-name">副标题</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onTextDragStart($event, 'couple')"
            >
              <div class="element-preview">
                <div class="text-preview couple-names">新郎 & 新娘</div>
              </div>
              <span class="element-name">新人名字</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onTextDragStart($event, 'date')"
            >
              <div class="element-preview">
                <div class="text-preview wedding-date">2026年6月14日</div>
              </div>
              <span class="element-name">日期</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onTextDragStart($event, 'location')"
            >
              <div class="element-preview">
                <div class="text-preview wedding-location">婚礼地点</div>
              </div>
              <span class="element-name">地点</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 装饰元素 -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('decoration')">
          <h6 class="category-title">
            <i class="bi bi-heart category-icon"></i> 装饰元素
          </h6>
          <i
            class="bi"
            :class="
              expandedCategories.decoration
                ? 'bi-chevron-up'
                : 'bi-chevron-down'
            "
          ></i>
        </div>
        <div v-if="expandedCategories.decoration" class="category-content">
          <div class="elements-grid">
            <div
              class="element-item"
              draggable="true"
              @dragstart="onDecorationDragStart($event, 'heart')"
            >
              <div class="element-preview">
                <i class="bi bi-heart-fill"></i>
              </div>
              <span class="element-name">爱心</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onDecorationDragStart($event, 'flower')"
            >
              <div class="element-preview">
                <i class="bi bi-flower1"></i>
              </div>
              <span class="element-name">花朵</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onDecorationDragStart($event, 'ring')"
            >
              <div class="element-preview">
                <i class="bi bi-circle"></i>
              </div>
              <span class="element-name">戒指</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onDecorationDragStart($event, 'star')"
            >
              <div class="element-preview">
                <i class="bi bi-star-fill"></i>
              </div>
              <span class="element-name">星星</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onDecorationDragStart($event, 'music')"
            >
              <div class="element-preview">
                <i class="bi bi-music-note-beamed"></i>
              </div>
              <span class="element-name">音符</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onDecorationDragStart($event, 'bell')"
            >
              <div class="element-preview">
                <i class="bi bi-bell-fill"></i>
              </div>
              <span class="element-name">铃铛</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 图片元素 -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('image')">
          <h6 class="category-title">
            <i class="bi bi-image category-icon"></i> 图片元素
          </h6>
          <i
            class="bi"
            :class="
              expandedCategories.image ? 'bi-chevron-up' : 'bi-chevron-down'
            "
          ></i>
        </div>
        <div v-if="expandedCategories.image" class="category-content">
          <div class="elements-grid">
            <!-- 上传图片 -->
            <div class="element-item" @click="onUploadImage">
              <div class="element-preview">
                <i class="bi bi-plus-circle-dotted"></i>
              </div>
              <span class="element-name">上传图片</span>
            </div>
            <!-- 照片 -->
            <div
              class="element-item"
              draggable="true"
              @dragstart="onImageDragStart($event, 'photo')"
            >
              <div class="element-preview">
                <i class="bi bi-image"></i>
              </div>
              <span class="element-name">照片</span>
            </div>
            <!-- 相框 -->
            <div
              class="element-item"
              draggable="true"
              @dragstart="onImageDragStart($event, 'frame')"
            >
              <div class="element-preview">
                <i class="bi bi-border"></i>
              </div>
              <span class="element-name">相框</span>
            </div>
            <!-- 相册 -->
            <div
              class="element-item"
              draggable="true"
              @dragstart="onImageDragStart($event, 'gallery')"
            >
              <div class="element-preview">
                <i class="bi bi-images"></i>
              </div>
              <span class="element-name">相册</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 边框元素 -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('border')">
          <h6 class="category-title">
            <i class="bi bi-square category-icon"></i> 边框元素
          </h6>
          <i
            class="bi"
            :class="
              expandedCategories.border ? 'bi-chevron-up' : 'bi-chevron-down'
            "
          ></i>
        </div>
        <div v-if="expandedCategories.border" class="category-content">
          <div class="elements-grid">
            <div
              class="element-item"
              draggable="true"
              @dragstart="onBorderDragStart($event, 'simple')"
            >
              <div class="element-preview">
                <i class="bi bi-rectangle"></i>
              </div>
              <span class="element-name">简单边框</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onBorderDragStart($event, 'ornate')"
            >
              <div class="element-preview">
                <i class="bi bi-square"></i>
              </div>
              <span class="element-name">华丽边框</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onBorderDragStart($event, 'rounded')"
            >
              <div class="element-preview">
                <i class="bi bi-circle"></i>
              </div>
              <span class="element-name">圆角边框</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 图标元素 -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('icon')">
          <h6 class="category-title">
            <i class="bi bi-stars category-icon"></i> 图标元素
          </h6>
          <i
            class="bi"
            :class="
              expandedCategories.icon ? 'bi-chevron-up' : 'bi-chevron-down'
            "
          ></i>
        </div>
        <div v-if="expandedCategories.icon" class="category-content">
          <div class="elements-grid">
            <div
              class="element-item"
              draggable="true"
              @dragstart="onIconDragStart($event, 'map')"
            >
              <div class="element-preview">
                <i class="bi bi-geo-alt-fill"></i>
              </div>
              <span class="element-name">地图</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onIconDragStart($event, 'time')"
            >
              <div class="element-preview">
                <i class="bi bi-clock-fill"></i>
              </div>
              <span class="element-name">时间</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onIconDragStart($event, 'qr')"
            >
              <div class="element-preview">
                <i class="bi bi-upc-scan"></i>
              </div>
              <span class="element-name">二维码</span>
            </div>
            <div
              class="element-item"
              draggable="true"
              @dragstart="onIconDragStart($event, 'phone')"
            >
              <div class="element-preview">
                <i class="bi bi-telephone-fill"></i>
              </div>
              <span class="element-name">电话</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 背景元素 -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('background')">
          <h6 class="category-title">
            <i class="bi bi-palette-fill category-icon"></i> 背景元素
          </h6>
          <i
            class="bi"
            :class="
              expandedCategories.background
                ? 'bi-chevron-up'
                : 'bi-chevron-down'
            "
          ></i>
        </div>
        <div v-if="expandedCategories.background" class="category-content">
          <div class="elements-grid">
            <div class="element-item" @click="setPageBgGradient">
              <div
                class="element-preview"
                style="
                  background: linear-gradient(135deg, #ffe4e6 0%, #fce7f3 100%);
                "
              >
                <i class="bi bi-palette"></i>
              </div>
              <span class="element-name">渐变背景</span>
            </div>
            <div class="element-item" @click="setPageBgPattern">
              <div
                class="element-preview"
                style="
                  background: repeating-linear-gradient(
                    45deg,
                    #fff,
                    #fff 10px,
                    #f0f9ff 10px,
                    #f0f9ff 20px
                  );
                "
              >
                <i class="bi bi-texture"></i>
              </div>
              <span class="element-name">图案背景</span>
            </div>
            <!-- 纯色背景：内嵌实时颜色选择器 -->
            <div class="element-item">
              <div class="element-preview">
                <input
                  type="color"
                  :value="customBgColor"
                  @input="onBgColorInput"
                />
              </div>
              <span class="element-name">纯色背景</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板标签页 -->
    <div v-if="store.sidebarTab === 'templates'" class="tab-content">
      <div class="template-filters">
        <div class="template-filter-tabs">
          <button
            v-for="cat in templateCategories"
            :key="cat.key"
            class="template-filter-btn"
            :class="{ active: activeTemplateCategory === cat.key }"
            @click="activeTemplateCategory = cat.key"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <div v-if="templateLoading" class="template-loading">
        <i class="bi bi-arrow-repeat"></i> 正在加载模板...
      </div>

      <div v-else class="template-thumbnails">
        <div
          v-for="(tpl, index) in filteredTemplates"
          :key="tpl.id"
          class="template-thumbnail"
          @click="onTemplateClick(index)"
        >
          <div class="thumbnail-preview" :style="{ background: tpl.preview }">
            <div class="thumbnail-overlay">
              <span class="thumbnail-use-btn"
                ><i class="bi bi-arrow-right-circle"></i> 使用</span
              >
            </div>
            <span class="thumbnail-page-count"
              >{{ (tpl.pages || []).length }}页</span
            >
          </div>
          <div class="thumbnail-info">
            <span class="thumbnail-name">{{ tpl.name }}</span>
            <span
              class="thumbnail-tag"
              v-if="tpl.pages && tpl.pages.length >= 3"
              >精选</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- AI 助手标签页 -->
    <div v-if="store.sidebarTab === 'ai'" class="tab-content">
      <div class="ai-panel">
        <div class="ai-panel-header">
          <i class="bi bi-stars"></i>
          <h6>AI 智能助手</h6>
        </div>
        <div class="ai-panel-body">
          <div class="ai-feature-card" @click="onAIFeature('generate')">
            <div
              class="ai-feature-icon"
              style="background: linear-gradient(135deg, #667eea, #764ba2)"
            >
              <i class="bi bi-image"></i>
            </div>
            <div class="ai-feature-info">
              <span class="ai-feature-name">AI 生成请柬</span>
              <span class="ai-feature-desc">输入描述，AI 一键生成精美请柬</span>
            </div>
            <span class="ai-badge">热门</span>
          </div>
          <div class="ai-feature-card" @click="onAIFeature('rewrite')">
            <div
              class="ai-feature-icon"
              style="background: linear-gradient(135deg, #f093fb, #f5576c)"
            >
              <i class="bi bi-pencil-square"></i>
            </div>
            <div class="ai-feature-info">
              <span class="ai-feature-name">AI 文案优化</span>
              <span class="ai-feature-desc">智能优化请柬文字内容</span>
            </div>
            <span class="ai-badge">推荐</span>
          </div>
          <div class="ai-feature-card" @click="onAIFeature('layout')">
            <div
              class="ai-feature-icon"
              style="background: linear-gradient(135deg, #4facfe, #00f2fe)"
            >
              <i class="bi bi-layout-text-window-reverse"></i>
            </div>
            <div class="ai-feature-info">
              <span class="ai-feature-name">AI 智能排版</span>
              <span class="ai-feature-desc">自动优化元素布局和间距</span>
            </div>
          </div>
          <div class="ai-feature-card" @click="onAIFeature('color')">
            <div
              class="ai-feature-icon"
              style="background: linear-gradient(135deg, #43e97b, #38f9d7)"
            >
              <i class="bi bi-palette"></i>
            </div>
            <div class="ai-feature-info">
              <span class="ai-feature-name">AI 配色方案</span>
              <span class="ai-feature-desc">智能推荐匹配的配色方案</span>
            </div>
          </div>
          <div class="ai-feature-card" @click="onAIFeature('background')">
            <div
              class="ai-feature-icon"
              style="background: linear-gradient(135deg, #fa709a, #fee140)"
            >
              <i class="bi bi-wallpaper"></i>
            </div>
            <div class="ai-feature-info">
              <span class="ai-feature-name">AI 生成背景</span>
              <span class="ai-feature-desc">AI 生成精美背景纹理和图案</span>
            </div>
            <span class="ai-badge new">New</span>
          </div>
          <div class="ai-feature-card" @click="onAIFeature('font')">
            <div
              class="ai-feature-icon"
              style="background: linear-gradient(135deg, #a18cd1, #fbc2eb)"
            >
              <i class="bi bi-fonts"></i>
            </div>
            <div class="ai-feature-info">
              <span class="ai-feature-name">AI 字体推荐</span>
              <span class="ai-feature-desc">根据风格智能推荐最佳字体</span>
            </div>
          </div>
        </div>
        <div class="ai-panel-footer">
          <span class="ai-credits">
            <i class="bi bi-lightning-fill"></i>
            剩余免费次数：<strong>3</strong> 次
          </span>
          <button class="ai-upgrade-btn" @click="onAIFeature('upgrade')">
            <i class="bi bi-gem"></i> 升级会员
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 模板面板增强 */
.template-filters {
  padding: 8px 12px 4px;
}

.template-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.template-filter-btn {
  padding: 3px 10px;
  font-size: 11px;
  color: #6b7280;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.15s;
}

.template-filter-btn:hover {
  color: #4f46e5;
  border-color: #a5b4fc;
}

.template-filter-btn.active {
  color: #fff;
  background: #4f46e5;
  border-color: #4f46e5;
}

.template-loading {
  padding: 30px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.template-loading i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.template-thumbnails {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
}

.template-thumbnail {
  display: flex;
  gap: 10px;
  padding: 8px;
  cursor: pointer;
  background: #f9fafb;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.15s;
}

.template-thumbnail:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  transform: translateX(2px);
}

.thumbnail-preview {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 100px;
  overflow: hidden;
  border-radius: 6px;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 40%);
  opacity: 0;
  transition: opacity 0.15s;
}

.template-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-use-btn {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
}

.thumbnail-page-count {
  position: absolute;
  right: 2px;
  bottom: 2px;
  padding: 1px 4px;
  font-size: 9px;
  color: #fff;
  background: rgb(0 0 0 / 50%);
  border-radius: 4px;
}

.thumbnail-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.thumbnail-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.thumbnail-tag {
  display: inline-block;
  width: fit-content;
  padding: 1px 5px;
  margin-top: 3px;
  font-size: 9px;
  font-weight: 500;
  color: #92400e;
  background: #fef3c7;
  border-radius: 6px;
}

/* AI 助手面板 */
.ai-panel {
  padding: 12px;
}

.ai-panel-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.ai-panel-header i {
  font-size: 18px;
  color: #4f46e5;
}

.ai-panel-header h6 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.ai-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-feature-card {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  background: #f9fafb;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.ai-feature-card:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  transform: translateY(-1px);
}

.ai-feature-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.ai-feature-icon i {
  font-size: 16px;
  color: #fff;
}

.ai-feature-info {
  flex: 1;
  min-width: 0;
}

.ai-feature-name {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.ai-feature-desc {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #6b7280;
}

.ai-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 1px 5px;
  font-size: 9px;
  font-weight: 600;
  color: #92400e;
  background: #fef3c7;
  border-radius: 8px;
}

.ai-badge.new {
  color: #1e40af;
  background: #dbeafe;
}

.ai-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.ai-credits {
  font-size: 11px;
  color: #6b7280;
}

.ai-credits i {
  margin-right: 4px;
  color: #f59e0b;
}

.ai-credits strong {
  color: #4f46e5;
}

.ai-upgrade-btn {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 12px;
  transition: opacity 0.15s;
}

.ai-upgrade-btn:hover {
  opacity: 0.9;
}
</style>
