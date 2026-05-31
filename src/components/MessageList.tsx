import { useEffect, useRef, useState } from 'react'
import type { Message } from '../types'
import MarkdownContent from './MarkdownContent'

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy'}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function formatToolName(name?: string) {
  if (!name) return 'Tool activity'
  if (name === 'browser_search_web') return 'Web search'
  if (name === 'browser_open_url') return 'Opened page'
  if (name === 'memory_search') return 'Memory lookup'
  if (name === 'utilities_time_now') return 'Time check'
  if (name === 'utilities_calculate') return 'Calculator'
  if (name === 'wolfram_query') return 'WolframAlpha'
  return name.replace(/_/g, ' ')
}

function parseToolContent(content: string) {
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return null
  }
}

function ToolMessageCard({ message }: { message: Message }) {
  const parsed = parseToolContent(message.content)

  if (message.name === 'utilities_time_now') {
    const timeVal = String(parsed?.local || parsed?.now || message.content)
    const tzVal = parsed?.timezone ? String(parsed.timezone) : null
    return (
      <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100 animate-fade-in">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Time Check</div>
        <p>
          Checked local time: <span className="font-mono text-xs font-semibold">{timeVal}</span>
          {tzVal && (
            <span className="ml-2 inline-flex rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-100">
              {tzVal}
            </span>
          )}
        </p>
      </div>
    )
  }

  if (message.name === 'memory_search' && parsed) {
    const matches = Array.isArray(parsed.matches) ? parsed.matches as Array<{ text?: string }> : []
    return (
      <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Memory Lookup</div>
        <p className="mb-2 text-xs opacity-80">Query: {String(parsed.query ?? '')}</p>
        {matches.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {matches.slice(0, 3).map((match, index) => (
              <li key={`${message.id}-${index}`}>{match.text || 'Matched memory'}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-80">No relevant stored memories were found.</p>
        )}
      </div>
    )
  }

  if (message.name === 'browser_search_web' && parsed) {
    const sources = Array.isArray(parsed.sources)
      ? parsed.sources as Array<{ title?: string; url?: string; snippet?: string; source?: string }>
      : []
    const provider = String(parsed.provider ?? 'Unknown provider')
    const resultType = String(parsed.resultType ?? 'empty')
    const online = Boolean(parsed.online)

    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100 animate-fade-in">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Web Search</div>
        <p className="mb-2 text-xs opacity-80">Query: {String(parsed.query ?? '')}</p>
        <p className="mb-2 text-xs opacity-80">Provider: {provider}</p>
        <p className="rounded-xl bg-white/70 px-3 py-2 text-sm leading-relaxed dark:bg-white/5">
          {String(parsed.summary ?? 'No summary returned.')}
        </p>
        {sources.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sources.map((source, index) => (
              <a
                key={`${message.id}-${index}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-amber-200 bg-white/70 px-2.5 py-1.5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/60 dark:border-amber-750 dark:bg-white/5 dark:hover:border-amber-600 dark:hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    來源 {index + 1}
                  </span>
                  {source.source && (
                    <span className="text-[10px] opacity-75 font-medium truncate max-w-[120px] text-gray-500 dark:text-gray-400">
                      {source.source}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                  {source.title || `Source ${index + 1}`}
                </div>
                {source.snippet && (
                  <p className="mt-0.5 text-[11px] opacity-75 leading-snug line-clamp-2 text-gray-600 dark:text-gray-400">
                    {source.snippet}
                  </p>
                )}
              </a>
            ))}
          </div>
        ) : resultType === 'error' ? (
          <p className="mt-3 text-xs opacity-80">
            The request did not complete successfully, so this looks like a live-network or provider access problem.
          </p>
        ) : online ? (
          <p className="mt-3 text-xs opacity-80">
            The request reached the provider, but it did not return usable article links for this query.
          </p>
        ) : (
          <p className="mt-3 text-xs opacity-80">
            The request did not confirm successful online access.
          </p>
        )}
      </div>
    )
  }

  if (message.name === 'browser_open_url' && parsed?.url) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide">Opened Page</div>
        <a href={String(parsed.url)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {String(parsed.url)}
        </a>
      </div>
    )
  }

  if (message.name === 'wolfram_query' && parsed) {
    const pods = Array.isArray(parsed.pods) ? parsed.pods : []
    const error = parsed.error ? String(parsed.error) : null
    const note = parsed.note ? String(parsed.note) : null

    return (
      <div className="rounded-2xl border border-dashed border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-850 dark:bg-red-950/30 dark:text-red-100 animate-fade-in">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide">WolframAlpha Calculation</div>
        <p className="mb-2 text-xs opacity-80">Query: {String(parsed.query ?? '')}</p>
        
        {note && (
          <div className="mb-2.5 rounded-xl bg-red-100/50 px-3 py-2 text-xs text-red-900 dark:bg-red-950/50 dark:text-red-200 leading-relaxed">
            {note}
          </div>
        )}

        {error ? (
          <div>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            <p className="mt-2 text-xs opacity-80">
              您可以到{' '}
              <a 
                href="https://developer.wolframalpha.com/portal/myapps" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-red-800 dark:hover:text-red-300 font-medium"
              >
                WolframAlpha Developer Portal
              </a>{' '}
              免費申請您專屬的 AppID 填入設定面板以啟用即時計算。
            </p>
          </div>
        ) : pods.length > 0 ? (
          <div className="mt-2 space-y-3">
            {pods.map((pod: any, index: number) => (
              <div key={`${message.id}-${index}`} className="rounded-lg bg-white/70 px-3 py-2 dark:bg-white/5">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {pod.title}
                </div>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                  {pod.content}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm opacity-80">No scientific results returned.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="mb-1 font-semibold uppercase tracking-wide">{formatToolName(message.name)}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
        {message.content}
      </pre>
    </div>
  )
}

function WorkingBubble({ processingStatus }: { processingStatus: string }) {
  return (
    <div className="flex justify-start">
      <div className="mr-2 hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-200 sm:flex">
        AI
      </div>
      <div className="flex max-w-full flex-col sm:max-w-[75%]">
        <div className="mb-1 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
            Working
          </span>
        </div>
        <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 flex-shrink-0">
              <span className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-900/50" />
              <span className="absolute inset-1 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <div>
              <div className="font-medium text-gray-800 dark:text-gray-100">Request in progress</div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{processingStatus}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  processingStatus: string | null
  onQuickPrompt: (text: string) => void
}

export default function MessageList({
  messages,
  isStreaming,
  processingStatus,
  onQuickPrompt,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, processingStatus])

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-4">
        {messages.length === 0 && !processingStatus && (
          <div className="my-auto py-8 text-center animate-fade-in sm:py-10">
            <h2 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-blue-400 dark:to-indigo-400 font-heading sm:text-4xl">
              Welcome to LLM Chatroom v2
            </h2>
            <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
              An advanced AI assistant utilizing local tool execution (MCP), long-term keyword memory, and smart routing.
            </p>

            {/* Capability Cards */}
            <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-3 text-left">
              <div className="rounded-lg border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 font-heading">Utilities</h4>
                <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                  Calculates math equations and fetches real-time local time.
                </p>
              </div>

              <div className="rounded-lg border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694 4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0v3.75" />
                  </svg>
                </div>
                <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 font-heading">Memory</h4>
                <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                  Saves facts about you across sessions to personalize answers.
                </p>
              </div>

              <div className="rounded-lg border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9.015 9.015 0 0 1 8.716 2.253M12 3a9.015 9.015 0 0 0-8.716 2.253M12 12h.008v.008H12V12Z" />
                  </svg>
                </div>
                <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 font-heading">Browser</h4>
                <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                  Searches online news and Fallbacks to DuckDuckGo/Google.
                </p>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="mt-9 text-left">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 text-center sm:text-left">
                Test Local Tools & Prompts
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  { text: 'What is the current time?', desc: 'Invoke time lookup utility' },
                  { text: 'Solve x^2 + 5x + 6 = 0 using WolframAlpha', desc: 'Advanced math reasoning calculation' },
                  { text: 'Search Google News for latest technology news', desc: 'Perform live web news aggregation' },
                  { text: 'Remember that my name is Kevin and I study React', desc: 'Save facts to long-term memory' },
                  { text: 'What is my name and what do I study?', desc: 'Retrieve facts from memory' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onQuickPrompt(item.text)}
                    className="flex w-full flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-gray-150 bg-white/70 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:bg-gray-800/70 dark:hover:border-blue-800 dark:focus:ring-blue-900"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-200">{item.text}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'assistant' && (!msg.content || !msg.content.trim())) return null

          if (msg.role === 'tool') {
            return <ToolMessageCard key={msg.id} message={msg} />
          }

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="mr-2 hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-200 sm:flex">
                  AI
                </div>
              )}
              {msg.role === 'assistant' ? (
                <div className="flex min-w-0 max-w-full flex-col animate-fade-in sm:max-w-[78%]">
                  {(msg.model || msg.routeLabel) && (
                    <div className="mb-1 hidden flex-wrap gap-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:flex">
                      {msg.model && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">
                          {msg.model}
                        </span>
                      )}
                      {msg.routeLabel && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                          {msg.routeLabel}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-sm leading-relaxed shadow-sm text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700">
                    <MarkdownContent content={msg.content} />
                  </div>
                  <div className="mt-1 flex flex-col gap-1 text-[11px] text-gray-400 dark:text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 italic sm:pr-4">
                      {msg.routeReason &&
                        msg.routeReason !== 'The default model is appropriate for this request.' &&
                        msg.routeReason !== 'Auto routing is disabled.' && (
                          <span>{msg.routeReason}</span>
                        )}
                    </div>
                    <div className="flex-shrink-0">
                      <CopyButton content={msg.content} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[88%] space-y-2 sm:max-w-[75%]">
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in">
                      {msg.attachments.map((attachment) => (
                        <img
                          key={attachment.id}
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          className="max-h-44 w-full rounded-2xl object-cover shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="rounded-2xl rounded-br-sm bg-blue-500 px-4 py-2.5 text-sm leading-relaxed shadow-sm text-white">
                      {msg.content}
                    </div>
                  )}
                </div>
              )}
              {msg.role === 'user' && (
                <div className="ml-2 hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white sm:flex">
                  You
                </div>
              )}
            </div>
          )
        })}

        {isStreaming && processingStatus && <WorkingBubble processingStatus={processingStatus} />}

        <div ref={bottomRef} />
      </div>
    </main>
  )
}
