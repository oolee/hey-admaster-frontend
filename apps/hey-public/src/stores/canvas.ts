import type {
  CanvasEdge,
  CanvasNode,
  CanvasSnapshot,
  CanvasTransform,
  NodeStatus,
} from '@/types/canvas';

import { computed, ref } from 'vue';

import type { WorkflowDefinitionInput } from '@/api/agent';

import { aiExecute } from '@/api/engine';
import { runWorkflow } from '@/api/agent';
import {
  nodeMeta as _nodeMeta,
  canConnect,
  CANVAS_NODES,
} from '@/skills/canvas-nodes';
import { idbLoad, idbSave } from '@/utils/idb';
import { defineStore } from 'pinia';

export interface NodeTypeInfo {
  label: string;
  color: string;
  icon: string;
  w: number;
  h: number;
  inputs: number;
  outputs: number;
  params: Record<string, unknown>;
}

/* 保持向后兼容：老组件仍用 NODE_TYPES */
export const NODE_TYPES: Record<string, NodeTypeInfo> = {};
for (const n of CANVAS_NODES) {
  NODE_TYPES[n.id] = {
    label: n.label,
    color: n.color,
    icon: (n.icon as unknown as { _name?: string })?._name || '◆',
    w: n.w || 240,
    h: n.h || 140,
    inputs: n.inputs,
    outputs: n.outputs,
    params: { ...n.params },
  };
}

export const nodeMeta = _nodeMeta;

/* 6P 画册示例工作流（用新的 image-gen 节点） */
const TEMPLATE_12P = (): { edges: CanvasEdge[]; nodes: CanvasNode[] } => {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const promptId = `n-prompt-${Date.now()}`;
  nodes.push({
    id: promptId,
    type: 'prompt-optimize',
    x: 60,
    y: 80,
    label: '美化主提示词',
    status: 'idle',
    params: { model: 'deepseek-v3', style: '通用' },
  });
  const splitId = `n-split-${Date.now()}`;
  nodes.push({
    id: splitId,
    type: 'chat',
    x: 360,
    y: 80,
    label: 'AI 拆分 6 页提示词',
    status: 'idle',
    params: { model: 'deepseek-v3', system: '将整体描述拆分为 6 个独立提示词' },
  });
  edges.push({ id: `e-${Date.now()}-p`, from: promptId, to: splitId });
  const imgIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const id = `n-img-${Date.now()}-${i}`;
    nodes.push({
      id,
      type: 'image-gen',
      x: 680 + col * 300,
      y: 60 + row * 320,
      status: 'idle',
      label: `第 ${i + 1} 页`,
      params: {
        prompt: '',
        model: 'gpt-image-1',
        size: '1024x1536',
        quality: 'high',
        n: 1,
      },
    });
    imgIds.push(id);
  }
  imgIds.forEach((id, i) =>
    edges.push({ id: `e-${Date.now()}-${i}`, from: splitId, to: id }),
  );
  const albumId = `n-album-${Date.now()}`;
  nodes.push({
    id: albumId,
    type: 'album-flip',
    x: 1100,
    y: 380,
    label: '画册翻页',
    status: 'idle',
    params: { flip: '横向', pages: 6, effect: '3D 翻页' },
  });
  imgIds.forEach((id) =>
    edges.push({ id: `e-merge-${id}`, from: id, to: albumId }),
  );
  const shareId = `n-share-${Date.now()}`;
  nodes.push({
    id: shareId,
    type: 'share',
    x: 1400,
    y: 380,
    label: '客户预览链接',
    status: 'idle',
    params: { expireDays: 30 },
  });
  edges.push({ id: 'e-share', from: albumId, to: shareId });
  return { nodes, edges };
};

