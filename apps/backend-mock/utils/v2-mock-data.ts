// ============================================================
// V2 UI 站点 Mock 数据（源自 hey19-v2 server/utils/mock-data.js）
// 仅供 hey-public V2 新 UI 原型使用；认证为 mock（无 Supabase）
// ============================================================

export interface V2Case {
  id: number;
  title: string;
  category: string;
  industry: string;
  description: string;
  views: number;
  likes: number;
  gradient: string;
  tags: string[];
  date: string;
  client: string;
  result: string;
}

export const cases: V2Case[] = [
  {
    id: 1,
    title: '山野菜篮子 · 餐饮全案',
    category: '门头店招',
    industry: '餐饮连锁',
    description:
      '门头 + 菜单 + 社媒海报，3 天完成全店视觉升级，开业首周客流提升 40%。',
    views: 3280,
    likes: 486,
    gradient: 'linear-gradient(135deg,#ff9d76 0%,#e85320 100%)',
    tags: ['门头', '菜单', '社媒'],
    date: '2026-07-28',
    client: '山野菜篮子',
    result: '客流 +40% · 开业 3 天售罄',
  },
  {
    id: 2,
    title: '构建商业 · 主视觉系统',
    category: 'VI 设计',
    industry: '科技互联网',
    description: '为 SaaS 产品发布会打造系列主视觉、演讲 PPT 与社媒传播素材。',
    views: 2465,
    likes: 392,
    gradient: 'linear-gradient(135deg,#9b8cff 0%,#5d3ff0 100%)',
    tags: ['VI', '发布会', 'PPT'],
    date: '2026-07-21',
    client: '构建商业',
    result: '发布会曝光 200w+',
  },
  {
    id: 3,
    title: '潮玩品牌 · 社媒矩阵',
    category: '社媒内容',
    industry: '新消费',
    description: '30 天产出 120 张平台适配内容，互动率提升 3 倍，涨粉 2w+。',
    views: 1987,
    likes: 312,
    gradient: 'linear-gradient(135deg,#ffc24b 0%,#f5a623 100%)',
    tags: ['社媒', '运营'],
    date: '2026-07-15',
    client: '潮玩星球',
    result: '互动率 ×3 · 涨粉 2w+',
  },
  {
    id: 4,
    title: '普者黑 · 旅游海报',
    category: '海报设计',
    industry: '文旅',
    description: '80×180cm 竖版旅游海报，融合景点导览与推荐路线。',
    views: 3120,
    likes: 428,
    gradient: 'linear-gradient(135deg,#7cd0c4 0%,#2a6a5e 100%)',
    tags: ['海报', '文旅'],
    date: '2026-07-10',
    client: '普者黑文旅',
    result: '季度门票销量 +25%',
  },
  {
    id: 5,
    title: '少儿编程 · 招生传单',
    category: '印刷物料',
    industry: '教育',
    description: 'A4 双面传单 + 报名海报，助力暑期招生完成 150% 目标。',
    views: 1654,
    likes: 201,
    gradient: 'linear-gradient(135deg,#6ca2f0 0%,#3d7bd9 100%)',
    tags: ['传单', '招生'],
    date: '2026-07-02',
    client: '星码少儿编程',
    result: '招生目标 150%',
  },
  {
    id: 6,
    title: '草本护肤 · Logo 设计',
    category: 'Logo 设计',
    industry: '美妆',
    description: '从 12 个 AI 提案中精选并精修，最终注册通过率 100%。',
    views: 2891,
    likes: 356,
    gradient: 'linear-gradient(135deg,#86aca1 0%,#3a6659 100%)',
    tags: ['Logo', '美妆'],
    date: '2026-06-25',
    client: '草木集',
    result: '商标注册通过',
  },
  {
    id: 7,
    title: '24h 便利店 · 发光招牌',
    category: '门头店招',
    industry: '零售',
    description: '结合街景模拟的 3D 效果图，直接对接制作厂商落地。',
    views: 2234,
    likes: 287,
    gradient: 'linear-gradient(135deg,#ff7f52 0%,#c03f15 100%)',
    tags: ['3D', '发光字'],
    date: '2026-06-18',
    client: '悦来便利店',
    result: '夜视辨识度 ×2',
  },
  {
    id: 8,
    title: '私募基金 · 品牌识别',
    category: 'VI 设计',
    industry: '金融',
    description: '严谨商务风格，输出 Logo、名片、PPT 模板与官网风格指南。',
    views: 1420,
    likes: 178,
    gradient: 'linear-gradient(135deg,#58867a 0%,#142a25 100%)',
    tags: ['VI', '金融'],
    date: '2026-06-12',
    client: '远山资本',
    result: '品牌手册交付',
  },
  {
    id: 9,
    title: '夏季音乐节 · 主视觉',
    category: '海报设计',
    industry: '活动',
    description: '高饱和渐变与动态排版，点燃现场氛围，成为社交媒体热门素材。',
    views: 3756,
    likes: 512,
    gradient: 'linear-gradient(135deg,#ff6b35 0%,#ffc24b 100%)',
    tags: ['海报', '音乐节'],
    date: '2026-06-05',
    client: '热浪音乐节',
    result: '全网转发 10w+',
  },
];

