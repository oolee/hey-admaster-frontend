import type { Component } from 'vue';

import {
  Brush,
  HelpCircle,
  ImagePlus,
  LayoutTemplate,
  MessageCircle,
  Mic,
  Presentation,
  Video,
} from 'lucide-vue-next';

import type { CapabilityManifest, CapabilityModality } from '@/api/agent';
import { CapabilityModality as M } from '@/api/agent';

export type SkillId = string;

export interface SkillColor {
  hue: string;
  light: string;
}

export interface SkillInfo {
  id: SkillId;
  name: string;
  slash: string;
  icon: Component;
  desc: string;
  example: string;
  modality: CapabilityModality;
  color: SkillColor;
  experimental?: boolean;
}

/* =====================================================
   能力光谱（设计文档 §8 签名元素）：颜色按 Modality 派生，
   而非每个技能写死一色。文本=中性灰蓝 / 图像=珊瑚橘 / 音频=青 / 视频=靛紫。
   ===================================================== */
export const MODALITY_COLORS: Record<CapabilityModality, SkillColor> = {
  [M.Text]: { hue: '#6c7a89', light: 'rgba(108,122,137,0.14)' },
  [M.Image]: { hue: '#ff6b35', light: 'rgba(255,107,53,0.16)' },
  [M.Audio]: { hue: '#14b8a6', light: 'rgba(20,184,166,0.16)' },
  [M.Video]: { hue: '#7c5cff', light: 'rgba(124,92,255,0.16)' },
};

const MODALITY_ICONS: Record<CapabilityModality, Component> = {
  [M.Text]: MessageCircle,
  [M.Image]: ImagePlus,
  [M.Audio]: Mic,
  [M.Video]: Video,
};

function colorOf(modality: CapabilityModality): SkillColor {
  return MODALITY_COLORS[modality] ?? MODALITY_COLORS[M.Text];
}

function makeSkill(s: Omit<SkillInfo, 'color'>): SkillInfo {
  return { ...s, color: colorOf(s.modality) };
}

/* =====================================================
   本地兜底技能清单：仅在后端注册表不可用时使用（离线/演示）。
   image-gen / image-edit 已落成真能力（后端注册表），从兜底删除（§8 收尾）；
   ppt / web / canvas 尚未落成真能力，保留兜底。
   ===================================================== */
export const SKILLS: SkillInfo[] = [
  makeSkill({
    id: 'chat',
    name: '聊天',
    slash: '/chat',
    icon: MessageCircle,
    desc: '日常对话与创意头脑风暴',
    example: '帮我写一段春节营销文案',
    modality: M.Text,
  }),
  makeSkill({
    id: 'qa',
    name: '问答',
    slash: '/ask',
    icon: HelpCircle,
    desc: '专业知识问答与解释',
    example: '解释一下差异化和定位的区别',
    modality: M.Text,
  }),
  makeSkill({
    id: 'ppt',
    name: 'HTML 动效 PPT',
    slash: '/ppt',
    icon: Presentation,
    desc: '一句话生成可演示幻灯片',
    example: '生成 5 页《2026 营销趋势》PPT',
    modality: M.Text,
  }),
  makeSkill({
    id: 'web',
    name: '网页制作',
    slash: '/web',
    icon: LayoutTemplate,
    desc: '生成单页网页（HTML+CSS）',
    example: '做一个奶茶店单页网页',
    modality: M.Text,
  }),
  makeSkill({
    id: 'canvas',
    name: '无限画布',
    slash: '/canvas',
    icon: Brush,
    desc: '节点工作流：多图/画册批量生成',
    example: '在无限画布上设计门头造型',
    modality: M.Image,
    experimental: true,
  }),
];

/* =====================================================
   后端 CapabilityManifest → SkillInfo（元数据驱动，零硬编码）。
   颜色由 Modality 派生，图标由 Modality 派生，说明/示例/斜杠命令来自清单。
   ===================================================== */
export function skillFromCapability(manifest: CapabilityManifest): SkillInfo {
  return {
    id: manifest.id,
    name: manifest.displayName,
    slash: manifest.slashCommand || `/${manifest.id.split('.')[0]}`,
    icon: MODALITY_ICONS[manifest.modality] ?? MessageCircle,
    desc: manifest.description || manifest.displayName,
    example: manifest.usageExample || '',
    modality: manifest.modality,
    color: colorOf(manifest.modality),
  };
}
