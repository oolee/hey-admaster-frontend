export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  coverImageUrl: string;
  tags: string[];
  client?: string;
  year: number;
}

export interface PortfolioGalleryImage {
  id: string;
  portfolioItemId: string;
  caption?: string;
  sortOrder: number;
}

export interface PortfolioDetail {
  id: string;
  title: string;
  category: string;
  description: string;
  /** 富文本 HTML 内容 */
  content: string;
  tags: string[];
  client?: string;
  year: number;
  coverImageUrl: string;
  images: PortfolioGalleryImage[];
}
