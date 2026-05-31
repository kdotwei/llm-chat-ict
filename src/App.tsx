import { useEffect, useState } from 'react'
import type { Attachment, Message, Settings, ToolCall } from './types'
import {
  LS_KEY,
  LS_SETTINGS_KEY,
  buildHistorySlice,
  generateId,
  loadMemories,
  loadSettings,
  saveMemories,
  getModelsUrl,
  getChatCompletionsUrl,
  isLmStudioProvider,
} from './constants'
import { useDarkMode } from './hooks/useDarkMode'
import Header from './components/Header'
import ApiKeyModal from './components/ApiKeyModal'
import SettingsPanel from './components/SettingsPanel'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'
import { extractMemories, mergeMemories, searchMemories } from './lib/memory'
import { MCP_SERVERS, executeTool, getEnabledTools } from './lib/mcpTools'
import { routeModel } from './lib/router'

function buildApiMessages(messages: Message[], settings: Settings, memoryContext: string[]) {
  const enabledTools = getEnabledTools(settings)
  const history = buildHistorySlice(messages, settings.memoryWindow)
  const hasToolResults = history.some((m) => m.role === 'tool')

  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei'
  const timeString = now.toLocaleString('zh-TW', { hour12: false })
  const dateString = now.toLocaleDateString('zh-TW')
  const yearString = String(now.getFullYear())

  const systemSections: string[] = []
  systemSections.push(settings.systemPrompt.trim())

  if (hasToolResults) {
    // Optimization for tool results turn (minimizing context overhead):
    // Skip tool use rules 1 and 2, skip long-term memory context.
    // Inject highly focused summary constraints.
    systemSections.push(
      `【當前系統時間與地理資訊】：
- 本地時間：${timeString}
- 本地時區：${timezone}
- 本地日期：${dateString}`,
      `【系統指引 - 工具結果彙整】：
工具已執行完畢並回覆了數據結果。請仔細分析對話歷史中的工具數據，並用極其親切、簡明且有禮貌的繁體中文為使用者整理一份簡短的摘要（約2-3個重點即可，切勿冗長）。
【重要來源規則】：您回答中提及的每一則新聞、事實或報導，都必須在其後附上 Markdown 來源連結。絕對不能回覆沒有附上來源的新聞！格式請務必參照以下結構進行條列：
- **新聞標題**：簡短說明... [來源標題](網址)
絕對不要只回答 Done 或給予無意義的字句！`
    )
  } else {
    // Standard turn (normal chatting, preparing to decide tool calls):
    systemSections.push(
      `【當前系統時間與地理資訊】：
- 本地時間：${timeString}
- 本地日期：${dateString} (年份基準為 ${yearString} 年)
- 本地時區：${timezone}
- 當您需要搜尋「今天」、「今日」、「最新」或「最近」的新聞與時事時，請務必以此日期 (${yearString} 年) 作為構造搜尋關鍵字的唯一年份基準！請完全摒棄您的知識截止年份 (如 2025)，絕對不能使用過期或虛擬的年份作為搜尋詞！`,
      settings.toolUseEnabled && enabledTools.length > 0
        ? `您可以使用一組工具來協助回答。請務必嚴格遵守以下工具使用準則：
1. 僅在使用者請求明確需要時才調用工具（例如詢問時間、計算數學、搜尋網頁、搜尋記憶）。如果是普通的問候（如 hello, 你好）、閒聊或常識問題，請直接友善地進行對話回覆，絕對不要調用任何工具。
2. 當您決定調用工具時，該輪回覆必須包含工具調用（tool_calls），您可以簡單說明您正在使用工具，但請保持簡短。
3. 當工具執行完畢並回覆數據給您後，您會在下一輪對話中收到結果。您必須仔細分析工具回覆的數據，並為使用者撰寫一份親切、詳細且完整的繁體中文自然語言回覆，將工具取得的數據完美融入您的答案中。請像一個熱心、有禮貌的助手一樣詳細解釋，絕對不要敷衍回覆「Done」或只給予簡短字句。
【來源參照規定】：您所引述的任何新聞、事實或報導，都必須在其後方附上對應的來源連結，絕對不能回覆沒有附上來源連結的新聞。格式請務必使用 Markdown 連結（例如 [來源名稱](網址)）。`
        : '',
      'If tool results include URLs or source fields, summarize them directly in chat and cite the sources as Markdown links. CRITICAL RULE: For every single news article, fact, or event you mention in your response, you MUST append its source as a Markdown link (e.g., [Source Name](URL)). You are strictly forbidden from mentioning any news story or event that does not have a corresponding source URL in the tool results. If a web-search tool reports no usable results or a network/provider failure, say that clearly instead of inventing news.',
      memoryContext.length > 0
        ? `Relevant long-term memory:\n${memoryContext.map((item) => `- ${item}`).join('\n')}`
        : ''
    )
  }

  const systemMessages = [
    {
      role: 'system',
      content: systemSections.filter(Boolean).join('\n\n'),
    },
  ]

  const apiMessages = history.map((message, idx) => {
    if (message.role === 'user' && message.attachments && message.attachments.length > 0) {
      return {
        role: 'user',
        content: [
          ...(message.content ? [{ type: 'text', text: message.content }] : []),
          ...message.attachments.map((attachment) => ({
            type: 'image_url',
            image_url: { url: attachment.dataUrl },
          })),
        ],
      }
    }

    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: message.content,
        tool_calls: message.toolCalls.map((toolCall) => ({
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        })),
      }
    }

    if (message.role === 'tool') {
      const isLastToolMessage = history.slice(idx + 1).every((m) => m.role !== 'tool')
      let content = message.content
      
      // Token optimization: Compress tool outputs before passing them to the API
      if (message.name === 'browser_search_web') {
        try {
          const parsed = JSON.parse(message.content)
          const sources = Array.isArray(parsed.sources) ? parsed.sources : []
          const summary = parsed.summary || ''
          
          let compressed = `搜尋查詢: ${parsed.query || ''}\n`
          if (summary && !summary.startsWith('Connected successfully')) {
            compressed += `網頁摘要: ${summary}\n`
          }
          compressed += `找到 ${sources.length} 則新聞來源：\n`
          sources.forEach((src: any, index: number) => {
            compressed += `[來源 ${index + 1}] 標題: ${src.title || ''} | 網址: ${src.url || ''} | 大綱: ${src.snippet || ''}\n`
          })
          content = compressed
        } catch (_) {}
      } else if (message.name === 'memory_search') {
        try {
          const parsed = JSON.parse(message.content)
          const matches = Array.isArray(parsed.matches) ? parsed.matches : []
          let compressed = `記憶搜尋: ${parsed.query || ''}\n`
          if (matches.length > 0) {
            matches.forEach((m: any) => {
              compressed += `- ${m.text}\n`
            })
          } else {
            compressed += `未找到相關長期記憶。\n`
          }
          content = compressed
        } catch (_) {}
      }

      if (isLastToolMessage) {
        content += '\n\n【系統指引】：工具已執行完畢。請仔細分析上方工具數據，並用親切、簡明且有禮貌的繁體中文為使用者整理一份簡短的摘要（約2-3個重點即可，切勿冗長）。每一項事實或報導都必須在其後附上 Markdown 來源連結。絕對不能回覆沒有附上來源新聞！格式請務必參照以下結構進行條列：\n- **新聞標題**：簡短說明... [來源標題](網址)\n絕對不要只回答 Done 或給予無意義的字句！'
      }
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        name: message.name,
        content: content,
      }
    }

    return {
      role: message.role,
      content: message.content,
    }
  })

  const finalMessages = [...systemMessages, ...apiMessages]

  return finalMessages
}

