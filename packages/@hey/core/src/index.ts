export const HEY_BRAND = {
  name: '19号广告大师',
  slogan: 'AI 设计器 + 广告物料制作 + H5 邀请函',
  primaryColor: '#c8ff00',
  darkColor: '#08090d',
} as const;

export type DesignElementKind = 'text' | 'image' | 'shape' | 'svg' | 'group' | 'generated-asset';

export interface DesignElementBase {
  id: string;
  kind: DesignElementKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  visible?: boolean;
}

export interface TextElement extends DesignElementBase {
  kind: 'text';
  text: string;
  fontSize: number;
  color: string;
}

export interface ImageElement extends DesignElementBase {
  kind: 'image';
  src: string;
  alt?: string;
}

export interface ShapeElement extends DesignElementBase {
  kind: 'shape';
  fill: string;
  radius?: number;
}

export interface SvgElement extends DesignElementBase {
  kind: 'svg';
  svg: string;
}

export interface GroupElement extends DesignElementBase {
  kind: 'group';
  children: DesignElement[];
}

export interface GeneratedAssetElement extends DesignElementBase {
  kind: 'generated-asset';
  src: string;
  generationPrompt?: string;
  sourceImageId?: string;
  maskId?: string;
  segmentationMeta?: unknown;
  vectorizationMeta?: unknown;
}

export type DesignElement = TextElement | ImageElement | ShapeElement | SvgElement | GroupElement | GeneratedAssetElement;

export interface DesignDocument {
  id: string;
  title: string;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
  createdAt?: string;
  updatedAt?: string;
}

export function createHeyId(prefix = 'hey'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
