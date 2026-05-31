import type { MCPServerDefinition, MemoryEntry, Settings } from '../types'
import { searchMemories } from './memory'

interface ToolContext {
  memories: MemoryEntry[]
  settings?: Settings
}

interface FunctionTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export const MCP_SERVERS: MCPServerDefinition[] = [
  {
    id: 'utilities',
    name: 'Utilities Server',
    description: 'Small helper tools for time and calculation tasks.',
    toolNames: ['utilities_time_now', 'utilities_calculate'],
  },
  {
    id: 'memory',
    name: 'Memory Server',
    description: 'Searches long-term conversation memories stored in the browser.',
    toolNames: ['memory_search'],
  },
  {
    id: 'browser',
    name: 'Browser Server',
    description: 'Searches the web and can also open a URL in a new tab when handoff is needed.',
    toolNames: ['browser_search_web', 'browser_open_url'],
  },
  {
    id: 'wolframalpha',
    name: 'WolframAlpha Server',
    description: 'Query WolframAlpha for advanced mathematical calculations, formula analysis, scientific facts, or step-by-step reasoning.',
    toolNames: ['wolfram_query'],
  },
]

const ALL_TOOLS: FunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'utilities_time_now',
      description: 'Get the current local time in ISO format.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'utilities_calculate',
      description: 'Evaluate a simple arithmetic expression with numbers, parentheses, and basic operators.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Arithmetic expression, for example (24 * 7) / 3' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'memory_search',
      description: 'Search the long-term memory store for user facts or prior preferences.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The memory topic to search for.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_search_web',
      description: 'Search the web, return a compact summary of results, and include source URLs for citation. Prefer this when the user asks to look up or summarize information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Web search query.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_open_url',
      description: 'Open a URL in a new browser tab for the user. Use this only when the user explicitly asks to open or navigate to a page.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Fully qualified HTTP or HTTPS URL.' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wolfram_query',
      description: 'Query WolframAlpha for advanced mathematical calculation, formula analysis, scientific facts, or step-by-step reasoning.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The math query or question to send to WolframAlpha, e.g. "integrate x^2 cos(x)", "solve x^2 + 5x + 6 = 0".' },
        },
        required: ['query'],
      },
    },
  },
]

interface DuckDuckGoTopic {
  FirstURL?: string
  Text?: string
  Name?: string
  Topics?: DuckDuckGoTopic[]
}

interface DuckDuckGoResponse {
  Abstract?: string
  AbstractText?: string
  AbstractSource?: string
  AbstractURL?: string
  Answer?: string
  AnswerType?: string
  Definition?: string
  DefinitionSource?: string
  DefinitionURL?: string
  Heading?: string
  RelatedTopics?: DuckDuckGoTopic[]
  Results?: DuckDuckGoTopic[]
}

interface SearchSource {
  title: string
  url: string
  snippet: string
  source: string
}

interface SearchPayload {
  query: string
  heading: string
  summary: string
  sources: SearchSource[]
  provider: string
  online: boolean
  resultType: 'success' | 'empty' | 'error'
}

interface Rss2JsonItem {
  title?: string
  link?: string
  pubDate?: string
  description?: string
  source_id?: string
}

interface Rss2JsonResponse {
  status?: string
  items?: Rss2JsonItem[]
  feed?: {
    title?: string
  }
}

export function getEnabledServerDefinitions(settings: Settings): MCPServerDefinition[] {
  return MCP_SERVERS.filter((server) => settings.enabledMcpServers.includes(server.id))
}

export function getEnabledTools(settings: Settings): FunctionTool[] {
  if (!settings.toolUseEnabled) return []

  const enabledToolNames = new Set(
    getEnabledServerDefinitions(settings).flatMap((server) => server.toolNames),
  )
  return ALL_TOOLS.filter((tool) => enabledToolNames.has(tool.function.name))
}

