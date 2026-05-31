export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface Attachment {
  id: string
  name: string
  mimeType: string
  dataUrl: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  attachments?: Attachment[]
  model?: string
  routeLabel?: string
  routeReason?: string
  toolCalls?: ToolCall[]
  toolCallId?: string
  name?: string
}

export interface MemoryEntry {
  id: string
  text: string
  keywords: string[]
  createdAt: string
  lastUsedAt: string
}

export interface RouterDecision {
  model: string
  label: string
  reason: string
}

export interface MCPServerDefinition {
  id: string
  name: string
  description: string
  toolNames: string[]
}

export interface Settings {
  model: string
  visionModel: string
  reasoningModel: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  topP: number
  memoryWindow: number
  autoRoutingEnabled: boolean
  longTermMemoryEnabled: boolean
  maxMemoryItems: number
  toolUseEnabled: boolean
  enabledMcpServers: string[]
  apiUrl: string
<<<<<<< HEAD
  provider: 'lm-studio' | 'openai' | 'custom'
  wolframAppId: string
=======
  provider: 'lm-studio' | 'lm-studio-remote' | 'openai' | 'custom'
>>>>>>> main
}