function generateFallbackResponse(messages: Message[]): string {
  const lastAssistantIdx = [...messages]
    .reverse()
    .findIndex((m) => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0)
  if (lastAssistantIdx === -1) {
    return '已處理完成。'
  }
  const actualAssistantIdx = messages.length - 1 - lastAssistantIdx
  const assistantMsg = messages[actualAssistantIdx]
  const toolCalls = assistantMsg.toolCalls || []

  const toolResults: Array<{ name: string; content: string; args: Record<string, unknown> }> = []
  for (const tc of toolCalls) {
    const toolMsg = messages.find((m) => m.role === 'tool' && m.toolCallId === tc.id)
    if (toolMsg) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.arguments || '{}') as Record<string, unknown>
      } catch (_) {}
      toolResults.push({
        name: tc.name,
        content: toolMsg.content,
        args,
      })
    }
  }

  if (toolResults.length === 0) {
    return '動作已執行完畢。'
  }

  const lines: string[] = []

  for (const result of toolResults) {
    try {
      const data = JSON.parse(result.content) as Record<string, unknown>

      if (result.name === 'utilities_time_now') {
        const timeZone = String(data.timezone || '本地時區')
        const local = String(data.local || '')
        let formattedTime = local
        if (local) {
          const dt = new Date(local)
          if (!isNaN(dt.getTime())) {
            formattedTime = dt.toLocaleString('zh-TW', { hour12: false })
          }
        }
        lines.push(`目前查詢到的時間是：**${formattedTime}** (${timeZone})。`)
      } else if (result.name === 'utilities_calculate') {
        const expr = String(result.args.expression || data.expression || '')
        const val = String(data.result ?? '')
        lines.push(`經計算，算式 \`${expr}\` 的結果為 **${val}**。`)
      } else if (result.name === 'memory_search') {
        const query = String(result.args.query || data.query || '')
        const matches = Array.isArray(data.matches) ? data.matches : []
        if (matches.length > 0) {
          lines.push(`已搜尋長期的記憶庫，關於「${query}」的相關內容如下：`)
          matches.forEach((m: Record<string, unknown>, idx: number) => {
            lines.push(`${idx + 1}. ${m.text}`)
          })
        } else {
          lines.push(`已搜尋長期的記憶庫，目前沒有找到與「${query}」相關的記憶記錄。`)
        }
      } else if (result.name === 'browser_search_web') {
        const query = String(result.args.query || data.query || '')
        const summary = String(data.summary || '')
        const sources = Array.isArray(data.sources) ? data.sources : []

        lines.push(`針對「${query}」進行網頁搜尋，結果如下：\n`)
        if (summary && !summary.startsWith('Connected successfully')) {
          lines.push(`${summary}\n`)
        }
        if (sources.length > 0) {
          lines.push(`已為您彙整以下最新相關報導之精簡摘要：\n`)
          sources.slice(0, 3).forEach((src: Record<string, unknown>) => {
            const title = String(src.title || '')
            const snippet = String(src.snippet || '')
            const url = String(src.url || '')
            if (title) {
              const cleanSnippet = snippet.replace(/\s+/g, ' ').trim()
              lines.push(`- **${title}**：${cleanSnippet.slice(0, 80)}${cleanSnippet.length > 80 ? '...' : ''} [閱讀來源](${url})`)
            }
          })

          if (sources.length > 3) {
            lines.push(`\n其他相關來源：`)
            sources.slice(3).forEach((src: Record<string, unknown>) => {
              const title = String(src.title || '網頁連結')
              const url = String(src.url || '')
              if (url) {
                lines.push(`- [${title}](${url})`)
              }
            })
          }
        } else {
          lines.push(`（無搜尋到具體網頁來源）`)
        }
      } else if (result.name === 'browser_open_url') {
        const url = String(result.args.url || data.url || '')
        lines.push(`已成功在瀏覽器新分頁中開啟網頁：[${url}](${url})。`)
      } else if (result.name === 'wolfram_query') {
        const query = String(result.args.query || '')
        if (data.error) {
          lines.push(`計算引擎 WolframAlpha 在處理「${query}」時發生錯誤：${data.error}`)
        } else if (data.success && Array.isArray(data.pods)) {
          lines.push(`計算引擎 WolframAlpha 針對「${query}」的分析計算結果如下：\n`)
          data.pods.forEach((pod: any) => {
            lines.push(`### ${pod.title}`)
            lines.push(`${pod.content}\n`)
          })
        } else {
          lines.push(`計算引擎 WolframAlpha 執行完畢，但未返回具體結果。`)
        }
      } else {
        lines.push(`已執行「${result.name}」工具，結果如下：\n\n${result.content}`)
      }
    } catch (_) {
      if (result.name === 'utilities_time_now') {
        lines.push(`目前的時間已經成功取得：${result.content}`)
      } else {
        lines.push(`已執行「${result.name}」工具，結果如下：\n\n${result.content}`)
      }
    }
  }

  return lines.join('\n')
}

