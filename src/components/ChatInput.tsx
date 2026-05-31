import { useEffect, useRef } from 'react'
import type { Attachment } from '../types'

interface ChatInputProps {
  input: string
  setInput: (v: string) => void
  attachments: Attachment[]
  onFilesSelected: (files: FileList | null) => void
  onRemoveAttachment: (id: string) => void
  isStreaming: boolean
  processingStatus: string | null
  apiKey: string
  provider: string
  onSubmit: () => void
}

export default function ChatInput({
  input,
  setInput,
  attachments,
  onFilesSelected,
  onRemoveAttachment,
  isStreaming,
  processingStatus,
  apiKey,
  provider,
  onSubmit,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseTextareaHeight = 40

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (!input) {
      el.style.height = `${baseTextareaHeight}px`
      return
    }
    el.style.height = 'auto'
    el.style.height = `${Math.max(baseTextareaHeight, el.scrollHeight)}px`
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  const needsKey = provider === 'openai'
  const isSendDisabled = (!input.trim() && attachments.length === 0) || isStreaming || (needsKey && !apiKey)

  return (
    <footer className="border-t border-gray-200 bg-white px-3 py-2 shadow-[0_-1px_4px_rgba(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-800 sm:px-4 sm:py-3">
      <form className="mx-auto max-w-3xl" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
        {processingStatus && (
          <div className="mb-3 hidden items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100 sm:flex">
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute h-5 w-5 animate-ping rounded-full bg-blue-400/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            </span>
            <span>{processingStatus}</span>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
              >
                <img src={attachment.dataUrl} alt={attachment.name} className="h-20 w-20 object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onFilesSelected(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-gray-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 sm:h-[44px] sm:w-[44px]"
            title="Attach image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6Zm1.5 8.69 3.22-3.22a.75.75 0 0 1 1.06 0l3.97 3.97 5.47-5.47a.75.75 0 0 1 1.06 0L21 13.19V18a.75.75 0 0 1-.75.75H3.75A.75.75 0 0 1 3 18v-3.31ZM8.25 9a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            className="max-h-[34dvh] min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm leading-relaxed outline-none transition-[border-color,box-shadow] focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500 sm:max-h-40 sm:min-h-[44px] sm:py-2.5"
            placeholder="Message..."
            rows={1}
            value={input}
            disabled={isStreaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            disabled={isSendDisabled}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40 sm:h-[44px] sm:w-[44px]"
            aria-label="Send message"
          >
            {isStreaming ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-[1px]">
                <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </footer>
  )
}
