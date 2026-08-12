/* =====================================================
   AI 执行引擎（前端统一入口）
   - 所有节点执行都走这里，经 7188 真实后端调用大模型（/api/llm，路径不带 v2）
   - 网关未配置密钥时自动回退 mock（演示模式）
   - 按节点类型路由：文本 → /api/llm/chat；图像 → /api/llm/image
   ===================================================== */
import type { CanvasNode, NodeResult } from '@/types/canvas';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface LlmTextParams {
  model?: string;
  text?: string;
  system?: string;
  temperature?: number;
}

interface LlmImageParams {
  model?: string;
  prompt?: string;
  size?: string;
  quality?: string;
  n?: number;
  refImage?: string;
  preset?: string;
  extra?: string;
}

interface ReqFormParams {
  customer?: string;
  projectType?: string;
  size?: string;
  material?: string;
  budget?: string;
  deadline?: string;
  note?: string;
}

interface QuoteParams {
  width?: number;
  height?: number;
  unit?: string;
  material?: string;
  processPrice?: number;
  quantity?: number;
  labor?: number;
  profit?: number;
}

interface MaterialParams {
  template?: string;
}

interface ExportParams {
  format?: string;
}

interface LlmTextResponse {
  ok: boolean;
  text?: string;
  error?: string;
  mock?: boolean;
  cost?: number;
}

interface LlmImageResponse {
  ok: boolean;
  images?: Array<{ seed?: number; url: string }>;
  error?: string;
  mock?: boolean;
  cost?: number;
}

