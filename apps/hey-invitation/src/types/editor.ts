// 编辑器类型定义 - 使用统一的元素类型（带可选属性）

export interface EditorElement {
  id: string;
  type: 'text' | 'decoration' | 'image' | 'border' | 'icon' | 'group' | 'shape';
  subType?: string;
  name?: string;
  groupId?: string;
  parentGroupId?: string;
  children?: EditorElement[];
  // 位置
  x: number;
  y: number;
  // 尺寸
  width: number;
  height: number;
  // 旋转
  rotation: number;
  // 层级
  zIndex: number;
  // 背景样式
  backgroundColor: string;
  backgroundOpacity: number;
  // 文本属性
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  // 装饰元素属性
  decorationColor?: string;
  decorationSize?: number;
  decorationChar?: string;
  // 图片元素属性
  imageUrl?: string;
  imageCrop?: string;
  imageFilter?: string;
  imageFit?: string;
  imageOpacity?: number;
  imageRadius?: number;
  flip?: { horizontal: boolean; vertical: boolean };
  // crop: non-destructive mask (0-1 fractions of original image)
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  // 边框元素属性
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: string;
  // 组合(group)样式
  groupBackgroundColor?: string;
  groupBorderColor?: string;
  groupBorderWidth?: number;
  groupBorderStyle?: string; // 'none' | 'solid' | 'dashed' | 'dotted'
  // 图标元素属性
  iconColor?: string;
  iconSize?: number;
  iconType?: string;
  // 形状元素属性
  shapeBackground?: string;
  shapeType?: string;
  // 元素动画
  animation?: {
    type: 'none' | 'fadeIn' | 'slideUp' | 'slideLeft' | 'scaleIn' | 'rotateIn' | 'bounceIn';
    duration: number;
    delay: number;
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  };
  // 元素触发器
  trigger?: {
    type: 'none' | 'load' | 'click' | 'hover';
    action: 'playAnimation' | 'show' | 'toggle';
  };
  // 状态
  locked: boolean;
  visible: boolean;
  selected?: boolean;
  opacity?: number;
}

export interface Page {
  id: string;
  name: string;
  backgroundColor: string;
  elements: EditorElement[];
  locked?: boolean;
  thumbnail?: string | null;
  transition?: 'none' | 'fade' | 'slide' | 'zoom' | 'flip';
}

export interface ElementToolbarPosition {
  left: number;
  top: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  elementId: string | null;
}

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// 辅助函数：生成唯一 ID
export function generateId(): string {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

// 辅助函数：创建默认元素（供 store 和组件共享）
export function createDefaultElement(
  type: 'text' | 'decoration' | 'image' | 'border' | 'icon',
  subType = '',
  x = 50,
  y = 50,
  zIndex = 1,
): EditorElement {
  const base = {
    id: generateId(),
    x,
    y,
    rotation: 0,
    zIndex,
    backgroundColor: 'transparent',
    backgroundOpacity: 1,
    locked: false,
    visible: true,
  };

  if (type === 'text') {
    const sizeMap: Record<string, { w: number; h: number; fs: number; text: string; bold: boolean }> = {
      title: { w: 200, h: 50, fs: 28, text: '婚礼标题', bold: true },
      subtitle: { w: 200, h: 40, fs: 20, text: '副标题文字', bold: false },
      couple: { w: 200, h: 40, fs: 18, text: '新郎 & 新娘', bold: true },
      date: { w: 200, h: 30, fs: 16, text: '2026年6月14日', bold: false },
      location: { w: 200, h: 30, fs: 16, text: '婚礼地点', bold: false },
    };
    const s = sizeMap[subType] || sizeMap.subtitle;
    return {
      ...base,
      type: 'text',
      subType,
      width: s.w,
      height: s.h,
      text: s.text,
      fontFamily: 'Microsoft YaHei',
      fontSize: s.fs,
      fontWeight: s.bold ? 'bold' : 'normal',
      textColor: '#333333',
      textAlign: 'center',
    };
  }

  if (type === 'decoration') {
    return {
      ...base,
      type: 'decoration',
      subType,
      width: 64,
      height: 64,
      decorationColor: '#ff6b6b',
      decorationSize: 32,
    };
  }

  if (type === 'image') {
    return {
      ...base,
      type: 'image',
      subType,
      width: 200,
      height: 200,
      imageUrl: '',
      imageCrop: 'none',
      imageFilter: 'original',
      flip: { horizontal: false, vertical: false },
    };
  }

  if (type === 'border') {
    return {
      ...base,
      type: 'border',
      subType,
      width: 300,
      height: 200,
      borderColor: '#4b5563',
      borderWidth: 2,
      borderRadius: subType === 'rounded' ? 12 : 0,
      borderStyle: 'solid',
    };
  }

  if (type === 'icon') {
    const iconColors: Record<string, string> = {
      map: '#ef4444',
      time: '#3b82f6',
      qr: '#111827',
      phone: '#10b981',
    };
    return {
      ...base,
      type: 'icon',
      subType,
      width: 64,
      height: 64,
      iconColor: iconColors[subType] || '#333333',
      iconSize: 32,
    };
  }

  // group
  return {
    ...base,
    type: 'group' as any,
    subType,
    width: 100,
    height: 100,
    children: [],
  };
}

// 辅助函数：获取元素类型中文名
export function getElementTypeName(type: string, subType?: string): string {
  if (type === 'text') {
    const map: Record<string, string> = {
      heading: '标题',
      subtitle: '副标题',
      body: '正文',
      small: '小字',
    };
    return map[subType || 'body'] || '文本';
  }
  if (type === 'decoration') {
    const map: Record<string, string> = {
      heart: '爱心',
      flower: '花朵',
      star: '星星',
      bell: '铃铛',
      music: '音符',
      ring: '戒指',
    };
    return map[subType || 'heart'] || '装饰';
  }
  if (type === 'image') {
    const map: Record<string, string> = {
      upload: '上传图片',
      music: '音乐图标',
      video: '视频图标',
    };
    return map[subType || ''] || '图片';
  }
  if (type === 'border') {
    const map: Record<string, string> = {
      rounded: '圆角边框',
    };
    return map[subType || ''] || '边框';
  }
  if (type === 'icon') {
    const map: Record<string, string> = {
      map: '地图图标',
      time: '时间图标',
      qr: '二维码',
      phone: '电话图标',
    };
    return map[subType || ''] || '图标';
  }
  if (type === 'group') {
    return '组合';
  }
  return type;
}