function safeArithmetic(expression: string): number {
  if (!/^[0-9+\-*/().\s%]+$/.test(expression)) {
    throw new Error('Unsupported characters in expression.')
  }

  const result = Function(`"use strict"; return (${expression})`)()
  if (typeof result !== 'number' || Number.isNaN(result)) {
    throw new Error('Expression did not produce a valid number.')
  }

  return result
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isNewsQuery(query: string): boolean {
  return /news|headline|breaking|latest|today|world|新聞|頭條|即時|今日|今天|世界/u.test(query)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.text()
}

function fetchJsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const windowWithCallbacks = window as unknown as Window & Record<string, unknown>
    const cleanup = () => {
      delete windowWithCallbacks[callbackName]
      script.remove()
    }

    windowWithCallbacks[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('Web search request failed.'))
    }

    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`
    document.body.appendChild(script)
  })
}

function flattenTopics(topics: DuckDuckGoTopic[] = []): Array<{ title: string; url: string; snippet: string }> {
  return topics.flatMap((topic) => {
    if (Array.isArray(topic.Topics) && topic.Topics.length > 0) {
      return flattenTopics(topic.Topics)
    }

    if (!topic.FirstURL || !topic.Text) return []

    const [title, ...rest] = topic.Text.split(' - ')
    return [{
      title: title || topic.Text,
      url: topic.FirstURL,
      snippet: rest.join(' - ') || topic.Text,
    }]
  })
}

async function searchWeb(query: string) {
  if (isNewsQuery(query)) {
    const googleNewsResult = await searchGoogleNews(query)
    if (googleNewsResult.resultType === 'success') return googleNewsResult
  }

  const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=0`
  try {
    const data = await fetchJsonp<DuckDuckGoResponse>(endpoint)

    const related = flattenTopics([...(data.Results ?? []), ...(data.RelatedTopics ?? [])]).slice(0, 5)
    const summaryParts = [
      data.Answer?.trim(),
      data.AbstractText?.trim(),
      data.Definition?.trim(),
    ].filter(Boolean)

    const sources = [
      ...(data.AbstractURL ? [{
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText || data.Abstract || '',
        source: data.AbstractSource || 'DuckDuckGo Instant Answer',
      }] : []),
      ...(data.DefinitionURL ? [{
        title: `${data.Heading || query} definition`,
        url: data.DefinitionURL,
        snippet: data.Definition || '',
        source: data.DefinitionSource || 'Definition source',
      }] : []),
      ...related.map((item) => ({
        ...item,
        source: 'DuckDuckGo related topic',
      })),
    ].slice(0, 6)

    return {
      query,
      heading: data.Heading || query,
      summary: summaryParts.join('\n\n') || 'Connected successfully, but this provider did not return a direct summary for the query.',
      sources,
      provider: 'DuckDuckGo Instant Answer',
      online: true,
      resultType: sources.length > 0 || summaryParts.length > 0 ? 'success' : 'empty',
    } satisfies SearchPayload
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error'
    return {
      query,
      heading: query,
      summary: `The web search request failed: ${message}`,
      sources: [],
      provider: 'DuckDuckGo Instant Answer',
      online: false,
      resultType: 'error',
    } satisfies SearchPayload
  }
}

function mapNewsItems(query: string, provider: string, items: Rss2JsonItem[]): SearchPayload {
  const sources = items
    .filter((item) => item.title && item.link)
    .slice(0, 6)
    .map((item) => ({
      title: item.title || 'Untitled article',
      url: item.link || '',
      snippet: [stripHtml(item.description || ''), item.pubDate ? `Published: ${item.pubDate}` : '']
        .filter(Boolean)
        .join(' · '),
      source: item.source_id || provider,
    }))

  return {
    query,
    heading: `Latest news for ${query}`,
    summary: sources.length > 0
      ? `Connected successfully and found ${sources.length} recent news results.`
      : 'Connected successfully, but no recent news results were returned for this query.',
    sources,
    provider,
    online: true,
    resultType: sources.length > 0 ? 'success' : 'empty',
  }
}