export const useCanvasStore = defineStore('canvas', () => {
  const nodes = ref<CanvasNode[]>([]);
  const edges = ref<CanvasEdge[]>([]);
  const selectedId = ref<null | string>(null);
  const transform = ref<CanvasTransform>({ x: 0, y: 0, scale: 1 });
  const running = ref(false);
  const runProgress = ref('');
  const saveState = ref<'error' | 'idle' | 'saved' | 'saving'>('idle');
  const projectName = ref('未命名项目');
  const storageMode = ref('local');

  const selected = computed(
    () => nodes.value.find((n) => n.id === selectedId.value) || null,
  );
  const nodeCount = computed(() => nodes.value.length);
  const doneCount = computed(
    () => nodes.value.filter((n) => n.status === 'done').length,
  );

  function addNode(type: string, x?: number, y?: number): null | string {
    const meta = _nodeMeta(type);
    if (!meta) return null;
    const id = `n-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    nodes.value.push({
      id,
      type,
      x: x ?? 200,
      y: y ?? 200,
      label: meta.label,
      status: 'idle',
      params: { ...meta.params },
    });
    selectedId.value = id;
    return id;
  }

  function moveNode(id: string, x: number, y: number): void {
    const n = nodes.value.find((v) => v.id === id);
    if (n) {
      n.x = x;
      n.y = y;
    }
  }

  function removeNode(id: string): void {
    nodes.value = nodes.value.filter((n) => n.id !== id);
    edges.value = edges.value.filter((e) => e.from !== id && e.to !== id);
    if (selectedId.value === id) selectedId.value = null;
  }

  function copyNode(id: string): null | string {
    const src = nodes.value.find((n) => n.id === id);
    if (!src) return null;
    const newId = `n-${src.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    nodes.value.push({
      ...(JSON.parse(JSON.stringify(src)) as CanvasNode),
      id: newId,
      x: src.x + 40,
      y: src.y + 40,
      label: `${src.label}（副本）`,
      status: 'idle',
      result: undefined,
    });
    selectedId.value = newId;
    return newId;
  }

  function selectNode(id: null | string): void {
    selectedId.value = id;
  }
  function updateNodeParams(
    id: null | string,
    patch: Record<string, unknown>,
  ): void {
    const n = nodes.value.find((v) => v.id === id);
    if (n) n.params = { ...n.params, ...patch };
  }
  function updateNodeLabel(id: string, label: string): void {
    const n = nodes.value.find((v) => v.id === id);
    if (n) n.label = label;
  }
  function setNodeStatus(id: string, status: NodeStatus): void {
    const n = nodes.value.find((v) => v.id === id);
    if (n) n.status = status;
  }

  function addEdge(from: string, to: string): boolean {
    if (!from || !to || from === to) return false;
    if (edges.value.some((e) => e.from === from && e.to === to)) return false;
    const fromNode = nodes.value.find((n) => n.id === from);
    const toNode = nodes.value.find((n) => n.id === to);
    if (!canConnect(fromNode, toNode)) return false;
    edges.value.push({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from,
      to,
    });
    return true;
  }
  function canConnectNodes(fromId: string, toId: string): boolean {
    return canConnect(
      nodes.value.find((n) => n.id === fromId),
      nodes.value.find((n) => n.id === toId),
    );
  }
  function removeEdge(id: string): void {
    edges.value = edges.value.filter((e) => e.id !== id);
  }
  function setTransform(t: Partial<CanvasTransform>): void {
    transform.value = { ...transform.value, ...t };
  }

  function loadTemplate12P(): void {
    const tpl = TEMPLATE_12P();
    nodes.value = tpl.nodes;
    edges.value = tpl.edges;
    selectedId.value = null;
    transform.value = { x: -80, y: 0, scale: 0.8 };
    saveState.value = 'idle';
  }

  function clear(): void {
    nodes.value = [];
    edges.value = [];
    selectedId.value = null;
    transform.value = { x: 0, y: 0, scale: 1 };
    running.value = false;
    saveState.value = 'idle';
  }

  function applySnapshot(snap: CanvasSnapshot | null): void {
    if (!snap) return;
    nodes.value = (snap.nodes || []).filter((n) => _nodeMeta(n.type)); // 过滤掉已被删除的节点类型
    edges.value = snap.edges || [];
    transform.value = snap.transform || { x: 0, y: 0, scale: 1 };
  }

  function snapshot(): CanvasSnapshot {
    return {
      nodes: JSON.parse(JSON.stringify(nodes.value)) as CanvasNode[],
      edges: JSON.parse(JSON.stringify(edges.value)) as CanvasEdge[],
      transform: { ...transform.value },
    };
  }

  /** 画布节点类型 → 能力 ID（后端注册表；未映射的类型暂跳过，后续能力化后补充） */
  const NODE_TO_CAPABILITY: Record<string, string> = {
    'image-gen': 'image-gen.v1',
    'image-gen-mode': 'image-gen.v1',
    'image-edit': 'image-edit.v1',
    chat: 'chat.v1',
    'prompt-optimize': 'chat.v1',
    'reverse-prompt': 'chat.v1',
  };

  const SAVE_KEY = 'draft-main';
  async function saveToDB(): Promise<boolean> {
    saveState.value = 'saving';
    // 本地 IndexedDB（离线兜底）
    const ok = await idbSave(SAVE_KEY, snapshot());
    saveState.value = ok ? 'saved' : 'error';
    return ok;
  }

  async function loadFromDB(): Promise<boolean> {
    const data = await idbLoad<CanvasSnapshot>(SAVE_KEY);
    if (data) applySnapshot(data);
    return !!data;
  }

  /* ===== 工作流运行（真实调用 mock API）===== */
  function topoOrder(): string[] {
    const indeg: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    nodes.value.forEach((n) => {
      indeg[n.id] = 0;
      adj[n.id] = [];
    });
    edges.value.forEach((e) => {
      const fromAdj = adj[e.from];
      const toIndeg = indeg[e.to];
      if (fromAdj && toIndeg !== undefined) {
        fromAdj.push(e.to);
        indeg[e.to] = toIndeg + 1;
      }
    });
    const queue = nodes.value.filter((n) => indeg[n.id] === 0).map((n) => n.id);
    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) continue;
      order.push(id);
      (adj[id] || []).forEach((to) => {
        const cur = indeg[to];
        if (cur !== undefined) {
          indeg[to] = cur - 1;
          if (indeg[to] === 0) queue.push(to);
        }
      });
    }
    return order.filter((id) => nodeExists(id));
  }
  function nodeExists(id: string): boolean {
    return nodes.value.some((n) => n.id === id);
  }

  /** 画布 → 后端工作流定义（§10 阶段 2 DAG：节点 + 依赖边） */
  function toWorkflowDefinition(): WorkflowDefinitionInput {
    const def: WorkflowDefinitionInput = {
      id: `canvas-${Date.now()}`,
      displayName: '画布工作流',
      nodes: nodes.value
        .filter((n) => NODE_TO_CAPABILITY[n.type])
        .map((n) => ({
          id: n.id,
          kind: 'capability',
          capabilityId: NODE_TO_CAPABILITY[n.type],
          params: { ...n.params },
        })),
    };
    for (const node of def.nodes) {
      node.dependsOn = edges.value
        .filter((e) => e.to === node.id)
        .map((e) => e.from);
    }
    return def;
  }

  /** 后端 CanonicalResult → 画布节点 result */
  function applyRunContext(context: Record<string, unknown> | undefined): void {
    if (!context) return;
    for (const node of nodes.value) {
      const ctx = context[`node:${node.id}`] as
        | undefined
        | { artifacts?: Array<{ kind: number; uri: string; text?: string }> };
      const artifacts = ctx?.artifacts;
      if (!artifacts?.length) continue;
      const image = artifacts.find((a) => a.kind === 1);
      const text = artifacts.find((a) => a.kind === 0);
      if (image) {
        node.result = { url: image.uri, images: [{ url: image.uri }] } as never;
      } else if (text?.text) {
        node.result = { text: text.text } as never;
      }
    }
  }

  async function runFlow(): Promise<void> {
    if (running.value) return;
    if (nodes.value.length === 0) return;
    running.value = true;
    try {
      const definition = toWorkflowDefinition();
      if (definition.nodes.length === 0) {
        runProgress.value = '没有可映射到后端能力的节点';
        return;
      }
      nodes.value.forEach((n) => setNodeStatus(n.id, 'running'));
      runProgress.value = '提交到 Agent Runtime…';
      const result = await runWorkflow({
        definition,
        prompt: '画布工作流',
        idempotencyKey: `canvas-${Date.now()}`,
      });
      applyRunContext(result.context);
      const done = result.status === 3; // Succeeded
      nodes.value.forEach((n) => setNodeStatus(n.id, done ? 'done' : 'error'));
      runProgress.value = done
        ? '运行完成 ✓'
        : result.status === 2
          ? `已在 checkpoint 暂停（令牌 ${result.checkpointToken?.slice(0, 8)}…）`
          : `工作流状态：${result.status}`;
    } catch (error) {
      runProgress.value = `运行出错：${error instanceof Error ? error.message : String(error)}`;
      nodes.value.forEach((n) => {
        if (n.status === 'running') n.status = 'error';
      });
    } finally {
      running.value = false;
    }
  }

  async function runSingleNode(id: string): Promise<void> {
    const node = nodes.value.find((n) => n.id === id);
    if (!node) return;
    setNodeStatus(id, 'running');
    runProgress.value = `运行：${node.label}`;
    try {
      node.result = await aiExecute(node);
      setNodeStatus(id, 'done');
    } catch (error) {
      setNodeStatus(id, 'error');
      runProgress.value = `出错：${node.label} · ${error instanceof Error ? error.message : String(error)}`;
      throw error;
    }
  }

  function resetStatus(): void {
    nodes.value.forEach((n) => {
      n.status = 'idle';
      n.result = undefined;
    });
  }

  function relatedEdges(id: string): string[] {
    return edges.value
      .filter((e) => e.from === id || e.to === id)
      .map((e) => e.id);
  }

  return {
    nodes,
    edges,
    selectedId,
    transform,
    selected,
    nodeCount,
    doneCount,
    running,
    runProgress,
    saveState,
    projectName,
    storageMode,
    addNode,
    moveNode,
    removeNode,
    copyNode,
    selectNode,
    updateNodeParams,
    updateNodeLabel,
    setNodeStatus,
    addEdge,
    canConnectNodes,
    removeEdge,
    setTransform,
    loadTemplate12P,
    clear,
    saveToDB,
    loadFromDB,
    snapshot,
    applySnapshot,
    runFlow,
    runSingleNode,
    resetStatus,
    topoOrder,
    relatedEdges,
  };
});
