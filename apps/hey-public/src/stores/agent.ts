import type { CapabilityManifest, ModelBridgeManifest } from '@/api/agent';
import type { SkillInfo } from '@/skills/registry';

import { computed, ref } from 'vue';

import { fetchCapabilities, fetchModelBridges } from '@/api/agent';
import { defineStore } from 'pinia';

import { SKILLS, skillFromCapability } from '@/skills/registry';

/**
 * Agent 目录 store（对齐 AI-AGENT-DESIGN-v1.md §2 注册表）：
 * 能力 / 模型桥从后端注册表拉取（元数据驱动，零硬编码），后端不可用时保留本地兜底。
 */
export const useAgentStore = defineStore('agent', () => {
  const capabilities = ref<CapabilityManifest[]>([]);
  const modelBridges = ref<ModelBridgeManifest[]>([]);
  const loaded = ref(false);

  async function refresh(): Promise<void> {
    try {
      const [caps, bridges] = await Promise.all([
        fetchCapabilities(),
        fetchModelBridges(),
      ]);
      capabilities.value = caps.items ?? [];
      modelBridges.value = bridges.items ?? [];
      loaded.value = true;
    } catch {
      // 后端不可用/未登录：保留本地兜底清单，不抛
    }
  }

  /**
   * 技能清单（元数据驱动）：后端返回了能力就用后端清单映射，
   * 否则回退到本地兜底 SKILLS（离线/演示）。颜色由 Modality 派生（能力光谱）。
   */
  const skills = computed<SkillInfo[]>(() =>
    capabilities.value.length > 0
      ? capabilities.value.map(skillFromCapability)
      : SKILLS,
  );

  /** capabilityId → manifest */
  const capabilityById = computed(() => {
    const map = new Map<string, CapabilityManifest>();
    for (const c of capabilities.value) map.set(c.id, c);
    return map;
  });

  /** capabilityId → 可用模型桥列表（§8 auto 第 1 步过滤用） */
  const bridgesByCapability = computed(() => {
    const map = new Map<string, ModelBridgeManifest[]>();
    for (const b of modelBridges.value) {
      for (const cid of b.capabilityIds ?? []) {
        const list = map.get(cid) ?? [];
        list.push(b);
        map.set(cid, list);
      }
    }
    return map;
  });

  return {
    capabilities,
    modelBridges,
    skills,
    loaded,
    refresh,
    capabilityById,
    bridgesByCapability,
  };
});
