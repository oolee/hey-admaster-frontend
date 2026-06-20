export interface GenerateRequest {
  prompt: string
  size?: string
  quality?: 'low' | 'medium' | 'high'
  n?: number
  model?: 'auto' | 'tongyi' | 'openai' | 'mock'
  templateId?: string
  templateInput?: Record<string, string>
}

export interface GeneratedImage {
  b64_json?: string
  url?: string
  revised_prompt?: string
  index?: number
}

export interface GenerationHistoryItem {
  id: string
  prompt: string
  images: GeneratedImage[]
  createdAt: string
}

export interface AdTemplate {
  id: string
  name: string
  category: string
  icon: string
  description: string
  promptTemplate: string
  promptHint: string
  recommendedModel: string
  defaultSize: string
  printSize: string
}

export interface GenerateResponse {
  success: boolean
  data: GeneratedImage[]
  isMock?: boolean
  model?: string
  templateId?: string
  taskId?: string
  status?: string
}