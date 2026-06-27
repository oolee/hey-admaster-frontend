export type AiDesignTaskStatus = 'failed' | 'pending' | 'running' | 'succeeded';

export interface AiPrompt {
  prompt: string;
  style?: string;
  targetScene?: 'banner' | 'invitation' | 'logo' | 'poster' | 'social';
}

export interface AiGeneratedAsset {
  height: number;
  id: string;
  prompt: AiPrompt;
  segmentationMeta?: unknown;
  url: string;
  vectorizationMeta?: unknown;
  width: number;
}
