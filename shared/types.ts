export interface TranslateRequest {
  text: string;
  source?: string;
  target: string;
}

export interface TranslateResponse {
  translatedText: string;
  source: string;
  target: string;
  cached: boolean;
  provider: string;
}

export interface AssistantRequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AssistantResponse {
  answer: string;
  confidence: number;
  source: 'faq' | 'llm';
  suggestions?: string[];
}

export interface SOSContact {
  id: string;
  name: string;
  phone: string;
  isPrimary?: boolean;
}

export interface SOSRequest {
  phone: string;
  message: string;
  userName?: string;
  lat?: number;
  lng?: number;
}

export interface SOSResponse {
  success: boolean;
  smsSent: boolean;
  reason?: 'NO_GATEWAY_CONFIGURED' | 'PROVIDER_ERROR' | 'INVALID_INPUT' | 'RATE_LIMITED';
  messageId?: string;
  provider?: string;
  error?: string;
  waUrl: string;
  smsUrl: string;
  message: string;
  phoneMasked: string;
  preparedMessage?: string;
}

export interface PhraseItem {
  id: string;
  emoji: string;
  phrase: string;
  category: 'basic' | 'health' | 'food' | 'emotions' | 'emergency' | 'custom';
  favorite?: boolean;
  order?: number;
  createdAt?: number;
}

export interface LiveMessage {
  type: 'join' | 'caption' | 'ping' | 'pong' | 'clear' | 'history' | 'error';
  room: string;
  speaker?: string;
  text?: string;
  timestamp?: number;
  isFinal?: boolean;
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  version: string;
  timestamp: number;
  memory: {
    rss: number;
    heapUsed: number;
  };
}
