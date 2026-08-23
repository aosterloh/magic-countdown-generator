export type TemporalMode = 'SPEED_UP' | 'PASSTHROUGH' | 'TRUNCATE_FRONT' | 'TRUNCATE_BACK';

export type ImageModelType =
  | 'gemini-3.1-flash-image'
  | 'imagen-3.0-generate-002'
  | 'imagen-3.0-fast-generate-001'
  | 'procedural-diegetic';

export type AuthMode = 'ADC' | 'API_KEY';

export interface SlotTemporalConfig {
  mode: TemporalMode;
  targetDurationSeconds: number; // Clamped in [0.5, 4.0]
  trimStartSeconds: number;
  trimEndSeconds: number;
}

export interface CountdownSlot {
  index: number; // 10 down to 1
  diegeticNumber: number;
  sceneConcept: string;
  objectEmbedding?: string;
  revealMechanism?: string; // How the number is revealed via motion / camera
  imagePrompt: string;      // Scene framing planning for reveal (hidden/distant number)
  videoPrompt?: string;     // Coordinated Veo 3 camera motion revealing the number

  // Prompt Review State
  isPromptApproved: boolean;
  isPromptRecreating?: boolean;

  // Image Generation State
  currentImageUri: string | null;
  historyImageUri: string | null; // N-1 rollback
  isImageAccepted: boolean;
  isImageLoading: boolean;
  imageError: string | null;

  // Refinement Parameters
  customPromptOverride?: string;
  brandReferenceImageUri?: string;

  // Video Generation State
  rawVideoUri: string | null; // 4.0s raw Veo output
  isVideoLoading: boolean;
  videoError: string | null;

  // Temporal Alignment
  temporalConfig: SlotTemporalConfig;
  processedVideoUri: string | null;
}

export interface ProjectConfig {
  brandName: string;
  themeContext: string;
  universalStyleAnchor: string;
  selectedModel: ImageModelType;
  authMode: AuthMode;
  gcpProject: string;
  gcpRegion: string;
  apiKey?: string;
}
