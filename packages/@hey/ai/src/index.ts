export type AiDesignTaskStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface AiPrompt {
  prompt: string;
  style?: string;
  targetScene?: 'poster' | 'invitation' | 'social' | 'logo' | 'banner';
}

export interface AiGeneratedAsset {
  id: string;
  url: string;
  prompt: AiPrompt;
  width: number;
  height: number;
  vectorizationMeta?: unknown;
  segmentationMeta?: unknown;
}
