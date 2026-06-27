export interface PrintSpec {
  bleedMm: number;
  dpi: number;
  heightMm: number;
  name: string;
  safeAreaMm: number;
  widthMm: number;
}

export const defaultPrintSpecs: PrintSpec[] = [
  {
    name: 'A4 海报',
    widthMm: 210,
    heightMm: 297,
    dpi: 300,
    bleedMm: 3,
    safeAreaMm: 5,
  },
  {
    name: '方形卡片',
    widthMm: 100,
    heightMm: 100,
    dpi: 300,
    bleedMm: 2,
    safeAreaMm: 4,
  },
];
