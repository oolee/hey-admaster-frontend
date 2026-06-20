export interface FontItem {
  name: string;
  family: string;
  type: 'system' | 'google' | 'user';
  provider?: string;
  license?: string;
  uploadedAt?: number;
  url?: string;
}

export const defaultFreeFonts: FontItem[] = [
  { name: '思源黑体', family: 'Noto Sans SC', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: '思源宋体', family: 'Noto Serif SC', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: '站酷文艺体', family: 'ZCOOL XiaoWei', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: '站酷快乐体', family: 'ZCOOL KuaiLe', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: '思源柔黑体', family: 'M PLUS Rounded 1c', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: '楷体 (系统)', family: 'KaiTi', type: 'system', provider: '系统自带字体', license: '随系统授权' },
  { name: '宋体 (系统)', family: 'SimSun', type: 'system', provider: '系统自带字体', license: '随系统授权' },
  { name: '微软雅黑 (系统)', family: 'Microsoft YaHei', type: 'system', provider: '系统自带字体', license: '随系统授权' },
  { name: 'PingFang (系统)', family: 'PingFang SC', type: 'system', provider: '系统自带字体', license: '随系统授权' },
  { name: 'Segoe UI (系统)', family: 'Segoe UI', type: 'system', provider: '系统自带字体', license: '随系统授权' },
  { name: 'Roboto', family: 'Roboto', type: 'google', provider: 'Google Fonts (Apache License 2.0)', license: '免费商用' },
  { name: 'Lato', family: 'Lato', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: 'Poppins', family: 'Poppins', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: 'Open Sans', family: 'Open Sans', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
  { name: 'Montserrat', family: 'Montserrat', type: 'google', provider: 'Google Fonts (SIL Open Font License)', license: '免费商用' },
];