export interface V2Template {
  id: string;
  name: string;
  desc: string;
  cat: string;
  ratio: string;
  hot: boolean;
}

export const templates: V2Template[] = [
  {
    id: 'mt-1',
    name: '门头设计',
    desc: '标准横版门头',
    cat: '门头店招',
    ratio: '80×40cm',
    hot: true,
  },
  {
    id: 'mt-2',
    name: '门头店招',
    desc: '竖版立体招牌',
    cat: '门头店招',
    ratio: '60×120cm',
    hot: true,
  },
  {
    id: 'mt-3',
    name: '3D 门头效果图',
    desc: '街景实拍合成',
    cat: '门头店招',
    ratio: '场景渲染',
    hot: true,
  },
  {
    id: 'vi-1',
    name: 'VI 基础系统',
    desc: 'Logo+色板+字体',
    cat: 'VI 设计',
    ratio: '完整手册',
    hot: false,
  },
  {
    id: 'vi-2',
    name: 'Logo 设计',
    desc: '多风格提案',
    cat: 'VI 设计',
    ratio: 'AI 生成',
    hot: true,
  },
  {
    id: 'vi-3',
    name: '名片设计',
    desc: '双面商务名片',
    cat: 'VI 设计',
    ratio: '90×54mm',
    hot: false,
  },
  {
    id: 'vi-4',
    name: '信封 / 信纸',
    desc: '企业办公套件',
    cat: 'VI 设计',
    ratio: '企业办公',
    hot: false,
  },
  {
    id: 'pr-1',
    name: 'DM 传单',
    desc: 'A4/A5 双面',
    cat: '印刷物料',
    ratio: 'A4 / A5',
    hot: false,
  },
  {
    id: 'pr-2',
    name: '活动海报',
    desc: '竖版 / 横版',
    cat: '印刷物料',
    ratio: 'A2 / A3',
    hot: false,
  },
  {
    id: 'id-1',
    name: '室内效果图',
    desc: 'AI 空间渲染',
    cat: '室内设计',
    ratio: '4K 输出',
    hot: true,
  },
  {
    id: 'id-2',
    name: '软装搭配方案',
    desc: '风格化建议',
    cat: '室内设计',
    ratio: '方案手册',
    hot: false,
  },
  {
    id: 'sm-1',
    name: '社媒九宫格',
    desc: '小红书/抖音',
    cat: '社媒内容',
    ratio: '9 宫格',
    hot: true,
  },
  {
    id: 'sm-2',
    name: '直播预告海报',
    desc: '高转化排版',
    cat: '社媒内容',
    ratio: '1080×1920',
    hot: false,
  },
];

export interface V2Plan {
  id: string;
  name: string;
  price: null | number;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  featured: boolean;
}

