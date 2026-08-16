/* Admin 数据接口（AdminDemo 演示版）：全部返回本地模拟数据，不调用真实服务器。
   统一响应信封 { code: 0, data }；mutation 仅需 { code: 0 }。 */

function ok(data) {
  return { code: 0, data }
}
function okMsg(message = '模拟成功') {
  return { code: 0, message }
}

/* ---------- 模拟数据（每个列表 1-2 条）---------- */
const PROVIDERS = [
  {
    id: 'p_openai',
    name: 'OpenAI',
    type: 'openai',
    base_url: 'https://api.openai.com/v1',
    priority: 100,
    weight: 1,
    timeout_sec: 60,
    enabled: true,
    description: '官方 GPT / DALL·E 供应商',
    api_key: 'sk-mock****1234',
    extra: { org: 'org-demo' },
  },
  {
    id: 'p_gpteam',
    name: 'GPTeam',
    type: 'gpteam',
    base_url: 'https://api.gpteamservices.com/v1',
    priority: 90,
    weight: 1,
    timeout_sec: 45,
    enabled: true,
    description: '聚合供应商（演示）',
    api_key: 'gpt-mock****abcd',
    extra: {},
  },
]

const MODELS = [
  {
    id: 'm_gpt4o',
    provider_id: 'p_openai',
    model_type: 'text',
    enabled: true,
    alias: 'GPT-4o',
    upstream_id: 'gpt-4o',
    capabilities: ['chat', 'vision'],
    sizes: [],
    aspects: [],
    quality_options: [],
    price: 0.01,
    return_format: 'url',
    param_config: {},
  },
  {
    id: 'm_dalle3',
    provider_id: 'p_openai',
    model_type: 'image',
    enabled: true,
    alias: 'DALL·E 3',
    upstream_id: 'dall-e-3',
    capabilities: ['image'],
    sizes: ['1024x1024', '1792x1024'],
    aspects: ['1:1', '3:2'],
    quality_options: ['standard', 'hd'],
    price: 0.04,
    return_format: 'url',
    param_config: {},
  },
]

const USERS = [
  { id: 'u_1001', name: '王小美', email: 'xiaomei@demo.com', credits: 1280, role: 'user', status: 'active', createdAt: '2026-07-12T09:24:00' },
  { id: 'u_1002', name: '陈大文', email: 'dawen@demo.com', credits: 360, role: 'admin', status: 'active', createdAt: '2026-07-20T14:05:00' },
]

const ORDERS = [
  { id: 'ORD-20260801', customer: '王小美', name: '专业版月付', amount: 99, pay_method: '微信', createdAt: '2026-08-01T10:00:00', status: 'paid' },
  { id: 'ORD-20260805', customer: '陈大文', name: '团队版年付', amount: 999, pay_method: '支付宝', createdAt: '2026-08-05T16:30:00', status: 'pending' },
]

const CREDITS = {
  plans: [
    { id: 'plan_free', name: '免费版', price: null, desc: '新用户赠送额度', credits: 50 },
    { id: 'plan_pro', name: '专业版', price: 99, desc: '每月 2000 积分', credits: 2000 },
  ],
  tiers: [
    { label: '入门', rate: 0.8, desc: '低频调用' },
    { label: '商业', rate: 1.0, desc: '标准费率' },
  ],
  logs: [
    { id: 'cl_1', user: '王小美', type: 'consume', amount: -12, scene: '文生图', time: '2026-08-10 11:20' },
    { id: 'cl_2', user: '陈大文', type: 'recharge', amount: 2000, scene: '套餐充值', time: '2026-08-09 20:05' },
  ],
}

const DASHBOARD = {
  stats: [
    { key: 'revenue', icon: 'yuan', up: true, label: '本月营收', value: '¥ 12,480', trend: '+12.4%' },
    { key: 'orders', icon: 'orders', up: true, label: '订单数', value: '328', trend: '+5.1%' },
    { key: 'users', icon: 'users', up: true, label: '活跃用户', value: '1,204', trend: '+8.7%' },
    { key: 'gen', icon: 'gen', up: false, label: '生图次数', value: '9,650', trend: '-2.3%' },
    { key: 'profit', icon: 'profit', up: true, label: '毛利', value: '¥ 7,210', trend: '+9.0%' },
    { key: 'cost', icon: 'cost', up: true, label: '成本', value: '¥ 5,270', trend: '+3.2%' },
  ],
  revenueTrend: [
    { label: '周一', revenue: 1800, cost: 760 },
    { label: '周二', revenue: 2100, cost: 880 },
  ],
  modelUsage: [
    { model: 'GPT-4o', calls: 4200 },
    { model: 'DALL·E 3', calls: 2100 },
  ],
}

const USAGE = {
  stats: [
    { label: '总调用', value: '9,650', note: '近 30 天' },
    { label: '总 Token', value: '1.2B', note: '含输入输出' },
    { label: '平均成本', value: '¥ 0.55', note: '每次调用' },
  ],
  usage: [
    { model: 'GPT-4o 文本', calls: 4200, tokens: '820M' },
    { model: 'DALL·E 3 图像', calls: 2100, tokens: '12M' },
  ],
}

