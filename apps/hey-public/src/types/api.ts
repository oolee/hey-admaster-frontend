export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
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
