// ===== Types =====
export interface ProjectColor {
  colorPrimary: string;
  colorSecondary: string;
  colorBorder: string;
  color1: string;
  color2: string;
  colorBg: string;
  colorHover: string;
}

export interface Project {
  id: number;
  number: string;
  slug: string;
  folder: string;
  seoTitle: string;
  title: { first: string; second: string };
  description: string;
  link: string;
  cover: { alt: string; image: string };
  colors: ProjectColor;
  meta: { agency: string; awards: string; role: string[]; year: number };
  gallery: { alt: string; image: string }[];
}

export const imagesPath = '/assets/images/projects';

// ===== Data =====
export const projectsData: Project[] = [
  {
    id: 0,
    number: '01',
    slug: 'airbag-studio',
    folder: 'airbag',
    seoTitle: 'Airbag Studio',
    title: { first: 'airbag', second: 'studio' },
    description:
      'Studio focusing on designing and developing advanced and intuitive mobile ecosystems.',
    link: 'https://www.19ad.xin',
    cover: { image: '01-project-airbag.jpg', alt: 'Airbag Studio' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '255,150,85',
      color2: '185,60,100',
      colorBg: '223,151,173',
      colorHover: '185,60,100',
    },
    meta: {
      role: ['full stack dev', 'motion'],
      agency: 'Overpx',
      year: 2023,
      awards: 'FWA of the day',
    },
    gallery: [
      { image: 'airbag-01.jpg', alt: 'Airbag 01' },
      { image: 'airbag-02.jpg', alt: 'Airbag 02' },
      { image: 'airbag-03.jpg', alt: 'Airbag 03' },
      { image: 'airbag-04.jpg', alt: 'Airbag 04' },
      { image: 'airbag-05.jpg', alt: 'Airbag 05' },
    ],
  },
  {
    id: 1,
    number: '02',
    slug: 'darko-bratina',
    folder: 'bratina',
    seoTitle: 'Darko Bratina',
    title: { first: 'darko', second: 'bratina' },
    description:
      'Darko Bratina as Sociologist, Cinephile and Politician. A journey discovering his life.',
    link: 'https://www.19ad.xin',
    cover: { image: '02-project-darko-2.jpg', alt: 'Darko Bratina' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '155,155,155',
      color2: '36,52,78',
      colorBg: '137,145,159',
      colorHover: '36,52,78',
    },
    meta: {
      role: ['front-end dev', 'motion'],
      agency: 'Overpx',
      year: 2020,
      awards: 'FWA of the day',
    },
    gallery: [
      { image: 'bratina-01.jpg', alt: 'Bratina 01' },
      { image: 'bratina-02.jpg', alt: 'Bratina 02' },
      { image: 'bratina-03.jpg', alt: 'Bratina 03' },
      { image: 'bratina-04.jpg', alt: 'Bratina 04' },
      { image: 'bratina-05.jpg', alt: 'Bratina 05' },
    ],
  },
  {
    id: 2,
    number: '03',
    slug: 'things-agency',
    folder: 'things',
    seoTitle: 'Things Agency',
    title: { first: 'things', second: 'agency' },
    description:
      'European design & innovation agency pioneering in IoT experience for humans.',
    link: 'https://www.19ad.xin',
    cover: { image: '03-project-things.jpg', alt: 'Things Agency' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '2,141,234',
      color2: '113,53,114',
      colorBg: '141,204,246',
      colorHover: '113,53,114',
    },
    meta: {
      role: ['full stack dev', 'motion'],
      agency: 'Things',
      year: 2025,
      awards: 'CSSDA of the day',
    },
    gallery: [
      { image: 'things-01.jpg', alt: 'Things 01' },
      { image: 'things-02.jpg', alt: 'Things 02' },
      { image: 'things-03.jpg', alt: 'Things 03' },
      { image: 'things-04.jpg', alt: 'Things 04' },
      { image: 'things-05.jpg', alt: 'Things 05' },
    ],
  },
  {
    id: 3,
    number: '04',
    slug: 'unisve-crafts',
    folder: 'unisve',
    seoTitle: 'Unisve Crafts',
    title: { first: 'unisve', second: 'crafts' },
    description:
      'Founded in 2001 to support and keep alive many traditional Venetian artisan techniques.',
    link: 'https://www.19ad.xin',
    cover: { image: '04-project-unisve-2.jpg', alt: 'Unisve' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '236,183,150',
      color2: '0,50,71',
      colorBg: '244,215,197',
      colorHover: '0,50,71',
    },
    meta: {
      role: ['front-end dev', 'motion'],
      agency: 'Overpx',
      year: 2021,
      awards: 'CSSDA of the day',
    },
    gallery: [
      { image: 'unisve-01.jpg', alt: 'Unisve 01' },
      { image: 'unisve-02.jpg', alt: 'Unisve 02' },
      { image: 'unisve-03.jpg', alt: 'Unisve 03' },
      { image: 'unisve-04.jpg', alt: 'Unisve 04' },
      { image: 'unisve-05.jpg', alt: 'Unisve 05' },
    ],
  },
  {
    id: 4,
    number: '05',
    slug: 'musical-hugs',
    folder: 'abbracci',
    seoTitle: 'Musical Hugs',
    title: { first: 'musical', second: 'hugs' },
    description:
      'An interactive website supporting future mothers through their pregnancy journey.',
    link: 'https://www.19ad.xin',
    cover: { image: '05-project-abbracci-musicali-3.jpg', alt: 'Musical Hugs' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '208,180,72',
      color2: '195,129,113',
      colorBg: '237,218,213',
      colorHover: '195,129,113',
    },
    meta: {
      role: ['front-end dev', 'motion'],
      agency: 'AQuest',
      year: 2021,
      awards: 'CSSDA of the day',
    },
    gallery: [
      { image: 'abbracci-01.jpg', alt: 'Abbracci 01' },
      { image: 'abbracci-02.jpg', alt: 'Abbracci 02' },
      { image: 'abbracci-03.jpg', alt: 'Abbracci 03' },
      { image: 'abbracci-04.jpg', alt: 'Abbracci 04' },
      { image: 'abbracci-05.jpg', alt: 'Abbracci 05' },
    ],
  },
  {
    id: 5,
    number: '06',
    slug: 'postop',
    folder: 'postop',
    seoTitle: 'Post Op',
    title: { first: 'post', second: 'op' },
    description:
      'Immersive and interactive web experience for the short movie Post Op directed by Greta Zozzoli.',
    link: 'https://www.19ad.xin',
    cover: { image: '08-project-postop.jpg', alt: 'Post Op' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '185,165,170',
      color2: '254,175,200',
      colorBg: '193,204,250',
      colorHover: '193,204,250',
    },
    meta: {
      role: ['full stack dev', 'motion'],
      agency: 'Overpx',
      year: 2022,
      awards: 'Awwwards SOTD',
    },
    gallery: [
      { image: 'postop-01.jpg', alt: 'PostOp 01' },
      { image: 'postop-02.jpg', alt: 'PostOp 02' },
      { image: 'postop-03.jpg', alt: 'PostOp 03' },
      { image: 'postop-04.jpg', alt: 'PostOp 04' },
      { image: 'postop-05.jpg', alt: 'PostOp 05' },
    ],
  },
  {
    id: 6,
    number: '07',
    slug: 'cme',
    folder: 'cme',
    seoTitle: 'CME',
    title: { first: 'cme', second: '' },
    description:
      'Leading manufacturer of medical devices for respiratory care, anaesthesia, and neonatology.',
    link: 'https://www.19ad.xin',
    cover: { image: '06-project-cme.jpg', alt: 'CME' },
    colors: {
      colorPrimary: '23,25,26,1',
      colorSecondary: '80,80,80,1',
      colorBorder: '23,25,26,0.2',
      color1: '76,170,188',
      color2: '114,106,164',
      colorBg: '170,212,220',
      colorHover: '114,106,164',
    },
    meta: {
      role: ['full stack dev'],
      agency: 'Overpx',
      year: 2022,
      awards: '',
    },
    gallery: [
      { image: 'cme-01.jpg', alt: 'CME 01' },
      { image: 'cme-02.jpg', alt: 'CME 02' },
      { image: 'cme-03.jpg', alt: 'CME 03' },
      { image: 'cme-04.jpg', alt: 'CME 04' },
      { image: 'cme-05.jpg', alt: 'CME 05' },
    ],
  },
  {
    id: 7,
    number: '08',
    slug: 'raccagni',
    folder: 'reccagni',
    seoTitle: 'Raccagni',
    title: { first: 'raccagni', second: '' },
    description:
      'Premium zipper and metal accessories manufacturer for luxury fashion brands.',
    link: 'https://www.19ad.xin',
    cover: { image: '07-project-raccagni.jpg', alt: 'Raccagni' },
    colors: {
      colorPrimary: '240,240,240,1',
      colorSecondary: '208,205,206,1',
      colorBorder: '240,240,240,0.1',
      color1: '17,17,17',
      color2: '0,0,0',
      colorBg: '6,6,6',
      colorHover: '0,0,0',
    },
    meta: {
      role: ['full stack dev', 'motion'],
      agency: 'Overpx',
      year: 2025,
      awards: '',
    },
    gallery: [
      { image: 'raccagni-01.jpg', alt: 'Raccagni 01' },
      { image: 'raccagni-02.jpg', alt: 'Raccagni 02' },
      { image: 'raccagni-03.jpg', alt: 'Raccagni 03' },
      { image: 'raccagni-04.jpg', alt: 'Raccagni 04' },
      { image: 'raccagni-05.jpg', alt: 'Raccagni 05' },
    ],
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projectsData.find((p) => p.slug === slug);
}
