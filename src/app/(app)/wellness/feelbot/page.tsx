'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSessions } from '@/lib/storage'
import { buildSleepContext, formatSleepSummaryForClipboard } from '@/lib/wellnessContext'

export default function FeelBotPage() {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    const sessions = getSessions()
    if (sessions.length) {
      const ctx = buildSleepContext(sessions)
      setSummary(formatSleepSummaryForClipboard(ctx))
    }
  }, [])

  async function handleCopy() {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback: select a hidden textarea
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-bg-primary" style={{ height: '100dvh' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-bg-tertiary flex-shrink-0"
        style={{ background: 'rgba(15,20,32,0.9)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: 'rgba(94,234,212,0.15)' }}>
            🤖
          </div>
          <div>
            <p className="text-slate-100 font-semibold text-sm leading-none">FeelBetter Companion</p>
            <p className="text-slate-500 text-[10px] mt-0.5">feelbetterbot.com</p>
          </div>
        </div>
        <a
          href="https://www.feelbetterbot.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600"
          title="Open in new tab"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Sleep context banner */}
      {!collapsed && summary && (
        <div
          className="flex-shrink-0 px-4 py-3 border-b border-bg-tertiary"
          style={{ background: 'rgba(94,234,212,0.04)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-accent-teal text-xs font-semibold mb-1">Share your sleep data for better support</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Tap "Copy summary" then paste it as your first message so FeelBetter has context.
              </p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-600 flex-shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="mt-2.5 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: copied ? 'rgba(94,234,212,0.15)' : 'rgba(94,234,212,0.1)',
              border: '1px solid rgba(94,234,212,0.25)',
              color: copied ? '#5EEAD4' : '#94A3B8',
            }}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied to clipboard!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy sleep summary
              </>
            )}
          </button>
        </div>
      )}

      {/* Collapsed banner restore */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex-shrink-0 text-center py-2 text-accent-teal text-[11px] font-medium border-b border-bg-tertiary"
          style={{ background: 'rgba(94,234,212,0.04)' }}
        >
          Show sleep context banner ∨
        </button>
      )}

      {/* iframe */}
      <iframe
        src="https://www.feelbetterbot.com"
        className="flex-1 w-full border-0"
        allow="microphone; camera; clipboard-write; autoplay"
        title="FeelBetter Companion"
      />

      {/* Fallback hint */}
      <div className="flex-shrink-0 py-2 text-center border-t border-bg-tertiary"
        style={{ background: '#0A0D14' }}>
        <p className="text-slate-700 text-[10px]">
          Not loading?{' '}
          <a
            href="https://www.feelbetterbot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 underline"
          >
            Open in browser
          </a>
        </p>
      </div>
    </div>
  )
}