async function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error(`Failed to read ${file.name}.`))
        return
      }

      resolve({
        id: generateId(),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: result,
      })
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const { isDark, toggle: toggleDark } = useDarkMode()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_KEY) ?? '')
  const [showKeyModal, setShowKeyModal] = useState<boolean>(() => {
    const savedKey = localStorage.getItem(LS_KEY)
    const settingsDraft = loadSettings()
    // Only prompt for key on startup if provider is OpenAI and key is missing
    return !savedKey && settingsDraft.provider === 'openai'
  })
  const [keyDraft, setKeyDraft] = useState('')
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [memories, setMemories] = useState(loadMemories)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const isLmStudio = isLmStudioProvider(settings.provider)
    const needsKey = settings.provider === 'openai'
    if (needsKey && !apiKey) {
      setAvailableModels([])
      return
    }

    const modelsUrl = getModelsUrl(settings.apiUrl)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (isLmStudio) {
      headers['Authorization'] = 'Bearer lm-studio'
    }

    fetch(modelsUrl, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { data: { id: string }[] }) => {
        if (!data || !Array.isArray(data.data)) return
        const ids = data.data.map((model) => model.id)
        setAvailableModels(ids)
        
        // Auto-select models if the current one is not loaded in the server
        setSettings((current) => ({
          ...current,
          model: current.model && ids.includes(current.model) ? current.model : (ids[0] ?? current.model),
          visionModel: current.visionModel && ids.includes(current.visionModel)
            ? current.visionModel
            : (current.visionModel || ids[0] || ''),
          reasoningModel: current.reasoningModel && ids.includes(current.reasoningModel)
            ? current.reasoningModel
            : (current.reasoningModel || ids[0] || ''),
        }))
      })
      .catch((err) => {
        console.error('Failed to fetch models:', err)
        setAvailableModels([])
      })
  }, [apiKey, settings.apiUrl, settings.provider])

  function updateMemories(next: ReturnType<typeof mergeMemories>) {
    const trimmed = next.slice(0, 100)
    setMemories(trimmed)
    saveMemories(trimmed)
  }

  function rememberUserInput(userText: string) {
    if (!settings.longTermMemoryEnabled) return
    const extracted = extractMemories(userText)
    if (extracted.length === 0) return
    updateMemories(mergeMemories(memories, extracted))
  }

  async function callChatApi(body: Record<string, unknown>) {
    const isLmStudio = isLmStudioProvider(settings.provider)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (isLmStudio) {
      headers['Authorization'] = 'Bearer lm-studio'
    }

    const response = await fetch(getChatCompletionsUrl(settings.apiUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Server error: ${response.status} ${response.statusText}\n${errorBody}`)
    }

    return response
  }

  async function runChatTurn(historySnapshot: Message[], userMessage: Message) {
    const route = routeModel(userMessage.content, userMessage.attachments ?? [], settings, availableModels)
    setProcessingStatus(`Routing to ${route.label.toLowerCase()} model...`)
    const retrievedMemories = settings.longTermMemoryEnabled
      ? searchMemories(userMessage.content, memories, settings.maxMemoryItems)
      : []
    const memoryContext = retrievedMemories.map((memory) => memory.text)
    const enabledTools = getEnabledTools(settings)
    const workingHistory = [...historySnapshot]

    for (let iteration = 0; iteration < 5; iteration += 1) {
      setProcessingStatus(iteration === 0 ? 'Thinking through your request...' : 'Reviewing tool results...')
      const assistantId = generateId()

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          model: route.model,
          routeLabel: route.label,
          routeReason: route.reason,
        },
      ])

      const body: Record<string, unknown> = {
        model: route.model,
        messages: buildApiMessages(workingHistory, settings, memoryContext),
        stream: true,
        temperature: settings.temperature,
        top_p: settings.topP,
      }

      if (settings.maxTokens > 0) body.max_tokens = settings.maxTokens
      if (settings.toolUseEnabled && enabledTools.length > 0) body.tools = enabledTools

      const response = await callChatApi(body)
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Streaming is not available on this response.')

      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false
      let accumulatedText = ''
      const accumulatedToolCalls: Array<{
        index: number
        id?: string
        name?: string
        arguments: string
      }> = []

      while (!finished) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          const payload = trimmed.slice('data: '.length)
          if (payload === '[DONE]') {
            finished = true
            break
          }

          try {
            const parsed = JSON.parse(payload)
            const choice = parsed.choices?.[0]
            if (!choice) continue

            const delta = choice.delta
            if (!delta) continue

            if (delta.content) {
              accumulatedText += delta.content
              setProcessingStatus('Generating the answer...')
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + delta.content }
                    : msg,
                ),
              )
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index
                if (idx === undefined) continue

                if (!accumulatedToolCalls[idx]) {
                  accumulatedToolCalls[idx] = { index: idx, arguments: '' }
                }

                if (tc.id) {
                  accumulatedToolCalls[idx].id = tc.id
                }
                if (tc.function?.name) {
                  accumulatedToolCalls[idx].name = tc.function.name
                }
                if (tc.function?.arguments) {
                  accumulatedToolCalls[idx].arguments += tc.function.arguments
                }
              }
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }

      const normalizedToolCalls: ToolCall[] = accumulatedToolCalls
        .filter((tc) => tc && tc.name)
        .map((tc) => ({
          id: tc.id || generateId(),
          name: tc.name!,
          arguments: tc.arguments || '{}',
        }))

      if (normalizedToolCalls.length === 0) {
        const isLazyDone = !accumulatedText || 
          /^(done|done\.|done!|完成|完成。|好了|執行完畢|執行完畢。)$/i.test(accumulatedText.trim())
        if (isLazyDone) {
          const hasToolsInHistory = workingHistory.some((m) => m.role === 'tool')
          const finalContent = hasToolsInHistory
            ? generateFallbackResponse(workingHistory)
            : (accumulatedText || 'Done.')
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: finalContent }
                : msg,
            ),
          )
        }
        setProcessingStatus(null)
        return
      }

      const assistantMsgWithTools: Message = {
        id: assistantId,
        role: 'assistant',
        content: accumulatedText,
        model: route.model,
        routeLabel: route.label,
        routeReason: route.reason,
        toolCalls: normalizedToolCalls,
      }

      workingHistory.push(assistantMsgWithTools)

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: accumulatedText, toolCalls: normalizedToolCalls }
            : msg,
        ),
      )

      for (const toolCall of normalizedToolCalls) {
        let toolResult = ''

        try {
          const args = JSON.parse(toolCall.arguments || '{}') as Record<string, unknown>
          if (toolCall.name === 'browser_search_web') {
            setProcessingStatus(`Searching the web for “${String(args.query ?? '').trim() || 'your request'}”...`)
          } else if (toolCall.name === 'memory_search') {
            setProcessingStatus('Checking long-term memory...')
          } else if (toolCall.name === 'utilities_time_now') {
            setProcessingStatus('Checking the current time...')
          } else if (toolCall.name === 'browser_open_url') {
            setProcessingStatus('Opening the requested page...')
          } else if (toolCall.name === 'wolfram_query') {
            setProcessingStatus(`Querying WolframAlpha for “${String(args.query ?? '').trim()}”...`)
          } else {
            setProcessingStatus(`Running ${toolCall.name}...`)
          }
          toolResult = await executeTool(toolCall.name, args, { memories, settings })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown tool error'
          toolResult = JSON.stringify({ error: message })
        }

        const toolMessage: Message = {
          id: generateId(),
          role: 'tool',
          name: toolCall.name,
          toolCallId: toolCall.id,
          content: toolResult,
        }

        workingHistory.push(toolMessage)
        setMessages((prev) => [...prev, toolMessage])
      }
    }

    throw new Error('Tool loop limit reached before the model produced a final answer.')
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    const attachments = await Promise.all(imageFiles.map(fileToAttachment))
    setPendingAttachments((prev) => [...prev, ...attachments])
  }

  function handleSaveKey() {
    const trimmed = keyDraft.trim()
    localStorage.setItem(LS_KEY, trimmed)
    setApiKey(trimmed)
    setKeyDraft('')
    setShowKeyModal(false)
  }

  function handleQuickPrompt(text: string) {
    setInput(text)
  }

  async function handleSubmit() {
    const trimmed = input.trim()
    const hasAttachments = pendingAttachments.length > 0
    const needsKey = settings.provider === 'openai'
    if ((!trimmed && !hasAttachments) || isStreaming || (needsKey && !apiKey)) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      attachments: pendingAttachments,
    }

    const historySnapshot = [...messages, userMessage]
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setPendingAttachments([])
    setIsStreaming(true)
    setProcessingStatus('Message received. Preparing the request...')

    try {
      await runChatTurn(historySnapshot, userMessage)
      rememberUserInput(userMessage.content)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: `Error: ${message}`,
        },
      ])
    } finally {
      setIsStreaming(false)
      setProcessingStatus(null)
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {showKeyModal && (
        <ApiKeyModal
          keyDraft={keyDraft}
          setKeyDraft={setKeyDraft}
          onSave={handleSaveKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}
      <SettingsPanel
        show={showSettings}
        settings={settings}
        enabledServers={MCP_SERVERS}
        memoryCount={memories.length}
        onSave={(next) => setSettings(next)}
        onClose={() => setShowSettings(false)}
        onClearConversation={() => { setMessages([]); setShowSettings(false) }}
        onClearMemory={() => updateMemories([])}
        apiKey={apiKey}
        onApiKeyChange={(k) => { setApiKey(k); localStorage.setItem(LS_KEY, k) }}
      />
      <Header
        model={settings.model}
        routedModels={{
          autoRoutingEnabled: settings.autoRoutingEnabled,
          visionModel: settings.visionModel,
          reasoningModel: settings.reasoningModel,
        }}
        memoryCount={memories.length}
        processingStatus={processingStatus}
        isDark={isDark}
        onThemeToggle={toggleDark}
        onSettingsClick={() => setShowSettings(true)}
        onKeyClick={() => { setKeyDraft(''); setShowKeyModal(true) }}
        provider={settings.provider}
        isConnected={availableModels.length > 0}
      />
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        processingStatus={processingStatus}
        onQuickPrompt={handleQuickPrompt}
      />
      <ChatInput
        input={input}
        setInput={setInput}
        attachments={pendingAttachments}
        onFilesSelected={handleFilesSelected}
        onRemoveAttachment={(id) => setPendingAttachments((prev) => prev.filter((file) => file.id !== id))}
        isStreaming={isStreaming}
        processingStatus={processingStatus}
        apiKey={apiKey}
        provider={settings.provider}
        toolUseEnabled={settings.toolUseEnabled}
        enabledToolIds={settings.enabledMcpServers}
        availableToolServers={MCP_SERVERS}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
