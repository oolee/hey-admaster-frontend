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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  isMock?: boolean;
}

export interface GenerateRequest {
  prompt: string;
  size?: string;
  quality?: 'high' | 'low' | 'medium';
  n?: number;
}

export interface ServiceItem {
  tag: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
}

export interface DailyPrompt {
  prompt: string;
  label: string;
}

export interface StatItem {
  number: string;
  label: string;
}

export interface CarouselItem {
  id: number;
  imageUrl: string;
  title: string;
  description: string;
}

export interface FeaturedPortfolio {
  id: string;
  title: string;
  category: string;
  description: string;
  coverImageUrl: string;
  tags: string[];
  client?: string;
  year: number;
}

export interface PublicHomepageData {
  services: ServiceItem[];
  dailyPrompts: DailyPrompt[];
  stats: StatItem[];
  carouselItems: CarouselItem[];
  featuredPortfolios: FeaturedPortfolio[];
}

export interface GeneratedImage {
  b64_json: string;
  revised_prompt?: string;
  index: number;
}

export interface GenerateResponse {
  success: boolean;
  data: GeneratedImage[];
  usage?: {
    total_tokens: number;
  };
  isMock?: boolean;
  model?: string;
  templateId?: string;
  taskId?: string;
  status?: string;
}
