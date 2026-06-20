import { post } from './request';

export interface PublishResult {
  url?: string;
  fileUrl?: string;
  message?: string;
}

// 发布为网页（H5 请柬）
export function publishWeb(payload: {
  pages: unknown[];
  name: string;
  canvasWidth?: number;
  canvasHeight?: number;
  pageTransition?: 'none' | 'fade' | 'slide' | 'zoom' | 'flip';
}) {
  return post<PublishResult>('/api/publish/web', payload);
}

// 生成长图
export function publishImage(payload: { pages: unknown[]; name: string }) {
  return post<PublishResult>('/api/publish/image', payload);
}

// 生成 PDF
export function publishPdf(payload: { pages: unknown[]; name: string }) {
  return post<PublishResult>('/api/publish/pdf', payload);
}

// 生成视频（动图请柬）
export function publishVideo(payload: { pages: unknown[]; name: string }) {
  return post<PublishResult>('/api/publish/video', payload);
}
