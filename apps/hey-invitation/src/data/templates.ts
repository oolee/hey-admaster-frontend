// 婚礼请柬内置模板
export interface TemplatePage {
  name: string;
  backgroundColor: string;
  elements: Array<{
    type: string;
    subType?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    textColor?: string;
    textAlign?: string;
    decorationColor?: string;
    decorationSize?: number;
    [key: string]: any;
  }>;
}

export interface Template {
  id: string;
  name: string;
  preview: string;
  pages: TemplatePage[];
}

export const builtinTemplates: Template[] = [
  {
    id: 'builtin-001',
    name: '浪漫粉金',
    preview: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    pages: [
      {
        name: '封面',
        backgroundColor: 'linear-gradient(135deg, #ffe4e6 0%, #fce7f3 100%)',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 180, width: 200, height: 50, zIndex: 10, text: '我们结婚啦', fontFamily: 'STXingkai', fontSize: 32, fontWeight: 'bold', textColor: '#d63384', textAlign: 'center' },
          { type: 'text', subType: 'couple', x: 60, y: 240, width: 200, height: 40, zIndex: 11, text: '新郎 & 新娘', fontFamily: 'Microsoft YaHei', fontSize: 18, fontWeight: 'bold', textColor: '#e83e8c', textAlign: 'center' },
          { type: 'text', subType: 'date', x: 60, y: 290, width: 200, height: 30, zIndex: 12, text: '2026年6月14日', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#6c757d', textAlign: 'center' },
          { type: 'decoration', subType: 'heart', x: 128, y: 100, width: 64, height: 64, zIndex: 5, decorationColor: '#d63384', decorationSize: 40 },
          { type: 'decoration', subType: 'flower', x: 20, y: 400, width: 48, height: 48, zIndex: 5, decorationColor: '#f8a5c2', decorationSize: 24 },
          { type: 'decoration', subType: 'flower', x: 252, y: 400, width: 48, height: 48, zIndex: 5, decorationColor: '#f8a5c2', decorationSize: 24 },
        ],
      },
      {
        name: '详情',
        backgroundColor: '#ffffff',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 40, width: 200, height: 40, zIndex: 10, text: '婚礼详情', fontFamily: 'STXingkai', fontSize: 24, fontWeight: 'bold', textColor: '#d63384', textAlign: 'center' },
          { type: 'text', subType: 'body', x: 40, y: 120, width: 240, height: 80, zIndex: 11, text: '时间：2026年6月14日 12:00\n地点：XX酒店宴会厅\n期待您的光临', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#495057', textAlign: 'center' },
          { type: 'decoration', subType: 'ring', x: 128, y: 260, width: 64, height: 64, zIndex: 5, decorationColor: '#ffd93d', decorationSize: 40 },
        ],
      },
    ],
  },
  {
    id: 'builtin-002',
    name: '简约白绿',
    preview: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)',
    pages: [
      {
        name: '封面',
        backgroundColor: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 180, width: 200, height: 50, zIndex: 10, text: 'Save the Date', fontFamily: 'Georgia', fontSize: 28, fontWeight: 'bold', textColor: '#2e7d32', textAlign: 'center' },
          { type: 'text', subType: 'couple', x: 60, y: 240, width: 200, height: 40, zIndex: 11, text: '新郎 & 新娘', fontFamily: 'Microsoft YaHei', fontSize: 18, fontWeight: 'bold', textColor: '#388e3c', textAlign: 'center' },
          { type: 'text', subType: 'date', x: 60, y: 290, width: 200, height: 30, zIndex: 12, text: '2026年6月14日', fontFamily: 'Georgia', fontSize: 14, textColor: '#558b2f', textAlign: 'center' },
          { type: 'decoration', subType: 'flower', x: 128, y: 80, width: 64, height: 64, zIndex: 5, decorationColor: '#66bb6a', decorationSize: 40 },
          { type: 'decoration', subType: 'leaf', x: 30, y: 380, width: 48, height: 48, zIndex: 5, decorationColor: '#81c784', decorationSize: 24 },
          { type: 'decoration', subType: 'leaf', x: 242, y: 380, width: 48, height: 48, zIndex: 5, decorationColor: '#81c784', decorationSize: 24 },
        ],
      },
      {
        name: '详情',
        backgroundColor: '#ffffff',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 40, width: 200, height: 40, zIndex: 10, text: '婚礼详情', fontFamily: 'Georgia', fontSize: 22, fontWeight: 'bold', textColor: '#2e7d32', textAlign: 'center' },
          { type: 'text', subType: 'body', x: 40, y: 120, width: 240, height: 80, zIndex: 11, text: '日期：2026年6月14日\n时间：12:00\n地点：XX花园酒店', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#495057', textAlign: 'center' },
          { type: 'decoration', subType: 'flower', x: 128, y: 260, width: 64, height: 64, zIndex: 5, decorationColor: '#a5d6a7', decorationSize: 36 },
        ],
      },
    ],
  },
  {
    id: 'builtin-003',
    name: '经典红金',
    preview: 'linear-gradient(135deg, #d4a574 0%, #c0392b 100%)',
    pages: [
      {
        name: '封面',
        backgroundColor: 'linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%)',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 160, width: 200, height: 50, zIndex: 10, text: '囍', fontFamily: 'STXingkai', fontSize: 48, fontWeight: 'bold', textColor: '#c0392b', textAlign: 'center' },
          { type: 'text', subType: 'couple', x: 60, y: 230, width: 200, height: 40, zIndex: 11, text: '新郎 & 新娘', fontFamily: 'STXingkai', fontSize: 20, fontWeight: 'bold', textColor: '#c0392b', textAlign: 'center' },
          { type: 'text', subType: 'date', x: 60, y: 280, width: 200, height: 30, zIndex: 12, text: '2026年6月14日', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#8b4513', textAlign: 'center' },
          { type: 'border', subType: 'solid', x: 20, y: 20, width: 280, height: 588, zIndex: 1, borderColor: '#c0392b', borderWidth: 4, borderStyle: 'solid' },
          { type: 'decoration', subType: 'heart', x: 128, y: 380, width: 64, height: 64, zIndex: 5, decorationColor: '#c0392b', decorationSize: 36 },
        ],
      },
      {
        name: '详情',
        backgroundColor: '#fef5e7',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 40, width: 200, height: 40, zIndex: 10, text: '婚礼详情', fontFamily: 'STXingkai', fontSize: 24, fontWeight: 'bold', textColor: '#c0392b', textAlign: 'center' },
          { type: 'text', subType: 'body', x: 40, y: 120, width: 240, height: 80, zIndex: 11, text: '时间：2026年6月14日 12:00\n地点：XX大酒店宴会厅\n恭候光临', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#8b4513', textAlign: 'center' },
          { type: 'border', subType: 'solid', x: 20, y: 20, width: 280, height: 588, zIndex: 1, borderColor: '#c0392b', borderWidth: 2, borderStyle: 'solid' },
        ],
      },
    ],
  },
  {
    id: 'builtin-004',
    name: '梦幻紫蓝',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    pages: [
      {
        name: '封面',
        backgroundColor: 'linear-gradient(135deg, #e8eaf6 0%, #ede7f6 100%)',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 180, width: 200, height: 50, zIndex: 10, text: '我们结婚啦', fontFamily: 'Microsoft YaHei', fontSize: 28, fontWeight: 'bold', textColor: '#5e35b1', textAlign: 'center' },
          { type: 'text', subType: 'couple', x: 60, y: 240, width: 200, height: 40, zIndex: 11, text: '新郎 & 新娘', fontFamily: 'Microsoft YaHei', fontSize: 18, fontWeight: 'bold', textColor: '#7c4dff', textAlign: 'center' },
          { type: 'text', subType: 'date', x: 60, y: 290, width: 200, height: 30, zIndex: 12, text: '2026年6月14日', fontFamily: 'Georgia', fontSize: 14, textColor: '#7e57c2', textAlign: 'center' },
          { type: 'decoration', subType: 'star', x: 128, y: 90, width: 64, height: 64, zIndex: 5, decorationColor: '#7c4dff', decorationSize: 40 },
          { type: 'decoration', subType: 'star', x: 40, y: 400, width: 32, height: 32, zIndex: 5, decorationColor: '#b39ddb', decorationSize: 16 },
          { type: 'decoration', subType: 'star', x: 250, y: 420, width: 32, height: 32, zIndex: 5, decorationColor: '#b39ddb', decorationSize: 16 },
        ],
      },
      {
        name: '详情',
        backgroundColor: '#ffffff',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 40, width: 200, height: 40, zIndex: 10, text: '婚礼详情', fontFamily: 'Microsoft YaHei', fontSize: 22, fontWeight: 'bold', textColor: '#5e35b1', textAlign: 'center' },
          { type: 'text', subType: 'body', x: 40, y: 120, width: 240, height: 80, zIndex: 11, text: '日期：2026年6月14日\n地点：XX星空酒店\n期待您的到来', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#495057', textAlign: 'center' },
          { type: 'decoration', subType: 'star', x: 128, y: 260, width: 48, height: 48, zIndex: 5, decorationColor: '#7c4dff', decorationSize: 28 },
        ],
      },
    ],
  },
  {
    id: 'builtin-005',
    name: '大地暖棕',
    preview: 'linear-gradient(135deg, #c9a96e 0%, #8d6e63 100%)',
    pages: [
      {
        name: '封面',
        backgroundColor: 'linear-gradient(135deg, #efebe9 0%, #faf3e0 100%)',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 180, width: 200, height: 50, zIndex: 10, text: '我们结婚啦', fontFamily: 'STXingkai', fontSize: 30, fontWeight: 'bold', textColor: '#6d4c41', textAlign: 'center' },
          { type: 'text', subType: 'couple', x: 60, y: 240, width: 200, height: 40, zIndex: 11, text: '新郎 & 新娘', fontFamily: 'Microsoft YaHei', fontSize: 18, fontWeight: 'bold', textColor: '#8d6e63', textAlign: 'center' },
          { type: 'text', subType: 'date', x: 60, y: 290, width: 200, height: 30, zIndex: 12, text: '2026年6月14日', fontFamily: 'Georgia', fontSize: 14, textColor: '#a1887f', textAlign: 'center' },
          { type: 'decoration', subType: 'ring', x: 128, y: 100, width: 64, height: 64, zIndex: 5, decorationColor: '#8d6e63', decorationSize: 40 },
          { type: 'decoration', subType: 'leaf', x: 30, y: 400, width: 48, height: 48, zIndex: 5, decorationColor: '#a1887f', decorationSize: 24 },
          { type: 'decoration', subType: 'leaf', x: 242, y: 400, width: 48, height: 48, zIndex: 5, decorationColor: '#a1887f', decorationSize: 24 },
        ],
      },
      {
        name: '详情',
        backgroundColor: '#ffffff',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 40, width: 200, height: 40, zIndex: 10, text: '婚礼详情', fontFamily: 'STXingkai', fontSize: 24, fontWeight: 'bold', textColor: '#6d4c41', textAlign: 'center' },
          { type: 'text', subType: 'body', x: 40, y: 120, width: 240, height: 80, zIndex: 11, text: '日期：2026年6月14日\n地点：XX花园酒店\n恭候光临', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#495057', textAlign: 'center' },
          { type: 'decoration', subType: 'ring', x: 128, y: 260, width: 64, height: 64, zIndex: 5, decorationColor: '#8d6e63', decorationSize: 36 },
        ],
      },
    ],
  },
  {
    id: 'builtin-006',
    name: '水彩蓝粉',
    preview: 'linear-gradient(135deg, #89f7fe 0%, #f093fb 100%)',
    pages: [
      {
        name: '封面',
        backgroundColor: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 180, width: 200, height: 50, zIndex: 10, text: '我们结婚啦', fontFamily: 'Georgia', fontSize: 28, fontWeight: 'bold', textColor: '#1565c0', textAlign: 'center' },
          { type: 'text', subType: 'couple', x: 60, y: 240, width: 200, height: 40, zIndex: 11, text: '新郎 & 新娘', fontFamily: 'Microsoft YaHei', fontSize: 18, fontWeight: 'bold', textColor: '#e91e63', textAlign: 'center' },
          { type: 'text', subType: 'date', x: 60, y: 290, width: 200, height: 30, zIndex: 12, text: '2026年6月14日', fontFamily: 'Georgia', fontSize: 14, textColor: '#546e7a', textAlign: 'center' },
          { type: 'decoration', subType: 'heart', x: 128, y: 90, width: 64, height: 64, zIndex: 5, decorationColor: '#e91e63', decorationSize: 36 },
          { type: 'decoration', subType: 'flower', x: 30, y: 380, width: 48, height: 48, zIndex: 5, decorationColor: '#64b5f6', decorationSize: 24 },
          { type: 'decoration', subType: 'flower', x: 242, y: 380, width: 48, height: 48, zIndex: 5, decorationColor: '#f48fb1', decorationSize: 24 },
        ],
      },
      {
        name: '详情',
        backgroundColor: '#ffffff',
        elements: [
          { type: 'text', subType: 'title', x: 60, y: 40, width: 200, height: 40, zIndex: 10, text: '婚礼详情', fontFamily: 'Georgia', fontSize: 22, fontWeight: 'bold', textColor: '#1565c0', textAlign: 'center' },
          { type: 'text', subType: 'body', x: 40, y: 120, width: 240, height: 80, zIndex: 11, text: '日期：2026年6月14日\n地点：XX水岸酒店\n期待您的到来', fontFamily: 'Microsoft YaHei', fontSize: 14, textColor: '#495057', textAlign: 'center' },
          { type: 'decoration', subType: 'heart', x: 128, y: 260, width: 48, height: 48, zIndex: 5, decorationColor: '#e91e63', decorationSize: 28 },
        ],
      },
    ],
  },
];