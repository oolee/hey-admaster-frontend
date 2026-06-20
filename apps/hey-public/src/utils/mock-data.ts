// ============================================================
// Mock Data - 模拟数据常量
// ============================================================

export interface PortfolioItem {
  id: number
  title: string
  category: 'brand' | 'ai-design' | 'video' | 'digital'
  description: string
  imageUrl: string
  tags: string[]
  client: string
  year: number
}

export interface PricingPackage {
  id: string
  name: string
  price: number
  currency: string
  description: string
  features: string[]
  highlighted: boolean
}

export interface Order {
  id: string
  packageId: string
  requirements: string
  contactName: string
  contactEmail: string
  contactPhone: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  createdAt: string
}

/**
 * 1x1 像素蓝色 PNG 图片的 base64 编码
 * 用于在没有配置 OPENAI_API_KEY 时作为模拟返回数据
 */
export const MOCK_BASE64_IMAGE =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

/**
 * 模拟作品集数据 - 8 个条目
 */
export const mockPortfolioItems: PortfolioItem[] = [
  {
    id: 1,
    title: '星辰科技品牌全案',
    category: 'brand',
    description: '为星辰科技打造全新品牌视觉体系，涵盖 Logo 设计、VI 规范、品牌手册及官网视觉升级。',
    imageUrl: 'https://picsum.photos/seed/1/800/600',
    tags: ['品牌设计', 'VI系统', 'Logo设计'],
    client: '星辰科技有限公司',
    year: 2025,
  },
  {
    id: 2,
    title: '智能护肤海报系列',
    category: 'ai-design',
    description: '利用 AI 图像生成技术，为某护肤品牌制作春夏新品上市系列海报及社交媒体素材。',
    imageUrl: 'https://picsum.photos/seed/2/800/600',
    tags: ['AI设计', '海报', '美妆'],
    client: '韵芙兰护肤',
    year: 2025,
  },
  {
    id: 3,
    title: '极光游戏宣传片',
    category: 'video',
    description: '为极光游戏新作《星域》制作 3 分钟 CGI 宣传片，包含角色动画与场景渲染。',
    imageUrl: 'https://picsum.photos/seed/3/800/600',
    tags: ['视频制作', 'CGI', '游戏'],
    client: '极光互动娱乐',
    year: 2024,
  },
  {
    id: 4,
    title: '智慧零售数字大屏',
    category: 'digital',
    description: '为连锁零售品牌设计数据可视化大屏，实时展示门店运营数据与客流分析。',
    imageUrl: 'https://picsum.photos/seed/4/800/600',
    tags: ['数据可视化', '大屏', '零售'],
    client: '万客隆商业集团',
    year: 2025,
  },
  {
    id: 5,
    title: '云栖茶语品牌重塑',
    category: 'brand',
    description: '传统茶品牌年轻化升级，从包装设计到线上线下全渠道视觉统一。',
    imageUrl: 'https://picsum.photos/seed/5/800/600',
    tags: ['品牌升级', '包装设计', '茶文化'],
    client: '云栖茶语文化有限公司',
    year: 2024,
  },
  {
    id: 6,
    title: 'AI 城市未来概念图',
    category: 'ai-design',
    description: '通过 AI 生成未来城市概念艺术图集，用于地产项目前期概念展示与营销。',
    imageUrl: 'https://picsum.photos/seed/6/800/600',
    tags: ['AI艺术', '概念设计', '地产'],
    client: '碧云置业集团',
    year: 2025,
  },
  {
    id: 7,
    title: '创想教育 MG 动画',
    category: 'video',
    description: '为创想教育制作系列 MG 动画课程视频，涵盖数学、科学等学科内容。',
    imageUrl: 'https://picsum.photos/seed/7/800/600',
    tags: ['MG动画', '教育', '课程'],
    client: '创想在线教育',
    year: 2025,
  },
  {
    id: 8,
    title: '鲜达生鲜小程序设计',
    category: 'digital',
    description: '为生鲜 O2O 平台设计小程序全套 UI/UX，提升用户下单转化率。',
    imageUrl: 'https://picsum.photos/seed/8/800/600',
    tags: ['UI/UX', '小程序', '生鲜电商'],
    client: '鲜达网络科技',
    year: 2024,
  },
]

/**
 * 模拟定价套餐数据 - 3 个套餐
 */
export const mockPricingPackages: PricingPackage[] = [
  {
    id: 'starter',
    name: '入门版',
    price: 299,
    currency: 'CNY',
    description: '适合个人创作者及小型项目的入门级 AI 设计服务。',
    features: [
      '每月 20 次 AI 图像生成',
      '基础模板库访问',
      '标准分辨率输出',
      '邮件技术支持',
      '1 个品牌项目空间',
    ],
    highlighted: false,
  },
  {
    id: 'professional',
    name: '专业版',
    price: 999,
    currency: 'CNY',
    description: '面向专业设计师和中型团队的全功能 AI 设计平台。推荐选择。',
    features: [
      '每月 200 次 AI 图像生成',
      '全量模板库与高级素材',
      '高清及超高清分辨率输出',
      '优先技术支持（4 小时内响应）',
      '10 个品牌项目空间',
      'API 接口访问',
      '团队协作功能',
      '去水印输出',
    ],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: 4999,
    currency: 'CNY',
    description: '为大型企业和代理机构提供的定制化 AI 设计解决方案。',
    features: [
      '无限次 AI 图像生成',
      '全套模板、素材及自定义模型训练',
      '8K 超高清输出',
      '专属客户经理 7x24 支持',
      '无限品牌项目空间',
      '全功能 API 与 SDK 集成',
      '高级团队管理与权限控制',
      '去水印输出',
      '私有化部署选项',
      '定制化功能开发',
    ],
    highlighted: false,
  },
]

/**
 * 模拟订单数据
 */
export const mockOrders: Order[] = [
  {
    id: 'ORD-20250601-001',
    packageId: 'professional',
    requirements: '需要制作一套品牌 VI 手册，包含 Logo、名片、信纸等。',
    contactName: '张明',
    contactEmail: 'zhangming@example.com',
    contactPhone: '13800138001',
    status: 'pending',
    createdAt: '2025-06-01T10:30:00Z',
  },
  {
    id: 'ORD-20250602-002',
    packageId: 'starter',
    requirements: '制作 3 张社交媒体海报用于新品推广。',
    contactName: '李华',
    contactEmail: 'lihua@example.com',
    contactPhone: '13800138002',
    status: 'processing',
    createdAt: '2025-06-02T14:20:00Z',
  },
  {
    id: 'ORD-20250603-003',
    packageId: 'enterprise',
    requirements: '全年品牌设计外包服务，包含月度营销物料及季度品牌审计。',
    contactName: '王芳',
    contactEmail: 'wangfang@example.com',
    contactPhone: '13800138003',
    status: 'processing',
    createdAt: '2025-06-03T09:15:00Z',
  },
]