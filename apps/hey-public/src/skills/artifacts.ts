import type {
  ArtifactActionDeclaration,
  CapabilityManifest,
} from '@/api/agent';

/* =====================================================
   产物注册表（§19 产物操作与插件安全 · 档一 MVP）
   - 数据看产物（kind），能力看插件（声明）
   - artifactViewers：按产物类型分发渲染组件（未注册 → 兜底 viewer）
   - artifactActions：插件声明操作 + 内核通用操作（下载/复制链接），按 order 排序
   ===================================================== */
import type { Component } from 'vue';

import CodeArtifactViewer from '@/components/workspace/artifacts/CodeArtifactViewer.vue';
import FallbackArtifactViewer from '@/components/workspace/artifacts/FallbackArtifactViewer.vue';
import ImageArtifactViewer from '@/components/workspace/artifacts/ImageArtifactViewer.vue';
import PptArtifactViewer from '@/components/workspace/artifacts/PptArtifactViewer.vue';
import TextArtifactViewer from '@/components/workspace/artifacts/TextArtifactViewer.vue';
import WebArtifactViewer from '@/components/workspace/artifacts/WebArtifactViewer.vue';

/** 产物类型（字符串形态，与消息 artifact.type 对齐） */
export type ArtifactType =
  | 'audio'
  | 'code'
  | 'file'
  | 'image'
  | 'ppt'
  | 'text'
  | 'video'
  | 'web';

/** 后端 kind 数值（AgentArtifactKind：Text=0/Image=1/Video=2/Audio=3/File=4）→ 字符串类型 */
export const KIND_TO_TYPE: Record<number, ArtifactType> = {
  0: 'text',
  1: 'image',
  2: 'video',
  3: 'audio',
  4: 'file',
};

/** 操作定义（前端可执行形态） */
export interface ArtifactActionDef {
  id: string;
  label: string;
  icon: string;
  target: 'capability' | 'client' | 'generic';
  capabilityId?: string;
  needsResourceRef?: boolean;
  order: number;
}

/** 后端 target 数值（ArtifactActionTarget：Generic=0/Client=1/Capability=2）→ 字符串 */
const TARGET_TO_STR = { 0: 'generic', 1: 'client', 2: 'capability' } as const;

/** 内核通用操作（任何产物可用，零注册） */
const GENERIC_ACTIONS: ArtifactActionDef[] = [
  {
    id: 'download',
    label: '下载',
    icon: 'download',
    target: 'generic',
    order: 90,
  },
  {
    id: 'copy-link',
    label: '复制链接',
    icon: 'link',
    target: 'generic',
    order: 95,
  },
];

/** 产物渲染器（未注册类型 → 兜底 viewer） */
export const artifactViewers: Record<ArtifactType, Component> = {
  text: TextArtifactViewer,
  image: ImageArtifactViewer,
  ppt: PptArtifactViewer,
  web: WebArtifactViewer,
  code: CodeArtifactViewer,
  video: FallbackArtifactViewer,
  audio: FallbackArtifactViewer,
  file: FallbackArtifactViewer,
};

/** 兜底 viewer（注册表没有的类型也能展示，不会看不见） */
export const fallbackViewer = FallbackArtifactViewer;

/** 把后端声明（数值 kind）转成前端操作定义 */
function toActionDef(a: ArtifactActionDeclaration): ArtifactActionDef {
  return {
    id: a.id,
    label: a.label,
    icon: a.icon,
    target: TARGET_TO_STR[Number(a.target) as 0 | 1 | 2] ?? 'client',
    capabilityId: a.capabilityId ?? undefined,
    needsResourceRef: a.needsResourceRef,
    order: a.order,
  };
}

/**
 * 解析某产物类型的操作清单：
 * 插件声明（按 kind 匹配，映射到类型）+ 内核通用操作；按 order 排序；插件 id 去重优先。
 */
export function resolveArtifactActions(
  type: string,
  capabilities: CapabilityManifest[] = [],
): ArtifactActionDef[] {
  const declared: ArtifactActionDef[] = [];
  for (const cap of capabilities) {
    for (const a of cap.artifactActions ?? []) {
      const declType = KIND_TO_TYPE[Number(a.kind)];
      if (!declType || declType !== type) continue;
      const def = toActionDef(a);
      if (!declared.some((d) => d.id === def.id && d.target === def.target)) {
        declared.push(def);
      }
    }
  }

  const seen = new Set(declared.map((d) => d.id));
  const merged = [
    ...declared,
    ...GENERIC_ACTIONS.filter((g) => !seen.has(g.id)),
  ];
  return merged.toSorted((a, b) => a.order - b.order);
}