export const plans: V2Plan[] = [
  {
    id: 'starter',
    name: '体验版',
    price: 0,
    period: '永久免费',
    desc: '初次体验 AI 设计能力的最佳起点',
    features: ['每月 50 积分', '基础模板库 80+', '标准分辨率导出', '社区支持'],
    cta: '免费开始',
    featured: false,
  },
  {
    id: 'pro',
    name: '专业版',
    price: 99,
    period: '每月',
    desc: '自由职业者与小微商家的创作主力',
    features: [
      '每月 2,000 积分',
      '全部 300+ 模板',
      '4K 高清导出',
      '商用授权',
      '优先生成队列',
      '历史记录云同步',
    ],
    cta: '立即订阅',
    featured: true,
  },
  {
    id: 'team',
    name: '团队版',
    price: 399,
    period: '每月',
    desc: '多成员协作的品牌内容工厂',
    features: [
      '5 席位 · 每位 2,000 积分',
      '共享品牌资产库',
      '审批与权限管理',
      '专属客户成功',
      'API 优先接入',
    ],
    cta: '升级团队',
    featured: false,
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: null,
    period: '定制',
    desc: '为规模化品牌与集团打造的完整方案',
    features: [
      '无限积分 · 不限席位',
      '私有化部署',
      '模型微调与定制',
      '专属客户经理',
      'SLA 99.9%',
    ],
    cta: '联系销售',
    featured: false,
  },
];

export const addons = [
  {
    id: 'a1',
    name: '单次设计',
    price: '¥199 起',
    desc: '海报 / Logo / 名片等单品设计，交付源文件',
  },
  {
    id: 'a2',
    name: '品牌全案',
    price: '¥9,999 起',
    desc: '策略定位到 VI 系统、应用规范与落地监理',
  },
  {
    id: 'a3',
    name: '月度内容托管',
    price: '¥2,999/月',
    desc: '每月固定产出社媒内容、海报与短视频脚本',
  },
  {
    id: 'a4',
    name: 'AI 设计培训',
    price: '按需报价',
    desc: '为企业团队提供 AI 设计工具实战培训',
  },
];

export const faqs = [
  {
    q: '积分是如何计算的？',
    a: '不同模型与分辨率消耗不同积分：标准图片生成约 10-30 积分/张，4K 高清导出约 50 积分/张，视频按秒计费。未用完的积分可累积至下月。',
  },
  {
    q: '生成的内容可以商用吗？',
    a: '专业版及以上用户生成的内容拥有完整商用授权。体验版仅限个人学习与预览，不可用于商业用途。',
  },
  {
    q: '是否支持团队协作？',
    a: '团队版与企业版支持多席位、共享品牌资产库、审批流程与权限管理，管理员可实时查看项目进度与积分使用情况。',
  },
  {
    q: '可以随时取消订阅吗？',
    a: '是的，你可以在账户设置中随时取消。取消后仍可使用至当前计费周期结束，未用完的积分保留 30 天。',
  },
];

export const stats = [
  { value: '300+', label: '创意模板', suffix: '个' },
  { value: '5,000', label: '企业客户', suffix: '+' },
  { value: '98%', label: '客户满意率', suffix: '' },
  { value: '8', label: '行业深耕', suffix: '年' },
];

export const team = [
  {
    id: 1,
    name: '林晓峰',
    role: '创始人 & CEO',
    bio: '8 年品牌设计老兵',
    gradient: 'linear-gradient(135deg,#ff9d76,#e85320)',
  },
  {
    id: 2,
    name: '陈雨薇',
    role: '设计总监',
    bio: '前 4A 艺术指导',
    gradient: 'linear-gradient(135deg,#9b8cff,#5d3ff0)',
  },
  {
    id: 3,
    name: '王浩然',
    role: 'AI 技术负责人',
    bio: '扩散模型研究者',
    gradient: 'linear-gradient(135deg,#7cd0c4,#2a6a5e)',
  },
  {
    id: 4,
    name: '张思远',
    role: '产品负责人',
    bio: '用户体验极客',
    gradient: 'linear-gradient(135deg,#ffc24b,#f5a623)',
  },
];

