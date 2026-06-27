export const SITE_NAME = 'Hey 19';
export const SITE_DESCRIPTION =
  'AI驱动的广告创意公司，用人工智能重新定义品牌视觉';

export const MAX_FREE_GENERATIONS = 3;

export const IMAGE_SIZE_PRESETS = [
  { label: '方形 1:1', value: '1024x1024' },
  { label: '竖版 2:3', value: '1024x1536' },
  { label: '横版 3:2', value: '1536x1024' },
  { label: '宽屏 16:9', value: '2048x1152' },
] as const;

export const QUALITY_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
] as const;

export const SERVICE_CATEGORIES = [
  { id: 'brand', label: '品牌策略', count: 12 },
  { id: 'ai-design', label: 'AI创意设计', count: 28 },
  { id: 'video', label: '视频制作', count: 15 },
  { id: 'digital', label: '数字营销', count: 20 },
] as const;
