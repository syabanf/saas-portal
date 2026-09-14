import { Check, Copy } from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/cn'

export interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  className?: string
  /** `light` sits inside a card on surface; `dark` is the ink console block. */
  tone?: 'dark' | 'light'
}

export function CodeBlock({ code, title, className, tone = 'dark' }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked; nothing to do */
    }
  }
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        tone === 'dark' ? 'bg-ink text-white' : 'bg-surface text-foreground',
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            'flex items-center justify-between px-4 pt-3 text-[11px] font-semibold tracking-wider uppercase',
            tone === 'dark' ? 'text-on-ink-muted' : 'text-muted',
          )}
        >
          {title}
        </div>
      ) : null}
      <button
        type="button"
        onClick={copy}
        className={cn(
          'absolute top-3 right-3 flex size-8 items-center justify-center rounded-full transition-colors [&_svg]:size-3.5',
          tone === 'dark'
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-card text-body shadow-card hover:bg-surface-2',
        )}
        aria-label="Copy"
      >
        {copied ? <Check /> : <Copy />}
      </button>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}