async function searchGoogleNews(query: string): Promise<SearchPayload> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:1d`)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`

  try {
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
    const rss2json = await fetchJson<Rss2JsonResponse>(rss2jsonUrl)
    if (rss2json.status === 'ok') {
      return mapNewsItems(query, 'Google News RSS via rss2json', rss2json.items ?? [])
    }
  } catch {
    // Fallback to proxy
  }

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`
    const xmlText = await fetchText(proxyUrl)
    const xml = new DOMParser().parseFromString(xmlText, 'text/xml')
    const items = Array.from(xml.querySelectorAll('item')).map((item) => ({
      title: item.querySelector('title')?.textContent ?? '',
      link: item.querySelector('link')?.textContent ?? '',
      pubDate: item.querySelector('pubDate')?.textContent ?? '',
      description: item.querySelector('description')?.textContent ?? '',
      source_id: item.querySelector('source')?.textContent ?? 'Google News',
    }))

    return mapNewsItems(query, 'Google News RSS via AllOrigins', items)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error'
    return {
      query,
      heading: `Latest news for ${query}`,
      summary: `Tried a live news provider, but the request failed: ${message}`,
      sources: [],
      provider: 'Google News RSS',
      online: false,
      resultType: 'error',
    }
  }
}

function formatWolframResponse(data: any): string {
  const queryResult = data?.queryresult
  if (!queryResult) {
    return JSON.stringify({ error: 'Invalid response structure from WolframAlpha API.', success: false })
  }

  if (queryResult.error === true || queryResult.error === 'true') {
    return JSON.stringify({ error: queryResult.error?.message || 'WolframAlpha error occurred.', success: false })
  }

  if (queryResult.success === false || queryResult.success === 'false') {
    const didYouMeans = queryResult.didyoumeans
    let fallbackMsg = 'WolframAlpha could not understand or find results for this query.'
    if (didYouMeans) {
      const suggestions = Array.isArray(didYouMeans) 
        ? didYouMeans.map((d: any) => d.val).join(', ')
        : (didYouMeans.val || '')
      if (suggestions) {
        fallbackMsg += ` Did you mean: ${suggestions}?`
      }
    }
    return JSON.stringify({ error: fallbackMsg, success: false })
  }

  const pods = queryResult.pods || []
  if (pods.length === 0) {
    return JSON.stringify({ error: 'No results returned from WolframAlpha.', success: false })
  }

  const formattedPods = pods.map((pod: any) => {
    const title = pod.title || 'Result'
    const subpods = pod.subpods || []
    const content = subpods
      .map((sub: any) => sub.plaintext?.trim())
      .filter(Boolean)
      .join('\n')

    return {
      title,
      content,
    }
  }).filter((p: any) => p.content)

  return JSON.stringify({
    success: true,
    pods: formattedPods,
  })
}

async function queryWolframAlpha(query: string, appId: string): Promise<string> {
  if (!appId || !appId.trim()) {
    return JSON.stringify({
      error: 'WolframAlpha AppID is missing. Please configure your WolframAlpha AppID in the Settings panel.',
      success: false,
    })
  }

  const targetUrl = `https://api.wolframalpha.com/v2/query?appid=${encodeURIComponent(appId)}&input=${encodeURIComponent(query)}&output=json`
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`

  try {
    const response = await fetch(proxyUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    return formatWolframResponse(data)
  } catch (error) {
    try {
      const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
      const response = await fetch(fallbackUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      return formatWolframResponse(data)
    } catch (fallbackError) {
      const msg = error instanceof Error ? error.message : 'Network error'
      return JSON.stringify({
        error: `Failed to connect to WolframAlpha API: ${msg}`,
        success: false,
      })
    }
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<string> {
  switch (name) {
    case 'utilities_time_now': {
      const now = new Date()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const localTimeStr = now.toString()
      
      const offsetMinutes = now.getTimezoneOffset()
      const offsetSign = offsetMinutes > 0 ? '-' : '+'
      const absOffsetMinutes = Math.abs(offsetMinutes)
      const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, '0')
      const offsetMins = String(absOffsetMinutes % 60).padStart(2, '0')
      const formattedOffset = `${offsetSign}${offsetHours}:${offsetMins}`
      
      const localISO = new Date(now.getTime() - offsetMinutes * 60000).toISOString().slice(0, -1) + formattedOffset

      return JSON.stringify({
        now: localISO,
        utc: now.toISOString(),
        local: localISO,
        timezone: timezone,
        localString: localTimeStr,
      })
    }

    case 'utilities_calculate': {
      const expression = String(args.expression ?? '')
      const result = safeArithmetic(expression)
      return JSON.stringify({ expression, result })
    }

    case 'memory_search': {
      const query = String(args.query ?? '')
      const matches = searchMemories(query, context.memories, 5)
      return JSON.stringify({
        query,
        matches: matches.map(({ text, createdAt, lastUsedAt }) => ({ text, createdAt, lastUsedAt })),
      })
    }

    case 'browser_search_web': {
      const query = String(args.query ?? '')
      if (!query.trim()) {
        throw new Error('Search query cannot be empty.')
      }

      return JSON.stringify(await searchWeb(query))
    }

    case 'browser_open_url': {
      const url = String(args.url ?? '')
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('Only HTTP and HTTPS URLs are supported.')
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      return JSON.stringify({ opened: true, url })
    }

    case 'wolfram_query': {
      const query = String(args.query ?? '')
      if (!query.trim()) {
        throw new Error('Query cannot be empty.')
      }
      const appId = context.settings?.wolframAppId || ''
      const result = await queryWolframAlpha(query, appId)
      try {
        const parsed = JSON.parse(result)
        parsed.query = query
        return JSON.stringify(parsed)
      } catch {
        return result
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
