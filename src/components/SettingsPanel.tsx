import { useEffect, useState } from 'react'
import type { MCPServerDefinition, Settings } from '../types'
import { PROVIDER_FALLBACK_MODELS, getModelsUrl } from '../constants'

interface SettingsPanelProps {
  show: boolean
  settings: Settings
  enabledServers: MCPServerDefinition[]
  memoryCount: number
  onSave: (settings: Settings) => void
  onClose: () => void
  onClearConversation: () => void
  onClearMemory: () => void
  apiKey: string
  onApiKeyChange: (k: string) => void
}

export default function SettingsPanel({
  show,
  settings,
  enabledServers,
  memoryCount,
  onSave,
  onClose,
  onClearConversation,
  onClearMemory,
  apiKey,
  onApiKeyChange,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [localKey, setLocalKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (show) {
      setDraft(settings)
      setLocalKey(apiKey)
    }
  }, [show, settings, apiKey])

  useEffect(() => {
    if (!show) return

    const isLmStudio = draft.provider === 'lm-studio'
    const needsKey = draft.provider === 'openai'

    if (needsKey && !localKey) {
      setFetchedModels([])
      setFetchError('API Key is required for OpenAI preset.')
      return
    }

    let active = true
    setIsLoadingModels(true)
    setFetchError(null)

    const modelsUrl = getModelsUrl(draft.apiUrl)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (localKey) {
      headers['Authorization'] = `Bearer ${localKey}`
    } else if (isLmStudio) {
      headers['Authorization'] = 'Bearer lm-studio'
    }

    fetch(modelsUrl, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { data: { id: string }[] }) => {
        if (!active) return
        if (data && Array.isArray(data.data)) {
          const ids = data.data.map((model) => model.id)
          setFetchedModels(ids)
          
          setDraft((current) => {
            const next = { ...current }
            if (ids.length > 0) {
              if (!current.model || !ids.includes(current.model)) {
                next.model = ids[0]
              }
              if (!current.visionModel || !ids.includes(current.visionModel)) {
                next.visionModel = ids[0]
              }
              if (!current.reasoningModel || !ids.includes(current.reasoningModel)) {
                next.reasoningModel = ids[0]
              }
            }
            return next
          })
        } else {
          setFetchedModels([])
        }
        setIsLoadingModels(false)
      })
      .catch((err) => {
        if (!active) return
        console.error('Failed to fetch models in settings:', err)
        setFetchedModels([])
        setFetchError('Failed to load models from endpoint.')
        setIsLoadingModels(false)
      })

    return () => {
      active = false
    }
  }, [show, draft.apiUrl, draft.provider, localKey])

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleProviderChange(provider: 'lm-studio' | 'openai' | 'custom') {
    let url = draft.apiUrl
    const presets = PROVIDER_FALLBACK_MODELS[provider] || []
    const defaultModel = presets[0] || ''
    
    if (provider === 'lm-studio') {
      url = 'http://127.0.0.1:1234/v1/chat/completions'
    } else if (provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions'
    }
    
    setDraft((current) => ({
      ...current,
      provider,
      apiUrl: url,
      model: defaultModel,
      visionModel: defaultModel,
      reasoningModel: defaultModel,
    }))
  }

  function toggleServer(serverId: string) {
    patch(
      'enabledMcpServers',
      draft.enabledMcpServers.includes(serverId)
        ? draft.enabledMcpServers.filter((id) => id !== serverId)
        : [...draft.enabledMcpServers, serverId],
    )
  }

  function renderModelInput(
    value: string,
    onChange: (next: string) => void,
  ) {
    const modelsList = fetchedModels.length > 0
      ? fetchedModels
      : (PROVIDER_FALLBACK_MODELS[draft.provider] || [])

    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 cursor-pointer"
      >
        {!modelsList.includes(value) && value && (
          <option value={value}>{value} (Current)</option>
        )}
        {modelsList.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    )
  }

  return (
    <>
      {show && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-96 max-w-full flex-col bg-white shadow-2xl transition-transform duration-200 dark:bg-gray-800 ${
          show ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
            Configure local LM Studio or cloud API. Features include streaming tool execution, memory, and routing.
          </div>

          {/* API Connection Settings */}
          <div className="space-y-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 p-3.5 dark:border-gray-700/60 dark:bg-gray-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              API Connection
            </h3>
            
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Provider Preset
              </label>
              <select
                value={draft.provider}
                onChange={(e) => handleProviderChange(e.target.value as any)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="lm-studio">LM Studio (Local)</option>
                <option value="openai">OpenAI Cloud</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                API Completions URL
              </label>
              <input
                type="text"
                value={draft.apiUrl}
                onChange={(e) => patch('apiUrl', e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                API Key {draft.provider === 'lm-studio' && '(Optional)'}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => {
                    setLocalKey(e.target.value)
                    onApiKeyChange(e.target.value)
                  }}
                  placeholder={draft.provider === 'lm-studio' ? 'Not required for local' : 'sk-…'}
                  className="w-full rounded-xl border border-gray-300 bg-white pl-3 pr-10 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showKey ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                WolframAlpha AppID
              </label>
              <input
                type="text"
                value={draft.wolframAppId || ''}
                onChange={(e) => patch('wolframAppId', e.target.value)}
                placeholder="e.g. 2KQQ77-8Y6V9YW7XY"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Default Model
              </label>
              {isLoadingModels && (
                <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>
              )}
              {fetchError && (
                <span className="text-[10px] text-amber-500" title={fetchError}>Offline / Preset</span>
              )}
            </div>
            {renderModelInput(draft.model, (value) => patch('model', value))}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Auto Routing
              </label>
              <input
                type="checkbox"
                checked={draft.autoRoutingEnabled}
                onChange={(e) => patch('autoRoutingEnabled', e.target.checked)}
                className="h-4 w-4 rounded accent-blue-500"
              />
            </div>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Vision Model
                </label>
                {renderModelInput(draft.visionModel, (value) => patch('visionModel', value))}
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Reasoning Model
                </label>
                {renderModelInput(draft.reasoningModel, (value) => patch('reasoningModel', value))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Long-Term Memory
              </label>
              <input
                type="checkbox"
                checked={draft.longTermMemoryEnabled}
                onChange={(e) => patch('longTermMemoryEnabled', e.target.checked)}
                className="h-4 w-4 rounded accent-blue-500"
              />
            </div>
            <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-500">
              Stored memories: {memoryCount}
            </p>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Retrieved Memory Limit
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={draft.maxMemoryItems}
              onChange={(e) => patch('maxMemoryItems', Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tool Use
              </label>
              <input
                type="checkbox"
                checked={draft.toolUseEnabled}
                onChange={(e) => patch('toolUseEnabled', e.target.checked)}
                className="h-4 w-4 rounded accent-blue-500"
              />
            </div>
            <div className="space-y-2">
              {['utilities', 'memory', 'browser', 'wolframalpha'].map((serverId) => {
                const server = enabledServers.find((item) => item.id === serverId)
                const isEnabled = draft.enabledMcpServers.includes(serverId)
                const name = server?.name ?? `${serverId} server`
                const description = server?.description ?? 'Available after save.'
                return (
                  <label
                    key={serverId}
                    className="flex items-start gap-3 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleServer(serverId)}
                      className="mt-0.5 h-4 w-4 rounded accent-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{name}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              System Prompt
            </label>
            <textarea
              rows={4}
              value={draft.systemPrompt}
              onChange={(e) => patch('systemPrompt', e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Temperature
              </label>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{draft.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={draft.temperature}
              onChange={(e) => patch('temperature', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Top-P
              </label>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{draft.topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={draft.topP}
              onChange={(e) => patch('topP', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Max Tokens
            </label>
            <input
              type="number"
              min={-1}
              value={draft.maxTokens}
              onChange={(e) => patch('maxTokens', parseInt(e.target.value, 10) || -1)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Max Conversation History (Memory Window)
            </label>
            <p className="mb-2 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
              Limits history turns sent to the model. Keeping this low (e.g. 4-8 turns) prevents prompt processing latency on local inference.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={draft.memoryWindow}
                onChange={(e) => patch('memoryWindow', parseInt(e.target.value, 10) || 0)}
                className="flex-1 accent-blue-500"
              />
              <span className="font-mono text-sm font-semibold w-8 text-right text-gray-700 dark:text-gray-300">
                {draft.memoryWindow === 0 ? '∞' : draft.memoryWindow}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={() => {
              onSave(draft)
              onClose()
            }}
            className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 shadow-sm"
          >
            Save
          </button>
          <button
            onClick={onClearConversation}
            className="w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Clear Conversation
          </button>
          <button
            onClick={onClearMemory}
            className="w-full rounded-xl border border-red-200 py-2 text-sm text-red-500 transition hover:bg-red-50"
          >
            Clear Long-Term Memory
          </button>
        </div>
      </aside>
    </>
  )
}
