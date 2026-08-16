<script setup lang="ts">
import type { SkillId, SkillInfo } from '@/skills/registry';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { fetchConversations } from '@/api';
import {
  AgentArtifactKind,
  AgentErrorCodeLabel,
  AgentResultStatus,
  runAgent,
} from '@/api/agent';
import ArtCanvas from '@/components/ui/ArtCanvas.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import ConversationList from '@/components/workspace/ConversationList.vue';
import MessageBubble from '@/components/workspace/MessageBubble.vue';
import SkillPicker from '@/components/workspace/SkillPicker.vue';
import TaskModelBar from '@/components/workspace/TaskModelBar.vue';
import { useAgentStore } from '@/stores/agent';
import { useUserStore } from '@/stores/user';
import { useWorkspaceStore } from '@/stores/workspace';
import { toast } from '@/utils/toast';
import {
  ArrowLeft,
  GalleryVerticalEnd,
  Loader2,
  Mic,
  PanelLeft,
  Paperclip,
  Send,
  Settings2,
  Sparkles,
  X,
} from 'lucide-vue-next';

const router = useRouter();
const store = useWorkspaceStore();
const user = useUserStore();
const agent = useAgentStore();

const scrollBox = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const prompt = ref('');
const generating = ref(false);
interface Attachment {
  id: string;
  url: string;
  name: string;
  note: string;
  type: string;
  /** 原始 File，发送时转 data URL 供后端解析 */
  file?: File;
}

