import type { MemoryEntry, Message, Settings } from './types'

type Provider = Settings['provider']

export const LS_KEY = 'llm_chatroom_api_key'
export const LS_SETTINGS_KEY = 'llm_chatroom_settings'
export const LS_MEMORY_KEY = 'llm_chatroom_long_term_memory'

// Pre-populated high-quality model presets for each provider if connection is loading/offline
export const PROVIDER_FALLBACK_MODELS = {
  'lm-studio': [
    'qwen2.5-7b-instruct',
    'qwen2.5-14b-instruct',
    'llama-3.1-8b-instruct',
    'gemma-2-9b-it',
    'phi-3-mini-4k-instruct'
  ],
  'lm-studio-remote': [
    'qwen/qwen3.5-9b',
    'qwen2.5-7b-instruct',
    'qwen2.5-14b-instruct',
    'llama-3.1-8b-instruct',
    'gemma-2-9b-it'
  ],
  'openai': [
    'gpt-4o-mini',
    'gpt-4o',
    'o1-mini',
    'o1-preview',
    'gpt-3.5-turbo'
  ],
  'custom': [
    'general-model',
    'vision-model',
    'reasoning-model'
  ]
}

export function isLmStudioProvider(provider: Provider) {
  return provider === 'lm-studio' || provider === 'lm-studio-remote'
}

export function getProviderLabel(provider: Provider | string) {
  if (provider === 'lm-studio') return 'LM Studio Local'
  if (provider === 'lm-studio-remote') return 'LM Studio Remote'
  if (provider === 'openai') return 'OpenAI Cloud'
  return 'Custom Endpoint'
}

function stripTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, '')
}

export function getChatCompletionsUrl(apiUrl: string): string {
  const trimmed = stripTrailingSlash(apiUrl)
  if (!trimmed) return ''
  if (trimmed.endsWith('/chat/completions')) return trimmed
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`
  return `${trimmed}/v1/chat/completions`
}

export function getModelsUrl(apiUrl: string): string {
  const trimmed = stripTrailingSlash(apiUrl)
  if (!trimmed) return ''
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed.replace(/\/chat\/completions$/, '/models')
  }
  if (trimmed.endsWith('/v1')) {
    return `${trimmed}/models`
  }
  return `${trimmed}/v1/models`
}

export const DEFAULT_SETTINGS: Settings = {
  model: (import.meta.env.VITE_API_MODEL as string | undefined) ?? 'qwen2.5-7b-instruct',
  visionModel: (import.meta.env.VITE_API_VISION_MODEL as string | undefined) ?? 'qwen2.5-7b-instruct',
  reasoningModel: (import.meta.env.VITE_API_REASONING_MODEL as string | undefined) ?? 'qwen2.5-7b-instruct',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  maxTokens: -1,
  topP: 0.95,
  memoryWindow: 6, // Optimize history turns to prevent prompt processing delay on local inference
  autoRoutingEnabled: true,
  longTermMemoryEnabled: true,
  maxMemoryItems: 8,
  toolUseEnabled: true,
<<<<<<< HEAD
  enabledMcpServers: ['utilities', 'memory', 'wolframalpha'],
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:1234/v1/chat/completions',
=======
  enabledMcpServers: ['utilities', 'memory'],
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:1234',
>>>>>>> main
  provider: (import.meta.env.VITE_API_URL as string | undefined) ? 'custom' : 'lm-studio',
  wolframAppId: '',
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function loadMemories(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_MEMORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MemoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveMemories(memories: MemoryEntry[]) {
  localStorage.setItem(LS_MEMORY_KEY, JSON.stringify(memories))
}

export function buildHistorySlice(
  messages: Message[],
  memoryWindow: number,
): Message[] {
  if (memoryWindow <= 0) return messages
  return messages.slice(-(memoryWindow * 2))
}
