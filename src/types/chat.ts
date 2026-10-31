export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface WebSource {
  title: string;
  uri: string;
  domain: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio?: string;
  modelUsed?: string;
  createdAt?: number;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  sourceImageUrl?: string;
  durationSeconds?: number;
  motionPreset?: string;
  modelUsed?: string;
  createdAt?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  sources?: WebSource[];
  searchQueries?: string[];
  webSearchUsed?: boolean;
  generatedImages?: GeneratedImage[];
  generatedVideos?: GeneratedVideo[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  saved: boolean;
  messages: ChatMessage[];
}

export type SidebarFilter = "all" | "saved";

export interface StarterPrompt {
  id: string;
  category: string;
  title: string;
  prompt: string;
  enableWebSearch?: boolean;
  attachSampleImage?: boolean;
  isImageGen?: boolean;
  isVideoGen?: boolean;
  isVoice?: boolean;
}


