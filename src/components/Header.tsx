import { getProviderLabel } from '../constants'

interface HeaderProps {
  model: string
  routedModels: {
    autoRoutingEnabled: boolean
    visionModel: string
    reasoningModel: string
  }
  memoryCount: number
  processingStatus: string | null
  isDark: boolean
  onThemeToggle: () => void
  onSettingsClick: () => void
  onKeyClick: () => void
  provider: string
  isConnected: boolean
}

export default function Header({
  model,
  routedModels,
  memoryCount,
  processingStatus,
  isDark,
  onThemeToggle,
  onSettingsClick,
  onKeyClick,
  provider,
  isConnected,
}: HeaderProps) {
  const providerLabel = getProviderLabel(provider)

  return (
    <header className="border-b border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-4 sm:py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-gray-800 dark:text-gray-100 font-heading sm:text-lg">
            LLM Chatroom v2
          </h1>
          <span
            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none sm:hidden ${
              isConnected
                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
            title={`${providerLabel} ${isConnected ? 'Connected' : 'Offline'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
          {processingStatus && (
            <div className="hidden items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700 md:flex dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              Working
            </div>
          )}
          <button
            onClick={onThemeToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 sm:h-9 sm:w-9"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={onSettingsClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 sm:h-9 sm:w-9"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={onKeyClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 sm:h-9 sm:w-9"
            title="Set API Key"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a.75.75 0 0 0-.221.53V19.5a.75.75 0 0 0 .75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5a.75.75 0 0 0 .75-.75V16.5h1.5a.75.75 0 0 0 .53-.22l.5-.5c.19-.189.517-.288.907-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-2 hidden min-w-0 space-y-1.5 sm:block">
        <div className="flex min-w-0 items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span title={model} className="min-w-0 truncate">
            Base: {model || '—'}
          </span>
          <span className="hidden text-gray-300 dark:text-gray-700 sm:inline">|</span>
          <span
            className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
              isConnected
                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            {providerLabel} {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wide">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            Memory {memoryCount}
          </span>
          {routedModels.autoRoutingEnabled && (
            <>
              <span
                title={routedModels.visionModel || 'same'}
                className="max-w-[10.5rem] truncate rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              >
                Vision {routedModels.visionModel || 'same'}
              </span>
              <span
                title={routedModels.reasoningModel || 'same'}
                className="max-w-[10.5rem] truncate rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                Reasoning {routedModels.reasoningModel || 'same'}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
