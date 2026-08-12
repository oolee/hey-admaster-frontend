/* =====================================================
   Mock 流式生成器
   根据任务类型 + 模型返回不同产物的流式 chunk
   ===================================================== */

export type MockStreamChunk =
  | { content: string; type: 'text' }
  | {
      content: { label?: string; pages?: number; type: string };
      type: 'artifact';
    }
  | { cost: number; type: 'done' };

interface MockGenerateInput {
  prompt: string;
  task: string;
  model: string;
}

/**
 * 异步可迭代流式生成器
 * 根据任务类型产出不同类型的 chunk
 */
export async function* mockGenerate({
  prompt,
  task,
  model,
}: MockGenerateInput): AsyncGenerator<MockStreamChunk> {
  // 文本块：先有开场白
  const intro = `好的，已收到你的「${taskLabel(task)}」需求：「${prompt}」。\n\n正在调用${modelLabel(model)}生成中…`;
  for (const ch of chunked(intro, 4)) {
    yield { type: 'text', content: ch };
    await sleep(28);
  }

  // 中间解释段
  const middle =
    '\n\n我已根据你的描述规划了以下要点：\n• 目标受众精准定位\n• 视觉调性符合品牌\n• 输出可直接落地';
  for (const ch of chunked(middle, 4)) {
    yield { type: 'text', content: ch };
    await sleep(22);
  }

  await sleep(280);

  // 产物
  let artifact: null | { label?: string; pages?: number; type: string } = null;
  let cost: number;
  if (task === 'image-gen' || task === 'image-edit') {
    artifact = {
      type: 'image',
      label: task === 'image-edit' ? '修改后的图像' : 'AI 生成的图像',
    };
    cost = 28;
  } else if (task === 'ppt') {
    artifact = { type: 'ppt', pages: 5 };
    cost = 35;
  } else if (task === 'web') {
    artifact = { type: 'web', label: '单页网页' };
    cost = 32;
  } else if (task === 'qa') {
    artifact = null;
    cost = 5;
    const tail = '\n\n### 总结：\n希望这能帮助你。如果还有疑问，可以继续提问。';
    for (const ch of chunked(tail, 4)) {
      yield { type: 'text', content: ch };
      await sleep(20);
    }
  } else {
    cost = 6;
  }

  if (artifact) {
    yield { type: 'artifact', content: artifact };
    await sleep(420);
    const tail =
      '\n\n### 使用说明：\n• 点击下方按钮可下载或调整\n• 如需继续优化请直接告诉我';
    for (const ch of chunked(tail, 4)) {
      yield { type: 'text', content: ch };
      await sleep(18);
    }
  }

  yield { type: 'done', cost };
}

function* chunked(text: string, size: number): Generator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function taskLabel(t: string): string {
  const map: Record<string, string> = {
    chat: '聊天',
    qa: '问答',
    'image-gen': '文生图',
    'image-edit': '图片修改',
    ppt: 'HTML 动效 PPT',
    web: '网页制作',
  };
  return map[t] || '任务';
}

function modelLabel(m: string): string {
  if (m === 'auto') return 'Auto · 自动路由模型';
  return m;
}
