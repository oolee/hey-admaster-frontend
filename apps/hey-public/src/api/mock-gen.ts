/* =====================================================
   Mock 生成 API（演示模式）
   - image 节点 → 从 /asset/mock-cover-{1-6}.svg 随机取一张
   - video 节点 → /asset/mock-video.svg
   - text 节点 → 生成演示文本
   - any / 无 produces → 通用占位
   ===================================================== */
import type { CanvasNode, NodeResult } from '@/types/canvas';

const MOCK_IMAGES = [1, 2, 3, 4, 5, 6];

/* 各节点类型的"虚拟耗时"，模拟真实 LLM 等待 */
const RUNTIME_MS: Record<string, number> = {
  'image-gen': 1400,
  'image-gen-mode': 1800,
  'video-gen': 2400,
  'upscale-8k': 1100,
  'ai-cutout': 900,
  'color-adjust': 700,
  'image-transform': 500,
  'long-image': 800,
  'album-flip': 1000,
  'image-compare': 600,
  'vector-free': 900,
  'vector-trace': 700,
  'prompt-optimize': 900,
  chat: 1100,
  'reverse-prompt': 1200,
  share: 400,
  'text-input': 50,
  'image-input': 80,
  'doc-import': 500,
  'text-note': 100,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickIndex(seed: number): number {
  return ((seed || Date.now()) % MOCK_IMAGES.length) + 1;
}

export async function mockGenerate(node: CanvasNode): Promise<NodeResult> {
  const t = RUNTIME_MS[node.type] || 500;
  await sleep(t);
  const seed = Math.floor(Math.random() * 100_000);

  // 输出类型识别：image-gen/video-gen/...
  if (
    node.type === 'image-gen' ||
    node.type === 'image-gen-mode' ||
    node.type === 'upscale-8k' ||
    node.type === 'ai-cutout' ||
    node.type === 'color-adjust' ||
    node.type === 'image-transform' ||
    node.type === 'long-image' ||
    node.type === 'image-compare' ||
    node.type === 'vector-free' ||
    node.type === 'vector-trace'
  ) {
    return {
      type: 'image',
      url: `/asset/mock-cover-${pickIndex(seed)}.svg`,
      sourceType: node.type,
      seed,
      ms: t,
    };
  }
  if (node.type === 'video-gen') {
    return {
      type: 'video',
      url: '/asset/mock-video.svg',
      sourceType: node.type,
      seed,
      ms: t,
    };
  }
  if (node.type === 'album-flip') {
    // 画册组装时收集前 6 张图作为内页
    const pages = [];
    for (let i = 0; i < 6; i++)
      pages.push(`/asset/mock-cover-${pickIndex(seed + i)}.svg`);
    return { type: 'album', pages, sourceType: node.type, seed, ms: t };
  }
  if (node.type === 'share') {
    const shareId = Math.random().toString(36).slice(2, 10);
    return {
      type: 'share',
      shareId,
      url: `/preview/${shareId}`,
      sourceType: node.type,
      seed,
      ms: t,
    };
  }
  if (node.type === 'chat' || node.type === 'prompt-optimize') {
    return {
      type: 'text',
      text: `【${node.label}】模型 ${String(node.params.model || 'auto')} 已生成回答：方案包含 6 张画册页面，整体色彩采用日落橙到星空深蓝的渐变。`,
      sourceType: node.type,
      seed,
      ms: t,
    };
  }
  if (node.type === 'reverse-prompt') {
    return {
      type: 'text',
      text: 'a cinematic travel album cover, golden hour, misty lake, traditional boats',
      sourceType: node.type,
      seed,
      ms: t,
    };
  }
  // 默认占位
  return {
    type: 'image',
    url: `/asset/mock-cover-${pickIndex(seed)}.svg`,
    sourceType: node.type,
    seed,
    ms: t,
  };
}
