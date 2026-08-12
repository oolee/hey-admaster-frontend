/* =====================================================
   画布 / AI 执行共享类型
   ===================================================== */

export type NodeStatus = 'done' | 'error' | 'idle' | 'running';

export interface CanvasNode {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  status: NodeStatus;
  params: Record<string, unknown>;
  result?: NodeResult | null;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasSnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  transform: CanvasTransform;
}

export interface QuoteRow {
  item: string;
  spec: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface MaterialItem {
  name: string;
  spec: string;
  qty: number;
  unit: string;
}

export type NodeResult =
  | { cost?: string; format: string; ms?: number; type: 'export' }
  | {
      cost?: string;
      items: MaterialItem[];
      ms?: number;
      template: string;
      type: 'material';
    }
  | {
      cost?: string;
      mock?: boolean;
      ms?: number;
      seed?: number;
      sourceType?: string;
      text: string;
      type: 'text';
    }
  | {
      cost?: string;
      mock?: boolean;
      ms?: number;
      seed?: number;
      sourceType?: string;
      type: 'image';
      url: string;
    }
  | {
      cost?: string;
      ms?: number;
      pages: string[];
      seed?: number;
      sourceType?: string;
      type: 'album';
    }
  | {
      cost?: string;
      ms?: number;
      rows: QuoteRow[];
      subtotal: number;
      total: number;
      type: 'quote';
    }
  | {
      cost?: string;
      ms?: number;
      seed?: number;
      shareId: string;
      sourceType?: string;
      type: 'share';
      url: string;
    }
  | {
      cost?: string;
      ms?: number;
      seed?: number;
      sourceType?: string;
      type: 'video';
      url: string;
    };

/* API 统一响应包裹：{ code, data, message } */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}
