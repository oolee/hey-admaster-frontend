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
        :class="{ active: store.sidebarTab === 'textures' }"
        @click="store.setSidebarTab('textures')"
      >
        <i class="bi bi-texture"></i>
        <span>纹理</span>
      </button>
    </div>

    <!-- 设计元素标签页 -->
    <div v-if="store.sidebarTab === 'elements'" class="tab-content">
      <!-- 文本元素（默认展开） -->
      <div class="elements-category">
        <div class="category-header" @click="toggleCategory('text')">
          <h6 class="category-title"><i class="bi bi-type category-icon"></i> 文字元素</h6>
          <i class="bi" :class="expandedCategories.text ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
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
          <h6 class="category-title"><i class="bi bi-heart category-icon"></i> 装饰元素</h6>
          <i class="bi" :class="expandedCategories.decoration ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
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
          <h6 class="category-title"><i class="bi bi-image category-icon"></i> 图片元素</h6>
          <i class="bi" :class="expandedCategories.image ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
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
          <h6 class="category-title"><i class="bi bi-square category-icon"></i> 边框元素</h6>
          <i class="bi" :class="expandedCategories.border ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
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
          <h6 class="category-title"><i class="bi bi-stars category-icon"></i> 图标元素</h6>
          <i class="bi" :class="expandedCategories.icon ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
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
          <h6 class="category-title"><i class="bi bi-palette-fill category-icon"></i> 背景元素</h6>
          <i class="bi" :class="expandedCategories.background ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
        </div>
        <div v-if="expandedCategories.background" class="category-content">
          <div class="elements-grid">
            <div
              class="element-item"
              @click="setPageBgGradient"
            >
              <div class="element-preview" style="background:linear-gradient(135deg, #ffe4e6 0%, #fce7f3 100%)">
                <i class="bi bi-palette"></i>
              </div>
              <span class="element-name">渐变背景</span>
            </div>
            <div
              class="element-item"
              @click="setPageBgPattern"
            >
              <div class="element-preview" style="background:repeating-linear-gradient(45deg,#fff,#fff 10px,#f0f9ff 10px,#f0f9ff 20px)">
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
                >
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
        <select class="form-select form-select-sm">
          <option>全部模板（{{ templates.length }}）</option>
        </select>
        <button class="btn btn-sm btn-outline-secondary" @click="loadTemplates">
          <i class="bi bi-arrow-clockwise"></i> 刷新
        </button>
      </div>

      <div v-if="templateLoading" class="template-loading">
        <i class="bi bi-arrow-repeat"></i> 正在加载模板...
      </div>

      <div v-else class="template-thumbnails">
        <div
          v-for="(tpl, index) in templates"
          :key="tpl.id"
          class="template-thumbnail"
          @click="applyTemplate(index)"
        >
          <div class="thumbnail-preview" :style="{ background: tpl.preview }"></div>
          <span class="thumbnail-name">{{ tpl.name }}</span>
          <span class="thumbnail-meta">{{ (tpl.pages || []).length }} 页</span>
        </div>
      </div>
    </div>

    <!-- 纹理标签页 -->
    <div v-if="store.sidebarTab === 'textures'" class="tab-content">
      <div class="texture-categories">
        <h6 class="category-title">纹理分类（共 {{ textureList.length }} 项）</h6>
      </div>
      <div class="textures-grid">
        <div
          v-for="(t, idx) in textureList"
          :key="idx"
          class="texture-item"
          @click="applyTexture(t.bg)"
        >
          <div class="texture-preview" :style="{ background: t.bg }"></div>
          <span class="texture-name">{{ t.name }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useEditorStore } from '../store/editor';
import { generateId } from '../types/editor';
import { listTemplates, type TemplateItem } from '../api/template';
import { builtinTemplates } from '../data/templates';

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
  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'text', subType }));
};

// 装饰拖拽
const onDecorationDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'decoration', subType }));
};

// 图片元素拖拽
const onImageDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'image', subType }));
};

// 边框元素拖拽
const onBorderDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'border', subType }));
};

// 图标元素拖拽
const onIconDragStart = (e: DragEvent, subType: string) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'icon', subType }));
};

// ========== 图片上传 ==========
const onUploadImage = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imageUrl = evt.target?.result as string;
        store.addImageElement(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };
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
  const bg = 'repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #f0f9ff 10px, #f0f9ff 20px)';
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

const loadTemplates = async () => {
  templateLoading.value = true;
  try {
    const res = await listTemplates();
    if (res && res.code === 0 && Array.isArray(res.data)) {
      templates.value = res.data;
    }
  } catch (e) {
    // 失败时降级为内置模板
    templates.value = [
      { id: 'local-001', name: '浪漫粉金', preview: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', pages: [] } as any,
      { id: 'local-002', name: '经典蓝紫', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', pages: [] } as any,
      { id: 'local-003', name: '梦幻红粉', preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', pages: [] } as any,
    ];
  } finally {
    templateLoading.value = false;
  }
};

// 应用模板：替换当前编辑项目的全部页面
const applyTemplate = (index: number) => {
  // 优先使用 API 模板，没有页面数据时使用内置模板
  const apiTpl = templates.value[index];
  const tpl = (apiTpl && apiTpl.pages && apiTpl.pages.length > 0) ? apiTpl : builtinTemplates[index];
  if (!tpl) {
    store.showToast('该模板暂无数据', 'warning');
    return;
  }
  try {
    const newPages = (tpl.pages as any[]).map((p) => ({
      id: generateId(),
      name: p.name || '页面',
      backgroundColor: p.backgroundColor || '#ffffff',
      elements: (p.elements || []).map((el: any) => _buildElement(el)),
      thumbnail: null,
    }));
    store.setPages(newPages);
    store.showToast(`已应用模板：${tpl.name}`, 'success');
  } catch (e) {
    console.error(e);
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

// 模板 tab 加载时自动拉取
onMounted(() => {
  loadTemplates();
});
</script>