export const tools = [
  {
    id: 't1',
    name: 'AI 抠图',
    desc: '一键去除背景，发丝级精度',
    icon: 'scissors',
    badge: '热门',
  },
  {
    id: 't2',
    name: '图片放大',
    desc: '无损放大至 8K',
    icon: 'zoomIn',
    badge: '',
  },
  {
    id: 't3',
    name: '色彩提取',
    desc: '从图片中提取品牌色板',
    icon: 'palette',
    badge: '新',
  },
  {
    id: 't4',
    name: '字体识别',
    desc: '识别图片中的中英文字体',
    icon: 'type',
    badge: '',
  },
  {
    id: 't5',
    name: '老照片修复',
    desc: 'AI 修复模糊老照片',
    icon: 'wand2',
    badge: '',
  },
  {
    id: 't6',
    name: '尺寸批量调整',
    desc: '一键适配各平台尺寸',
    icon: 'crop',
    badge: '',
  },
  {
    id: 't7',
    name: '文案润色',
    desc: 'AI 改写营销文案',
    icon: 'penLine',
    badge: '',
  },
  {
    id: 't8',
    name: '排版检查',
    desc: '自动检测版式与出血问题',
    icon: 'layoutGrid',
    badge: '新',
  },
  {
    id: 't9',
    name: '色盲模拟',
    desc: '检查设计在色盲视图下的效果',
    icon: 'eye',
    badge: '',
  },
];

export const labs = [
  {
    id: 'l1',
    name: 'AI 视频生成',
    status: '内测中',
    desc: '文本直接生成品牌宣传短视频',
    progress: 85,
  },
  {
    id: 'l2',
    name: '3D 门头模拟',
    status: '公测',
    desc: '上传街景照片，实时预览门头效果',
    progress: 100,
  },
  {
    id: 'l3',
    name: '品牌人格分析',
    status: '开发中',
    desc: 'AI 深度剖析品牌基因与调性',
    progress: 45,
  },
  {
    id: 'l4',
    name: 'AI 字体生成',
    status: '构思中',
    desc: '为品牌定制专属字体',
    progress: 20,
  },
];

export interface V2Conversation {
  id: string;
  title: string;
  time: string;
  type: string;
  active: boolean;
  preview: string;
}

export const conversations: V2Conversation[] = [
  {
    id: 'c1',
    title: '80x180cm 旅游海报',
    time: '2 分钟前',
    type: 'image',
    active: true,
    preview: '普者黑旅游海报 · 竖版',
  },
  {
    id: 'c2',
    title: '奶茶店开业海报',
    time: '1 小时前',
    type: 'image',
    active: false,
    preview: '新中式风格 · A2',
  },
  {
    id: 'c3',
    title: 'Logo 设计提案',
    time: '昨天',
    type: 'image',
    active: false,
    preview: '咖啡品牌 · 12 提案',
  },
  {
    id: 'c4',
    title: '门头店招方案',
    time: '昨天',
    type: 'image',
    active: false,
    preview: '社区便利店 · 3D',
  },
  {
    id: 'c5',
    title: '品牌 VI 手册',
    time: '3 天前',
    type: 'doc',
    active: false,
    preview: '初创科技公司',
  },
  {
    id: 'c6',
    title: '社媒九宫格',
    time: '4 天前',
    type: 'image',
    active: false,
    preview: '小红书 · 甜品店',
  },
];

export const chatMessages = [
  {
    id: 'm1',
    role: 'user',
    content: '帮我生成一张 80×180cm 普者黑旅行海报，包含主要景点和推荐线路。',
  },
  {
    id: 'm2',
    role: 'ai',
    content:
      '好的！我已根据"普者黑 · 山水秘境"主题生成了竖版海报方案：\n\n· 主视觉：清晨薄雾中的湖山剪影\n· 配色：晨雾青 + 日出橙的渐变\n· 版式：景点导览 + 三天两夜推荐路线\n· 尺寸：80×180cm（印刷安全边距已预留）',
    image: 'poster',
    actions: ['再生成一版', '调整配色', '加入文字'],
  },
];