const attachments = ref<Attachment[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
let attSeed = 0;
const showSlashHint = ref(false); // / 命令提示面板
const highlightIndex = ref(-1); // 斜杠面板键盘高亮下标

const emptyHints = computed(() => {
  const example = store.task?.example;
  return example
    ? [example, '帮我写一段春节营销文案', '推荐 3 个适合咖啡店的品牌名']
    : ['帮我写一段春节营销文案', '推荐 3 个适合咖啡店的品牌名', '输入 / 触发技能'];
});

const currentSkillColor = computed(
  () =>
    store.task?.color ?? { hue: '#6c7a89', light: 'rgba(108,122,137,0.14)' },
);
const slashMatches = computed(() => {
  if (!showSlashHint.value) return [];
  const q = prompt.value.trim().toLowerCase();
  if (!q.startsWith('/')) return [];
  const search = q.slice(1).trim(); // 去掉 "/" 与首尾空白
  if (!search) return agent.skills.slice(0, 6); // 仅 "/" 显示所有
  // 多字段模糊匹配：slash 命令 / 技能名 / 描述
  return agent.skills
    .filter((s) => {
      const fields = [
        s.slash.toLowerCase(),
        s.name.toLowerCase(),
        s.id.toLowerCase(),
        s.desc.toLowerCase(),
      ].join(' ');
      return fields.includes(search);
    })
    .slice(0, 6);
});

interface MockMsg {
  id: string;
  role: 'ai' | 'user';
  content: string;
  task?: string;
  model?: string;
  artifact?: {
    html?: string;
    images?: Array<{ seed: number; url: string }>;
    label?: string;
    pages?: number;
    type: string;
  };
  actions?: string[];
  cost?: number;
}

// 每个会话的 mock 历史
const mockHistory: Record<string, MockMsg[]> = {
  c1: [
    {
      id: 'm1',
      role: 'user',
      content: '生成一张 80×180cm 普者黑旅行海报',
      task: 'image-gen',
    },
    {
      id: 'm2',
      role: 'ai',
      task: 'image-gen',
      model: 'Midjourney v6',
      content: '已为你生成竖版旅游海报方案，融合景点导览与推荐路线。',
      artifact: { type: 'image', label: '80×180cm 旅游海报' },
      actions: ['再生成一版', '调整配色', '下载源文件'],
      cost: 28,
    },
  ],
  c2: [
    {
      id: 'm3',
      role: 'user',
      content: '做一个奶茶店开业主视觉，新中式风格',
      task: 'image-gen',
    },
    {
      id: 'm4',
      role: 'ai',
      task: 'image-gen',
      model: 'SDXL',
      content: '好的，正在生成新中式风格主视觉…',
      artifact: { type: 'image', label: '开业主视觉' },
      actions: ['调整风格', '加入 LOGO'],
      cost: 22,
    },
  ],
  c3: [
    {
      id: 'm5',
      role: 'user',
      content: '为我们的精品咖啡品牌设计一个 Logo',
      task: 'image-gen',
    },
    {
      id: 'm6',
      role: 'ai',
      task: 'image-gen',
      model: 'Midjourney v6',
      content: '为你生成了 4 个方向的 Logo 提案：',
      artifact: { type: 'image', label: 'Logo 提案 1' },
      actions: ['换方向', '加入文字'],
      cost: 24,
    },
  ],
  c4: [
    {
      id: 'm7',
      role: 'user',
      content: '生成 5 页《2026 营销趋势》HTML 动效 PPT',
      task: 'ppt',
    },
    {
      id: 'm8',
      role: 'ai',
      task: 'ppt',
      model: 'Claude 3.5',
      content: '已生成 5 页 PPT，包含动效与过渡：',
      artifact: { type: 'ppt', pages: 5, html: pptHtml() },
      actions: ['打开预览', '导出 PDF'],
      cost: 35,
    },
  ],
  c5: [
    { id: 'm9', role: 'user', content: '做一个宠物店单页网页', task: 'web' },
    {
      id: 'm10',
      role: 'ai',
      task: 'web',
      model: 'GPT-4o',
      content: '已生成响应式单页网页：',
      artifact: { type: 'web', html: webHtml() },
      actions: ['调整配色', '加入地图', '导出代码'],
      cost: 32,
    },
  ],
  c6: [
    {
      id: 'm11',
      role: 'user',
      content: '帮我整理 5 个客户案例，按行业分类',
      task: 'chat',
    },
    {
      id: 'm12',
      role: 'ai',
      task: 'chat',
      model: 'Auto · GPT-4o',
      content:
        '好的，我帮你整理了 5 个客户案例：\n\n• 餐饮：山野菜篮子 · 客流+40%\n• 科技：构建商业 · 发布会 200w+ 曝光\n• 文旅：普者黑 · 季度销量 +25%\n• 教育：星码少儿编程 · 招生 150%\n• 美妆：草木集 · 商标注册通过',
      actions: ['生成案例卡片', '导出表格'],
      cost: 8,
    },
  ],
};

// 初始历史加载
const convId = computed(() => store.activeConvId ?? 'c1');

const initialMessages = computed(() => {
  return (
    mockHistory[convId.value] || [
      {
        id: 'm0',
        role: 'ai',
        task: store.taskType,
        model: 'Auto',
        content:
          '你好，我是 Hey 19 AI 创意助手。\n\n告诉我你想做什么 —— 文案、海报、改图、PPT 还是网页？我会根据你的任务智能选择最合适的模型。',
        actions: ['看看示例', '帮助文档'],
      },
    ]
  );
});

watch(
  () => store.activeConvId,
  (id) => {
    if (id) delete store.messagesByConv[id];
    scrollBottom();
  },
  { immediate: true },
);

watch(
  () => store.taskType,
  () => {
    // 切换任务类型时，验证模型
    if (store.activeConvId) delete store.messagesByConv[store.activeConvId];
    scrollBottom();
  },
);

function scrollBottom() {
  nextTick(() => {
    if (scrollBox.value)
      scrollBox.value.scrollTop = scrollBox.value.scrollHeight;
  });
}

function pptHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#0f2e2c,#1e3a33);color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .slide{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px;opacity:0;animation:fadeIn 1s forwards}
  .slide:nth-child(1){animation-delay:.2s}.slide:nth-child(2){animation-delay:3.2s}.slide:nth-child(3){animation-delay:6.2s}
  .slide:nth-child(4){animation-delay:9.2s}.slide:nth-child(5){animation-delay:12.2s}
  h1{font-size:72px;margin:0 0 24px;font-weight:800;background:linear-gradient(120deg,#ff6b35,#ffc24b);-webkit-background-clip:text;color:transparent}
  p{font-size:24px;opacity:.85;max-width:600px;line-height:1.6}
  .num{font-size:120px;font-weight:800;color:rgba(255,255,255,.08);position:absolute;top:40px;left:60px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
  </style></head><body>
  <div class="slide"><span class="num">01</span><h1>2026 营销趋势</h1><p>从流量到留量，AI 重新定义品牌增长</p></div>
  <div class="slide"><span class="num">02</span><h1>AI 原生内容</h1><p>日更 100 条不再是奢望，质量由你决定</p></div>
  <div class="slide"><span class="num">03</span><h1>个性化体验</h1><p>千人千面，让每个用户都看到专属内容</p></div>
  <div class="slide"><span class="num">04</span><h1>短视频 × 直播</h1><p>内容矩阵化，30 天打造品牌 IP</p></div>
  <div class="slide"><span class="num">05</span><h1>开始行动</h1><p>Hey 19，让创意生产快 10 倍</p></div>
  </body></html>`;
}

function webHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#faf7f2;color:#1e3a33}
header{padding:20px 60px;display:flex;justify-content:space-between;align-items:center;background:#fff;border-bottom:1px solid #e6e6e2}
header h1{font-size:24px;color:#ff6b35}nav{display:flex;gap:24px}nav a{color:#595955;text-decoration:none;font-size:14px}
.hero{padding:100px 60px;text-align:center;background:linear-gradient(135deg,#faf7f2,#fff)}
.hero h2{font-size:64px;margin-bottom:20px;background:linear-gradient(120deg,#ff6b35,#7c5cff);-webkit-background-clip:text;color:transparent}
.hero p{font-size:18px;color:#595955;max-width:600px;margin:0 auto 30px}
.btn{padding:14px 32px;background:#ff6b35;color:#fff;border-radius:999px;text-decoration:none;font-weight:600}
.products{padding:60px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.card{padding:24px;background:#fff;border-radius:20px;border:1px solid #e6e6e2}
.card h3{margin-bottom:10px}
</style></head><body>
<header><h1>🐾 萌宠之家</h1><nav><a href="#">首页</a><a href="#">服务</a><a href="#">价格</a><a href="#">联系</a></nav></header>
<section class="hero"><h2>给毛孩子最好的爱</h2><p>专业洗护 · 健康餐饮 · 趣味玩具，一站式宠物生活馆</p><a href="#" class="btn">立即预约</a></section>
<section class="products"><div class="card"><h3>专业洗护</h3><p>经验丰富的宠物美容师，让爱宠焕然一新</p></div><div class="card"><h3>健康餐饮</h3><p>精选天然食材，定制专属营养餐</p></div><div class="card"><h3>趣味玩具</h3><p>激发爱宠天性，让每一天都充满乐趣</p></div></section>
</body></html>`;
}

async function send() {
  const text = prompt.value.trim();
  if (!text || generating.value) return;

  // 上传图片后自动切换到改图技能
  let taskType = store.taskType;
  if (attachments.value.length > 0 && taskType === 'image-gen')
    taskType = 'image-edit';

  // 生成带附件备注的完整 prompt（GPT-image-2 引用描述）
  let finalPrompt = text;
  if (
    attachments.value.length > 0 &&
    (taskType === 'image-edit' || taskType === 'image-gen')
  ) {
    const refs = attachments.value
      .map(
        (a, i) =>
          `Image ${i + 1}${a.note ? ` (${a.note})` : ''} is the reference ${a.note || 'image'}`,
      )
      .join(', ');
    finalPrompt = `${text}\n\n[附件说明] ${refs}. 请根据标注使用这些图片。`;
  }

  // 附件转 data URL（后端参考图解析仅支持 data: / http(s)）
  const attachFiles = [...attachments.value];
  const refUrls = await Promise.all(
    attachFiles.map(async (a) => {
      if (a.file) {
        try {
          return await fileToDataUrl(a.file);
        } catch {
          return a.url;
        }
      }
      return a.url;
    }),
  );

  prompt.value = '';
  const userMsg = {
    id: `u${Date.now()}`,
    role: 'user' as const,
    content: finalPrompt,
    task: taskType,
    attachments: attachFiles.map((a) => ({ name: a.name, note: a.note })),
  };
  store.appendMessage(convId.value, userMsg);
  attachments.value = [];
  scrollBottom();

  generating.value = true;
  const aiMsg = {
    id: `a${Date.now()}`,
    role: 'ai' as const,
    content: '',
    streaming: true,
    task: taskType,
    model: 'Auto',
    cost: 0,
  };
  store.appendMessage(convId.value, aiMsg);
  scrollBottom();

  try {
    // 真实后端：POST /api/ai-agent/run（阶段 0 同步返回；SSE 流式阶段 2）
    const run = await runAgent({
      message: finalPrompt,
      history: [],
      resourceRefs: refUrls,
      params: {},
      idempotencyKey: `u${Date.now()}`,
    });

    const result = run.result;
    if (!result || result.status !== AgentResultStatus.Succeeded) {
      const code = result?.errorCode;
      throw new Error(
        code === null || code === undefined
          ? '生成失败'
          : AgentErrorCodeLabel[code] || `错误码 ${code}`,
      );
    }

    const textArtifact = result.artifacts?.find(
      (a) => a.kind === AgentArtifactKind.Text,
    );
    const imageArtifact = result.artifacts?.find(
      (a) => a.kind === AgentArtifactKind.Image,
    );

    if (imageArtifact) {
      store.updateLastMessage(convId.value, {
        artifact: {
          type: 'image',
          label: 'AI 生成的图像',
          images: [{ url: imageArtifact.uri }],
        },
      });
    }
    if (textArtifact?.text) {
      store.updateLastMessage(convId.value, { content: textArtifact.text });
    }

    store.updateLastMessage(convId.value, {
      streaming: false,
      cost: result.usage?.chargedAmount ?? 0,
      actions: getActions(taskType),
    });
    toast.success('生成完成');
  } catch (error) {
    store.updateLastMessage(convId.value, { streaming: false });
    toast.error(
      `生成失败：${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    generating.value = false;
    scrollBottom();
  }
}

function getActions(taskType: SkillId) {
  switch (taskType) {
    case 'chat': {
      return ['继续讨论', '总结对话'];
    }
    case 'image-edit': {
      return ['再调整一次', '保留此版本'];
    }
    case 'image-gen': {
      return ['再生成一版', '调整配色', '提高分辨率'];
    }
    case 'ppt': {
      return ['打开预览', '导出 PDF', '增加一页'];
    }
    case 'qa': {
      return ['深入解释', '举例说明'];
    }
    case 'web': {
      return ['调整样式', '导出代码', '加入交互动效'];
    }
    default: {
      return ['继续'];
    }
  }
}

function onAttach() {
  fileInput.value?.click();
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement | null;
  const files = [...(input?.files || [])];
  if (files.length === 0) return;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    attSeed += 1;
    attachments.value.push({
      id: `att-${Date.now()}-${attSeed}`,
      url: URL.createObjectURL(f),
      name: f.name,
      note: '', // 用户备注：LOGO / 参考图 / 产品图...
      type: f.type,
    });
  }
  // 自动切换到改图技能
  if (store.taskType !== 'image-edit' && store.taskType !== 'image-gen') {
    store.taskType = 'image-edit';
    toast.info('已自动切换到「改图」技能');
  }
  if (input) input.value = '';
}

function removeAttachment(id: string) {
  const idx = attachments.value.findIndex((a) => a.id === id);
  if (idx !== -1) {
    const att = attachments.value[idx];
    if (att) URL.revokeObjectURL(att.url);
    attachments.value.splice(idx, 1);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}
function updateAttNote(id: string, note: string) {
  const a = attachments.value.find((x) => x.id === id);
  if (a) a.note = note;
}

function onNoteInput(id: string, e: Event) {
  updateAttNote(id, (e.target as HTMLInputElement | null)?.value ?? '');
}

/* + 号面板选择处理：skill 或 file/scan */
function onSkillPick(type: 'file' | 'scan' | SkillInfo) {
  if (type === 'file') {
    onAttach();
  } else if (type === 'scan') {
    toast.info('提示：在输入框按 Ctrl+V 可直接粘贴剪贴板图片');
  } else if (typeof type === 'object' && type.id) {
    store.taskType = type.id;
    inputEl.value?.focus();
  }
}

/* ---- 粘贴图片 (Ctrl+V) ---- */
function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  let pasted = false;
  for (const it of items) {
    if (it.type?.startsWith('image/')) {
      const file = it.getAsFile();
      if (file) {
        e.preventDefault();
        addAttachmentFile(file);
        pasted = true;
      }
    }
  }
  if (
    pasted &&
    store.taskType !== 'image-edit' &&
    store.taskType !== 'image-gen'
  ) {
    store.taskType = 'image-edit';
    toast.info('已自动切换到「改图」技能');
  }
}

function addAttachmentFile(file: File) {
  attSeed += 1;
  attachments.value.push({
    id: `att-${Date.now()}-${attSeed}`,
    url: URL.createObjectURL(file),
    name: file.name || `pasted-${attSeed}.png`,
    note: '',
    type: file.type,
  });
}

/* ---- / 斜杠命令提示 ---- */
function onPromptInput() {
  const v = prompt.value;
  showSlashHint.value = v.trim().startsWith('/');
  highlightIndex.value = -1; // 每次输入重置高亮
}

function onComposerKeydown(e: KeyboardEvent) {
  const list = slashMatches.value;
  // 面板未展开：Enter 发送（保持原有行为）
  if (list.length === 0) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightIndex.value = (highlightIndex.value + 1) % list.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightIndex.value =
      highlightIndex.value <= 0 ? list.length - 1 : highlightIndex.value - 1;
  } else if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const idx = highlightIndex.value >= 0 ? highlightIndex.value : 0;
    const target = list[idx];
    if (target) pickFromSlash(target);
  }
}

function pickFromSlash(skill: SkillInfo) {
  // 移除 / 指令前缀，剩余为正文
  const rest = prompt.value.replace(/^\/\S*/, '').trim();
  prompt.value = rest;
  showSlashHint.value = false;
  store.taskType = skill.id;
  inputEl.value?.focus();
  toast.success(`已触发 ${skill.name} 技能`);
  // 立即发送
  if (rest) send();
}

function onAction(action: { label: string; type: string }) {
  const { type, label } = action;
  if (type === 'quick') {
    prompt.value = label;
    send();
  } else if (type === 'retry') {
    toast.info('重新生成中…');
  } else if (type === 'open') {
    window.open(label, '_blank');
  }
}

function toggleTemplate() {
  store.templateDrawer = !store.templateDrawer;
}

function goHome() {
  router.push('/');
}

const messages = computed(() => {
  return store.messagesByConv[convId.value] || initialMessages.value;
});

onMounted(async () => {
  // 拉取 Agent 目录（能力/模型桥），后端不可用时回退本地兜底技能清单
  await agent.refresh();

  // 拉取真实会话列表（未登录/失败时保留空态）
  try {
    const res = await fetchConversations();
    if (res.code === 0 && res.data?.list?.length) {
      store.setConversations(res.data.list);
    }
  } catch {
    /* 未登录或后端不可用：保持空会话 */
  }
  scrollBottom();
  inputEl.value?.focus();
});
</script>

<template>
  <div class="ws">
    <!-- 顶部 -->
    <header class="ws-top">
      <div class="ws-top-left">
        <button
          class="mini-btn conv-toggle"
          :class="{ on: store.convPanelOpen }"
          @click="store.toggleConvPanel()"
          title="会话列表"
          aria-label="会话列表"
        >
          <PanelLeft :size="17" />
        </button>
        <button class="back-home" @click="goHome" title="返回首页">
          <ArrowLeft :size="16" />
          <span>首页</span>
        </button>
        <span class="ws-divider"></span>
        <router-link to="/" class="ws-logo">
          <span class="ws-logo-mark">H</span>
          <span class="ws-logo-text">Hey 19</span>
        </router-link>
        <span class="ws-title">AI 工作台</span>
      </div>

      <div class="ws-top-center">
        <TaskModelBar />
      </div>

      <div class="ws-top-right">
        <button
          class="mini-btn template-toggle"
          :class="{ on: store.templateDrawer }"
          @click="toggleTemplate"
          title="模板抽屉"
        >
          <GalleryVerticalEnd :size="17" />
        </button>
        <ThemeToggle />
        <span class="credit">
          <Sparkles :size="13" />
          <span class="credit-num">{{
            (user.user?.credits ?? 6970).toLocaleString()
          }}</span>
        </span>
        <button class="avatar-btn" @click="router.push('/profile')">
          {{ user.user?.avatar || 'U' }}
        </button>
      </div>
    </header>

    <div class="ws-body">
      <!-- 会话侧栏 -->
      <ConversationList />

      <!-- 中间消息流 -->
      <main class="chat-main">
        <div ref="scrollBox" class="chat-scroll">
          <!-- 空状态 -->
          <div v-if="!messages.length" class="chat-empty">
            <div class="empty-orb"><Sparkles :size="28" /></div>
            <h2>今天想创作点什么？</h2>
            <p>{{ store.task?.name }}模式</p>
            <div class="suggestions">
              <button
                v-for="s in emptyHints"
                :key="s"
                class="sug-chip"
                @click="
                  prompt = s;
                  inputEl?.focus();
                "
              >
                {{ s }}
              </button>
            </div>
          </div>

          <!-- 消息流 -->
          <div v-else class="chat-list">
            <MessageBubble
              v-for="m in messages"
              :key="m.id"
              :message="m"
              @action="onAction"
            />
          </div>
        </div>

        <!-- 输入区：底部固定 -->
        <div class="composer">
          <div class="composer-inner">
            <!-- 附件预览（多图 + 备注） -->
            <div v-if="attachments.length" class="attachments-row">
              <div v-for="a in attachments" :key="a.id" class="att-item">
                <div class="att-thumb">
                  <img :src="a.url" :alt="a.name" />
                  <button
                    class="att-remove"
                    :title="`移除 ${a.name}`"
                    @click="removeAttachment(a.id)"
                  >
                    <X :size="12" />
                  </button>
                </div>
                <input
                  class="att-note"
                  :value="a.note"
                  placeholder="备注用途，如：LOGO / 参考图…"
                  @input="onNoteInput(a.id, $event)"
                />
              </div>
            </div>

            <div
              class="composer-box"
              :style="{
                '--sh': currentSkillColor.hue,
                '--sl': currentSkillColor.light,
              }"
            >
              <!-- 当前 skill 颜色指示条 -->
              <div
                class="skill-indicator"
                :style="{ background: currentSkillColor.hue }"
              >
                <span>{{ store.task?.name }} 技能已激活</span>
                <span class="slash-hint">输入 / 触发其他技能</span>
              </div>

              <!-- / 斜杠提示面板 -->
              <Transition name="slash">
                <div
                  v-if="showSlashHint && slashMatches.length"
                  class="slash-panel"
                >
                  <p class="slash-title">技能命令</p>
                  <button
                    v-for="(s, index) in slashMatches"
                    :key="s.id"
                    class="slash-item"
                    :class="{ active: highlightIndex === index }"
                    :style="{
                      '--sh': s.color.hue,
                      '--sl': s.color.light,
                    }"
                    @mouseenter="highlightIndex = index"
                    @click="pickFromSlash(s)"
                  >
                    <span class="slash-icon"
                      ><component :is="s.icon" :size="14"
                    /></span>
                    <span class="slash-name">{{ s.slash }}</span>
                    <span class="slash-desc">{{ s.desc }}</span>
                  </button>
                </div>
              </Transition>

              <textarea
                ref="inputEl"
                v-model="prompt"
                class="composer-input"
                rows="1"
                :placeholder="
                  store.taskType === 'image-edit'
                    ? '描述你想对图片做的修改…或粘贴截图（Ctrl+V）'
                    : '描述你的设计需求，或输入 / 触发技能…'
                "
                @keydown="onComposerKeydown"
                @input="onPromptInput"
                @paste="onPaste"
              ></textarea>
              <div class="composer-bar">
                <div class="composer-tools">
                  <!-- + 号：添加技能 / 文件 -->
                  <SkillPicker @select="onSkillPick" />
                  <button
                    class="tool-btn"
                    :class="{ active: attachments.length }"
                    title="上传参考图"
                    @click="onAttach"
                  >
                    <Paperclip :size="16" />
                  </button>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    @change="onFile"
                  />
                  <button class="tool-btn" title="语音输入">
                    <Mic :size="16" />
                  </button>
                  <button class="tool-btn" title="高级设置">
                    <Settings2 :size="16" />
                  </button>
                  <span
                    class="model-tag"
                    :style="{
                      background: currentSkillColor.light,
                      color: currentSkillColor.hue,
                    }"
                  >
                    <Sparkles :size="12" />
                    {{ store.task?.name }}
                  </span>
                </div>
                <div class="composer-send">
                  <span class="enter-hint">Enter 发送 · Shift+Enter 换行</span>
                  <button
                    class="send-btn"
                    :disabled="!prompt.trim() || generating"
                    @click="send"
                  >
                    <Loader2 v-if="generating" :size="17" class="spin" />
                    <Send v-else :size="17" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 模板抽屉 -->
      <aside class="tpl-panel" :class="{ hidden: !store.templateDrawer }">
        <div class="tpl-head">
          <h3>设计模板</h3>
          <span class="tpl-count">{{ 12 }} 款</span>
        </div>
        <div class="tpl-scroll">
          <p class="tpl-group">门头店招</p>
          <div class="tpl-card">
            <div class="tpl-thumb"><ArtCanvas variant="store" :seed="1" /></div>
            <div class="tpl-name">门头设计</div>
            <div class="tpl-ratio">80×40cm</div>
          </div>
          <div class="tpl-card">
            <div class="tpl-thumb"><ArtCanvas variant="store" :seed="2" /></div>
            <div class="tpl-name">门头店招</div>
            <div class="tpl-ratio">60×120cm</div>
          </div>
          <p class="tpl-group">VI 设计</p>
          <div class="tpl-card">
            <div class="tpl-thumb"><ArtCanvas variant="vi" :seed="3" /></div>
            <div class="tpl-name">Logo 设计</div>
            <div class="tpl-ratio">多方案</div>
          </div>
          <div class="tpl-card">
            <div class="tpl-thumb"><ArtCanvas variant="vi" :seed="4" /></div>
            <div class="tpl-name">名片设计</div>
            <div class="tpl-ratio">90×54mm</div>
          </div>
          <p class="tpl-group">印刷物料</p>
          <div class="tpl-card">
            <div class="tpl-thumb"><ArtCanvas variant="flyer" :seed="5" /></div>
            <div class="tpl-name">DM 传单</div>
            <div class="tpl-ratio">A4 / A5</div>
          </div>
          <p class="tpl-group">室内设计</p>
          <div class="tpl-card">
            <div class="tpl-thumb"><ArtCanvas variant="space" :seed="6" /></div>
            <div class="tpl-name">室内效果图</div>
            <div class="tpl-ratio">4K 输出</div>
          </div>
          <p class="tpl-group">社媒内容</p>
          <div class="tpl-card">
            <div class="tpl-thumb">
              <ArtCanvas variant="social" :seed="7" />
            </div>
            <div class="tpl-name">九宫格</div>
            <div class="tpl-ratio">小红书</div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ws {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg);
}

/* 顶部 */
.ws-top {
  z-index: 20;
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--sp-3);
  align-items: center;
  height: var(--header-h);
  padding: 0 var(--sp-4);
  background: color-mix(in srgb, var(--color-surface) 80%, transparent);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(14px);
}

.ws-top-left {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
}

.ws-top-center {
  display: flex;
  align-items: center;
}

.ws-top-right {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  justify-content: flex-end;
}

.back-home {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0.4rem 0.7rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.back-home:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: translateX(-2px);
}

.ws-divider {
  width: 1px;
  height: 18px;
  background: var(--color-border);
}

.ws-logo {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-1);
}

.ws-logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: 8px;
}

.ws-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-3);
}

.mini-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.mini-btn:hover,
.mini-btn.on {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.conv-toggle {
  display: none;
}

.credit {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 0.4rem 0.8rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-soft);
  border-radius: var(--r-full);
}

.credit-num {
  font-family: var(--font-display);
  font-weight: 700;
}

.avatar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: 50%;
  transition: transform var(--dur-fast) ease;
}

.avatar-btn:hover {
  transform: scale(1.06);
}

/* 主体 */
.ws-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 消息区 */
.chat-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.chat-scroll {
  flex: 1;
  padding: var(--sp-6);
  overflow-y: auto;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
}

.empty-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent), var(--color-ai));
  border-radius: var(--r-2xl);
  box-shadow: var(--shadow-accent);
  animation: breathe 3s ease-in-out infinite;
}

.chat-empty h2 {
  font-size: var(--text-2xl);
}

.chat-empty p {
  font-size: var(--text-sm);
  color: var(--color-text-3);
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  justify-content: center;
  max-width: 560px;
  margin-top: var(--sp-3);
}

.sug-chip {
  padding: 0.6rem 1.1rem;
  font-size: var(--text-sm);
  color: var(--color-text-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-full);
  transition: all var(--dur-fast) ease;
}

.sug-chip:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  max-width: 820px;
  margin: 0 auto;
}

/* 输入区 */
.composer {
  flex-shrink: 0;
  padding: var(--sp-3) var(--sp-4) var(--sp-4);
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.composer-inner {
  max-width: 820px;
  margin: 0 auto;
}

.attachments-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.att-item {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  max-width: 320px;
  padding: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-md);
}

.att-thumb {
  position: relative;
  flex-shrink: 0;
}

.att-thumb img {
  display: block;
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: var(--r-sm);
}

.att-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: #fff;
  background: rgb(0 0 0 / 72%);
  border-radius: 50%;
  transition: background var(--dur-fast) ease;
}

.att-remove:hover {
  background: var(--color-error);
}

.att-note {
  min-width: 140px;
  max-width: 220px;
  padding: 6px 8px;
  font-size: var(--text-xs);
  color: var(--color-text-1);
  caret-color: var(--color-accent);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--r-sm);
}

.att-note:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--glow-accent);
}

.att-note::placeholder {
  color: var(--color-text-3);
}

.composer-box {
  position: relative;
  padding: 0;
  overflow: visible;
  background: var(--color-surface);
  border: 1.5px solid var(--sh, var(--color-border));
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--dur-fast) ease,
    box-shadow var(--dur-fast) ease,
    background var(--dur-fast) ease;
}

.composer-box:focus-within {
  border-color: var(--sh);
  box-shadow: 0 0 0 3px var(--sl);
}

/* 当前 skill 颜色指示条 */
.skill-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 1rem;
  font-size: var(--text-xs);
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.02em;
  border-radius: 12px 12px 0 0;
}

.skill-indicator > span:first-child::before {
  margin-right: 6px;
  content: '●';
  opacity: 0.9;
}

.slash-hint {
  font-weight: 500;
  opacity: 0.85;
}

/* / 斜杠提示面板 */
.slash-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 35;
  max-height: 320px;
  padding: 0.5rem;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
}

.slash-title {
  padding: 0.4rem 0.7rem 0.3rem;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-3);
}

.slash-item {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
  width: 100%;
  padding: 0.55rem 0.7rem;
  text-align: left;
  border-radius: var(--r-md);
  transition: background var(--dur-fast) ease;
}

.slash-item:hover {
  background: var(--sl);
}

.slash-item.active {
  background: var(--sl);
}

.slash-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #fff;
  background: var(--sh);
  border-radius: var(--r-md);
}

.slash-name {
  flex-shrink: 0;
  min-width: 60px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--sh);
}

.slash-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  color: var(--color-text-3);
  white-space: nowrap;
}

.slash-enter-active,
.slash-leave-active {
  transition: all 0.18s var(--ease-out-expo);
}

.slash-enter-from,
.slash-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}

/* composer 输入容器 */
.composer-input {
  width: 100%;
  max-height: 140px;
  padding: 12px 18px 4px;
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text-1);
  caret-color: var(--sh);
  resize: none;
  outline: none;
  background: transparent;
  border: none;
}

.composer-input::placeholder {
  color: var(--color-text-3);
}

.composer-input::placeholder {
  color: var(--color-text-3);
}

.composer-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 10px;
  margin-top: var(--sp-2);
}

.composer-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-3);
  border-radius: var(--r-md);
  transition: all var(--dur-fast) ease;
}

.tool-btn:hover {
  color: var(--color-text-1);
  background: var(--color-surface-2);
}

.tool-btn.active {
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.model-tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 0.3rem 0.7rem;
  margin-left: var(--sp-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-ai);
  background: var(--color-ai-soft);
  border-radius: var(--r-full);
}

.composer-send {
  display: flex;
  gap: var(--sp-3);
  align-items: center;
}

.enter-hint {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: 50%;
  box-shadow: var(--shadow-accent);
  transition: all var(--dur-fast) ease;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.06);
}

.send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 模板抽屉 */
.tpl-panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  width: 288px;
  overflow: hidden;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  transition:
    margin-right 0.3s var(--ease-out-expo),
    width 0.3s var(--ease-out-expo);
}

.tpl-panel.hidden {
  width: 0;
  margin-right: 0;
  border-left: none;
}

@media (max-width: 1023px) {
  .tpl-panel {
    display: none;
  }
}

.tpl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
  border-bottom: 1px solid var(--color-border);
}

.tpl-head h3 {
  font-size: var(--text-base);
}

.tpl-count {
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

.tpl-scroll {
  flex: 1;
  padding: var(--sp-4);
  overflow-y: auto;
}

.tpl-group {
  margin: var(--sp-4) 0 var(--sp-2);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-3);
  letter-spacing: 0.05em;
}

.tpl-group:first-child {
  margin-top: 0;
}

.tpl-card {
  position: relative;
  margin-bottom: var(--sp-3);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: var(--r-lg);
  transition: all var(--dur-fast) ease;
}

.tpl-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.tpl-thumb {
  aspect-ratio: 4/3;
}

.tpl-name {
  padding: 0.5rem 0.7rem 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.tpl-ratio {
  padding: 0 0.7rem 0.6rem;
  font-size: var(--text-xs);
  color: var(--color-text-3);
}

@media (max-width: 1023px) {
  .conv-toggle {
    display: flex;
  }

  .ws-logo-text,
  .ws-title {
    display: none;
  }

  .credit,
  .template-toggle {
    display: none;
  }
}

@media (max-width: 768px) {
  .ws-top {
    grid-template-columns: 1fr auto;
  }

  .ws-top-center {
    display: none;
  }

  .enter-hint {
    display: none;
  }

  .back-home span {
    display: none;
  }

  .back-home {
    padding: 0.4rem 0.6rem;
  }

  .ws-top-right {
    gap: var(--sp-2);
  }
}
</style>