const SKILLS = [
  { id: 'sk_poster', name: '海报生成', description: '一键生成营销海报', capabilities: ['image', 'layout'], enabled: true },
  { id: 'sk_logo', name: 'Logo 设计', description: '根据品牌词生成 Logo', capabilities: ['image'], enabled: false },
]

const AUDIT_LIST = [
  { id: 'au_1', risk: 'high', status: 'pending', content: '用户提交了一段包含敏感词的评论…', user: 'u_1003', type: '评论', time: '2026-08-12 09:12' },
  { id: 'au_2', risk: 'medium', status: 'reviewing', content: 'AI 生成的图片疑似含品牌水印…', user: 'u_1004', type: '图片', time: '2026-08-12 10:40' },
]

const RECORDS = [
  {
    id: 'rec_1',
    session_id: 'sess_01',
    conversation_title: '奶茶店开业海报',
    model_name: 'DALL·E 3',
    original_prompt: '帮我做一张奶茶店开业促销海报',
    user_id: 'u_1001',
    success: true,
    cost_credits: 40,
    duration_ms: 4200,
    created_at: '2026-08-11T15:20:00',
  },
  {
    id: 'rec_2',
    session_id: 'sess_02',
    conversation_title: '品牌 LOGO 构思',
    model_name: 'GPT-4o',
    original_prompt: '为咖啡品牌想一个极简 logo',
    user_id: 'u_1002',
    success: false,
    cost_credits: 10,
    duration_ms: 1200,
    created_at: '2026-08-10T11:05:00',
  },
]

const RECORD_DETAIL = {
  id: 'rec_1',
  conversation_title: '奶茶店开业海报',
  success: true,
  model_name: 'DALL·E 3',
  duration_ms: 4200,
  cost_credits: 40,
  prompt_tokens: 38,
  completion_tokens: 0,
  session_id: 'sess_01',
  created_at: '2026-08-11T15:20:00',
  error: null,
  request_params: {
    __meta: {
      base_url: 'https://api.openai.com/v1',
      url: '/images/generations',
      method: 'POST',
      upstream_model: 'dall-e-3',
      model_alias: 'DALL·E 3',
      headers: { Authorization: 'Bearer sk-***' },
    },
  },
  response_json: { created: 1754000000, data: [{ url: 'https://demo.hey19.xin/mock/rec1.png' }] },
  original_prompt: '帮我做一张奶茶店开业促销海报',
  response_text: null,
  response_images: [{ saved_path: 'https://demo.hey19.xin/mock/rec1.png', url: 'https://demo.hey19.xin/mock/rec1.png' }],
}

const SETTINGS = {
  site: { name: 'Hey 19', slogan: '让创意更高效', contact: 'support@hey19.xin' },
  security: { loginLimit: 5, smsVerify: true, auditContent: true },
  billing: { taxRate: 6, invoicePrefix: 'HEY', autoRenew: true },
  ai: { defaultModel: 'GPT-4o', imageSize: '1024x1024', concurrent: 4 },
}

/* ---------- 模拟请求分发 ---------- */
export async function request(url, options = {}) {
  const { method = 'GET' } = options
  const u = url.split('?')[0]

  // 审核队列：/api/records?limit=200
  if (url.includes('/api/records?limit=200') || (u === '/api/records' && url.includes('limit=200'))) {
    return ok({ list: AUDIT_LIST })
  }
  // 调用记录列表：/api/records?page=...&pageSize=500
  if (url.includes('pageSize=500')) {
    return ok({ list: RECORDS, total: RECORDS.length })
  }
  // 调用记录详情
  if (u.startsWith('/api/records/')) {
    return ok(RECORD_DETAIL)
  }

  // 供应商 / 模型
  if (u === '/api/provider' && method === 'GET') return ok({ list: PROVIDERS })
  if (u === '/api/provider/models' && method === 'GET') return ok({ list: MODELS })
  if (u === '/api/provider/sync') return okMsg('已同步（模拟）')
  if (u.startsWith('/api/provider/models/')) return okMsg('模型已更新（模拟）')
  if (u.startsWith('/api/provider')) {
    if (method === 'DELETE') return okMsg('已删除供应商（模拟）')
    return okMsg('已保存供应商（模拟）')
  }

  // 技能
  if (u === '/api/admin/skills' && method === 'GET') return ok({ list: SKILLS })
  if (u.startsWith('/api/admin/skills')) return okMsg('技能已更新（模拟）')

  return ok({})
}

export const api = {
  dashboard: () => ok(DASHBOARD),
  users: () => ok({ list: USERS }),
  userAction: () => okMsg('操作成功（模拟）'),
  orders: () => ok({ list: ORDERS }),
  credits: () => ok(CREDITS),
  models: () => ok({ list: MODELS }),
  usage: () => ok(USAGE),
  audit: () => ok({ list: AUDIT_LIST }),
  settings: () => ok(SETTINGS),
}