export const notifications = [
  {
    id: 'n1',
    title: '生成完成',
    desc: '你的"普者黑旅游海报"已生成完毕',
    time: '2 分钟前',
    unread: true,
    type: 'success',
  },
  {
    id: 'n2',
    title: '积分到账',
    desc: '本月专业版 2,000 积分已发放',
    time: '1 小时前',
    unread: true,
    type: 'credit',
  },
  {
    id: 'n3',
    title: '新功能上线',
    desc: 'AI 视频生成已进入内测，点击查看',
    time: '昨天',
    unread: false,
    type: 'feature',
  },
];

export const orders = [
  {
    id: 'ORD-20260801',
    name: '专业版 · 月付',
    amount: 99,
    status: '已支付',
    date: '2026-08-01',
    type: '订阅',
  },
  {
    id: 'ORD-20260720',
    name: '品牌全案设计',
    amount: 9999,
    status: '服务中',
    date: '2026-07-20',
    type: '设计',
  },
  {
    id: 'ORD-20260705',
    name: '积分充值 · 1000',
    amount: 50,
    status: '已支付',
    date: '2026-07-05',
    type: '充值',
  },
  {
    id: 'ORD-20260628',
    name: '单次海报设计',
    amount: 199,
    status: '已完成',
    date: '2026-06-28',
    type: '设计',
  },
];

export const favorites = [
  {
    id: 'f1',
    name: '山野菜篮子门头',
    type: '模板',
    gradient: 'linear-gradient(135deg,#ff9d76,#e85320)',
  },
  {
    id: 'f2',
    name: '夏季音乐节主视觉',
    type: '案例',
    gradient: 'linear-gradient(135deg,#ff6b35,#ffc24b)',
  },
  {
    id: 'f3',
    name: 'DM 传单 · A5',
    type: '模板',
    gradient: 'linear-gradient(135deg,#6ca2f0,#3d7bd9)',
  },
  {
    id: 'f4',
    name: '草本护肤 Logo',
    type: '案例',
    gradient: 'linear-gradient(135deg,#86aca1,#3a6659)',
  },
];

// 用户 token 数据库（mock 认证）
const userTokens = new Map<string, { createdAt: number; userId: number }>();

export function createToken(userId: number): string {
  const token = `mock-token-${userId}-${Date.now()}`;
  userTokens.set(token, { userId, createdAt: Date.now() });
  return token;
}

export function getUserByToken(token: string): null | { id: number } {
  const entry = userTokens.get(token);
  if (!entry) return null;
  return { id: entry.userId };
}

export function defaultUser(id: number, email: string, name: string) {
  return {
    id,
    name: name || email.split('@')[0] || '用户',
    email,
    credits: id === 1 ? 6970 : 50,
    balance: id === 1 ? 68.7 : 0,
    level: id === 1 ? '专业版' : '体验版',
    avatar: (name || email || 'U')[0]?.toUpperCase() || 'U',
    joinDate: '2026-08-11',
  };
}

// 演示模式 mock 文本（无 API key 时回退）
export function mockTextResult(model: string, prompt: string): string {
  const brief = String(prompt || '').slice(0, 40);
  const t = Math.round(600 + Math.random() * 1200);
  const cost = (Math.random() * 1.5 + 0.5).toFixed(2);
  return [
    `【演示回复 · ${model}】`,
    `收到你的描述：「${brief}…」`,
    '',
    '—— 方案要点 ——',
    '1. 整体风格：暖色调 · 现代简约 · 突出品牌主视觉',
    '2. 色彩体系：主色 #ff6b35（珊瑚橘）+ 辅色 #14b8a6（墨青），对比度符合 WCAG AA',
    '3. 文案方向：突出「现做现卖」的信任感，副标题聚焦单一卖点',
    '4. 构图建议：门头采用「大字主标 + 横排副标 + 侧边装饰元素」三段式布局',
    '',
    '（配置 GPTEAM_API_KEY 后接入真实 DeepSeek / GPT 模型）',
    `· 模拟耗时 ${(t / 1000).toFixed(1)}s · 预估 ${cost} 积分`,
  ].join('\n');
}
