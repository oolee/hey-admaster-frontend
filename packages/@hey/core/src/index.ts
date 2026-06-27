export const HEY_BRAND = {
  name: '19号广告大师',
  slogan: 'AI 设计器 + 广告物料制作 + H5 邀请函',
  primaryColor: '#c8ff00',
  darkColor: '#08090d',
} as const;

export type DesignElementKind =
  | 'generated-asset'
  | 'group'
  | 'image'
  | 'shape'
  | 'svg'
  | 'text';

export interface DesignElementBase {
  height: number;
  id: string;
  kind: DesignElementKind;
  locked?: boolean;
  name: string;
  rotation?: number;
  visible?: boolean;
  width: number;
  x: number;
  y: number;
}

export interface TextElement extends DesignElementBase {
  color: string;
  fontSize: number;
  kind: 'text';
  text: string;
}

export interface ImageElement extends DesignElementBase {
  alt?: string;
  kind: 'image';
  src: string;
}

export interface ShapeElement extends DesignElementBase {
  fill: string;
  kind: 'shape';
  radius?: number;
}

export interface SvgElement extends DesignElementBase {
  kind: 'svg';
  svg: string;
}

export interface GroupElement extends DesignElementBase {
  children: DesignElement[];
  kind: 'group';
}

export interface GeneratedAssetElement extends DesignElementBase {
  generationPrompt?: string;
  kind: 'generated-asset';
  maskId?: string;
  segmentationMeta?: unknown;
  sourceImageId?: string;
  src: string;
  vectorizationMeta?: unknown;
}

export type DesignElement =
  | GeneratedAssetElement
  | GroupElement
  | ImageElement
  | ShapeElement
  | SvgElement
  | TextElement;

export interface DesignDocument {
  background: string;
  createdAt?: string;
  elements: DesignElement[];
  height: number;
  id: string;
  title: string;
  updatedAt?: string;
  width: number;
}

export function createHeyId(prefix = 'hey'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
