import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function normalizeMathDelimiters(value: string) {
  return value
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expression: string) => `\n\n$$\n${expression.trim()}\n$$\n\n`)
    .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, expression: string) => `$${expression.trim()}$`)
}

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className ?? '')
          const codeString = String(children).replace(/\n$/, '')
          if (match) {
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="!my-2 !rounded-lg !text-xs"
              >
                {codeString}
              </SyntaxHighlighter>
            )
          }
          return (
            <code
              className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-rose-600 dark:bg-gray-700 dark:text-rose-400"
              {...props}
            >
              {children}
            </code>
          )
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        ul({ children }) {
          return <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
        },
        ol({ children }) {
          return <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
        },
        li({ children }) {
          return <li className="mb-0.5">{children}</li>
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-2 border-l-4 border-gray-300 pl-3 text-gray-500 italic dark:border-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          )
        },
        h1({ children }) { return <h1 className="mb-2 text-lg font-bold">{children}</h1> },
        h2({ children }) { return <h2 className="mb-2 text-base font-bold">{children}</h2> },
        h3({ children }) { return <h3 className="mb-2 text-sm font-bold">{children}</h3> },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-400">
              {children}
            </a>
          )
        },
        table({ children }) {
          return (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold dark:border-gray-600 dark:bg-gray-700">{children}</th>
        },
        td({ children }) {
          return <td className="border border-gray-300 px-2 py-1 dark:border-gray-600">{children}</td>
        },
        hr() {
          return <hr className="my-3 border-gray-200 dark:border-gray-700" />
        },
      }}
    >
      {normalizeMathDelimiters(content)}
    </ReactMarkdown>
  )
}