/* 单次请求带超时 */
async function postJSON<T>(
  url: string,
  data: unknown,
  timeoutMs = 120_000,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`网关 ${resp.status}`);
    return (await resp.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* 文本类节点：需求提炼 / 文案生成 / 提示词优化 / 智能对话 / 反推提示词 */
async function callText(node: CanvasNode): Promise<NodeResult> {
  const p = node.params as LlmTextParams;
  const prevText = node.result?.type === 'text' ? node.result.text : '';
  const prompts: Record<string, { prompt: string; system: string }> = {
    'prompt-optimize': {
      system:
        '你是资深广告设计师。把用户模糊的设计需求改写成专业、具体、可执行的生图提示词，输出中文。',
      prompt: `请优化以下提示词：\n${p.text || prevText}`,
    },
    chat: {
      system: '你是广告设计工作流助手。',
      prompt: `${String(p.system || '')}\n${String(p.text || '')}`,
    },
    'reverse-prompt': {
      system: '你是资深设计师。根据用户提供的图片描述反推画面提示词。',
      prompt: `反推这张图的设计提示词：${p.text || ''}`,
    },
  };
  const cfg = prompts[node.type] ??
    prompts.chat ?? {
      system: '你是广告设计工作流助手。',
      prompt: `${String(p.system || '')}\n${String(p.text || '')}`,
    };
  const res = await postJSON<LlmTextResponse>('/api/llm/chat', {
    model: p.model || 'deepseek-v3',
    prompt: cfg.prompt,
    system: cfg.system,
    temperature: p.temperature ?? 0.7,
  });
  if (!res.ok) throw new Error(res.error || '文本生成失败');
  return {
    type: 'text',
    text: res.text || '',
    mock: !!res.mock,
    ms: 900 + Math.round(Math.random() * 800),
    cost: res.cost?.toFixed(2) ?? '0',
  };
}

/* 图像类节点：图片生成 / 模式生图 / 实景合成 / 图像处理类产物 */
async function callImage(node: CanvasNode): Promise<NodeResult> {
  const p = node.params as LlmImageParams;
  const prompt =
    p.prompt ||
    (node.result?.type === 'text' ? node.result.text : '') ||
    (node.type === 'image-gen-mode'
      ? `按预设「${p.preset || '通用'}」生成商业设计效果图，${p.extra || ''}`
      : `商业设计效果图，${node.label}，风格统一，高清`);

  const res = await postJSON<LlmImageResponse>(
    '/api/llm/image',
    {
      model: p.model || 'gpt-image-2',
      prompt,
      size: p.size ?? '1024x1024',
      quality: p.quality || 'high',
      n: p.n || 1,
      refImage: p.refImage || undefined, // 实景合成：上传的门头实拍 base64
    },
    180_000,
  );
  if (!res.ok) throw new Error(res.error || '图片生成失败');

  const img = res.images?.[0] || { url: '' };
  return {
    type: 'image',
    url: img.url,
    seed: img.seed || Math.floor(Math.random() * 100_000),
    mock: !!res.mock,
    ms: 1500 + Math.round(Math.random() * 1500),
    cost: res.cost?.toFixed(2) ?? '0',
  };
}

/* 统一执行入口：按节点 produces 类型路由 */
export async function aiExecute(node: CanvasNode): Promise<NodeResult> {
  const visual = [
    'image-gen',
    'image-gen-mode',
    'upscale-8k',
    'ai-cutout',
    'color-adjust',
    'image-transform',
    'long-image',
    'album-flip',
    'image-compare',
    'vector-free',
    'vector-trace',
  ];
  const isVisual = visual.includes(node.type);

  if (isVisual) return await callImage(node);

  // 其余文本类 / 输出类
  if (node.type === 'share') {
    await sleep(400);
    return {
      type: 'share',
      shareId: Math.random().toString(36).slice(2, 10),
      url: `/preview/${Math.random().toString(36).slice(2, 10)}`,
      ms: 400,
      cost: '0',
    };
  }

  /* 业务节点：需求记录 / 报价计算 / 物料清单 / 导出交付 */
  if (node.type === 'req-form') {
    const p = node.params as ReqFormParams;
    const brief = [
      `客户：${p.customer || '-'}`,
      `项目：${p.projectType} · ${p.size ?? '尺寸待定'}`,
      `材质：${p.material || '-'} · 预算：${p.budget || '-'}`,
      `交期：${p.deadline || '-'}`,
      `备注：${p.note || '无'}`,
    ].join('\n');
    await sleep(150);
    return { type: 'text', text: brief, ms: 150, cost: '0' };
  }

  if (node.type === 'quote-calc') {
    await sleep(200);
    const p = node.params as QuoteParams;
    const qty = p.quantity || 1;
    const unitPrice = p.processPrice || 0;
    const area = (p.width || 0) * (p.height || 0);
    const base = area * unitPrice * qty;
    const total =
      Math.round((base + (p.labor || 0)) * (p.profit || 1) * 100) / 100;
    const rows = [
      {
        item: p.material || '铝塑板',
        spec: `${p.width}×${p.height}${p.unit}`,
        qty,
        unitPrice,
        amount: Math.round(area * unitPrice * qty * 100) / 100,
      },
      {
        item: '安装人工',
        spec: '上门安装',
        qty: 1,
        unitPrice: p.labor || 0,
        amount: p.labor || 0,
      },
    ];
    return {
      type: 'quote',
      rows,
      subtotal: Math.round((base + (p.labor || 0)) * 100) / 100,
      total,
      ms: 200,
      cost: '0',
    };
  }

  if (node.type === 'material-list') {
    await sleep(200);
    const templates: Record<
      string,
      Array<{ name: string; qty: number; spec: string; unit: string }>
    > = {
      门头灯箱: [
        { name: '亚克力发光字', spec: '80cm × 40cm', qty: 1, unit: '套' },
        { name: 'LED 灯带', spec: '暖白 12V', qty: 15, unit: '米' },
        { name: '铝塑板底板', spec: '1.22m × 2.44m', qty: 2, unit: '张' },
        { name: '变压器', spec: '200W', qty: 1, unit: '个' },
      ],
      海报喷绘: [
        { name: '喷绘布', spec: '按尺寸', qty: 1, unit: '块' },
        { name: '背胶', spec: '防水', qty: 1, unit: '卷' },
      ],
      文化墙: [
        { name: '亚克力板', spec: '5mm', qty: 3, unit: '块' },
        { name: 'PVC 雕刻字', spec: '15cm', qty: 12, unit: '个' },
      ],
    };
    const p = node.params as MaterialParams;
    const items =
      templates[p.template || '门头灯箱'] || templates['门头灯箱'] || [];
    return {
      type: 'material',
      items,
      template: p.template || '门头灯箱',
      ms: 200,
      cost: '0',
    };
  }

  if (node.type === 'export-deliver') {
    await sleep(300);
    const p = node.params as ExportParams;
    return { type: 'export', ms: 300, cost: '0', format: p.format || 'zip' };
  }

  return await callText(node);
}
