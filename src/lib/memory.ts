import { generateId } from '../constants'
import type { MemoryEntry } from '../types'

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i',
  'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our', 'that', 'the', 'to',
  'use', 'want', 'we', 'with', 'you', 'your',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
}

function buildKeywords(text: string): string[] {
  return Array.from(new Set(tokenize(text))).slice(0, 12)
}

export function extractMemories(userText: string): MemoryEntry[] {
  const candidates: string[] = []
  const trimmed = userText.trim()

  const rememberMatch = trimmed.match(/remember(?:\s+that)?\s+(.+)/i)
  if (rememberMatch) candidates.push(rememberMatch[1].trim())

  const nameMatch = trimmed.match(/my name is\s+([^.,!\n]+)/i)
  if (nameMatch) candidates.push(`User name is ${nameMatch[1].trim()}.`)

  const preferenceMatch = trimmed.match(/i (?:prefer|like|love|use|study|work at|work on|live in)\s+([^.!?\n]+)/i)
  if (preferenceMatch) candidates.push(`User preference/context: ${preferenceMatch[0].trim()}.`)

  if (candidates.length === 0 && /\b(always|never|prefer|important|favorite)\b/i.test(trimmed) && trimmed.length <= 140) {
    candidates.push(trimmed)
  }

  return candidates
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((text) => ({
      id: generateId(),
      text,
      keywords: buildKeywords(text),
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    }))
}

export function mergeMemories(existing: MemoryEntry[], incoming: MemoryEntry[]): MemoryEntry[] {
  const merged = [...existing]

  for (const memory of incoming) {
    const duplicate = merged.find((item) => item.text.toLowerCase() === memory.text.toLowerCase())
    if (duplicate) {
      duplicate.lastUsedAt = new Date().toISOString()
      duplicate.keywords = Array.from(new Set([...duplicate.keywords, ...memory.keywords])).slice(0, 12)
      continue
    }

    merged.unshift(memory)
  }

  return merged
}

export function searchMemories(query: string, memories: MemoryEntry[], limit: number): MemoryEntry[] {
  const queryTerms = buildKeywords(query)
  if (queryTerms.length === 0) return memories.slice(0, limit)

  return [...memories]
    .map((memory) => {
      const matches = memory.keywords.filter((keyword) => queryTerms.includes(keyword)).length
      return { memory, score: matches }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.memory.lastUsedAt.localeCompare(a.memory.lastUsedAt))
    .slice(0, limit)
    .map(({ memory }) => ({
      ...memory,
      lastUsedAt: new Date().toISOString(),
    }))
}
