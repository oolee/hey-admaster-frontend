interface PublishRecord {
  id: string;
  name: string;
  pages: unknown[];
  canvasWidth?: number;
  canvasHeight?: number;
  pageTransition?: 'none' | 'fade' | 'slide' | 'zoom' | 'flip';
  createdAt: string;
}

const publishStore = new Map<string, PublishRecord>();

/** 生成 8 位短 ID：62^8 ≈ 218 万亿组合 */
function generateShortId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * 62)];
  }
  // 确保唯一
  while (publishStore.has(result)) {
    result = '';
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(Math.random() * 62)];
    }
  }
  return result;
}

export function savePublish(data: {
  id?: string;
  name: string;
  pages: unknown[];
  canvasWidth?: number;
  canvasHeight?: number;
  pageTransition?: 'none' | 'fade' | 'slide' | 'zoom' | 'flip';
}): PublishRecord {
  const now = new Date().toISOString();
  const id = data.id || generateShortId();
  const record: PublishRecord = {
    id,
    name: data.name || '未命名请柬',
    pages: data.pages || [],
    canvasWidth: data.canvasWidth,
    canvasHeight: data.canvasHeight,
    pageTransition: data.pageTransition,
    createdAt: now,
  };
  publishStore.set(id, record);
  return record;
}

export function getPublish(id: string): PublishRecord | undefined {
  return publishStore.get(id);
}
