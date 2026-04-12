'use client'
import { useState } from 'react'
import Link from 'next/link'
import { computeStressSignal, isSnoozed, setSnoozeUntil } from '@/lib/stressDetector'
import { scoreColor } from '@/lib/scorer'
import type { SleepSession } from '@/types'

interface Props { sessions: SleepSession[] }

export default function CounsellingCard({ sessions }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)

  const signal = computeStressSignal(sessions.filter(s => !s.isExcluded))

  if (signal.severity === 'NONE' || isSnoozed() || dismissed) return null

  function snooze(days: number) {
    setSnoozeUntil(days)
    setDismissed(true)
    setShowSnooze(false)
  }

  const snoozeSheet = (
    <SnoozeSheet show={showSnooze} onSnooze={snooze} onCancel={() => setShowSnooze(false)} />
  )

  // ── MILD ─────────────────────────────────────────────────────────────────────
  if (signal.severity === 'MILD') {
    return (
      <>
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: '#1A1608', border: '1px solid rgba(245,158,11,0.18)' }}>
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl" style={{ background: '#F59E0B' }} />
          <div className="ml-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🌙</span>
                <p className="text-amber-200 font-semibold text-sm">Your sleep has been a bit off lately.</p>
              </div>
              <button onClick={() => setShowSnooze(true)} className="text-slate-600 hover:text-slate-400 flex-shrink-0 transition-colors p-0.5" aria-label="Dismiss">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-amber-200/60 text-xs mt-1.5 leading-relaxed">
              It happens to all of us. A few small shifts can make a real difference — and so can talking to someone.
            </p>
            <Link href="/wellness" className="inline-block mt-2.5 text-amber-400 text-xs font-medium underline underline-offset-2">
              Explore support options →
            </Link>
          </div>
        </div>
        {snoozeSheet}
      </>
    )
  }

  // ── MODERATE ─────────────────────────────────────────────────────────────────
  if (signal.severity === 'MODERATE') {
    return (
      <>
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: '#110F1E', border: '1px solid rgba(129,140,248,0.25)' }}>
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl" style={{ background: '#818CF8' }} />
          <div className="ml-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💜</span>
                <p className="text-slate-200 font-semibold text-sm">Sleep and stress tend to travel together.</p>
              </div>
              <button onClick={() => setShowSnooze(true)} className="text-slate-600 hover:text-slate-400 flex-shrink-0 transition-colors p-0.5" aria-label="Dismiss">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Your recent sleep patterns suggest your body might need some extra care. You don&apos;t have to figure it out alone.
            </p>
            <Link href="/wellness" className="inline-block mt-2.5 text-accent-violet text-xs font-medium underline underline-offset-2">
              See what might help →
            </Link>
          </div>
        </div>
        {snoozeSheet}
      </>
    )
  }

  // ── HIGH ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="aurora-bg rounded-2xl p-4 border border-slate-700/30">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🤍</span>
            <h3 className="gradient-text font-semibold text-sm">You&apos;ve been carrying a lot.</h3>
          </div>
          <button onClick={() => setShowSnooze(true)} className="text-slate-600 hover:text-slate-400 transition-colors p-0.5 flex-shrink-0" aria-label="Dismiss">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Mini stats strip */}
        <div className="flex gap-3 mb-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(15,20,32,0.6)' }}>
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">30-day avg</p>
            <p className="font-bold text-lg leading-none" style={{ color: scoreColor(signal.avgScore30) }}>{signal.avgScore30}</p>
          </div>
          <div className="w-px bg-slate-700/60 self-stretch" />
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">Avg sleep</p>
            <p className="font-bold text-lg leading-none text-accent-teal">{signal.avgDuration30.toFixed(1)}h</p>
          </div>
          {signal.shortNights14 > 0 && (
            <>
              <div className="w-px bg-slate-700/60 self-stretch" />
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">Short nights</p>
                <p className="font-bold text-lg leading-none" style={{ color: signal.shortNights14 >= 3 ? '#F59E0B' : '#94A3B8' }}>
                  {signal.shortNights14}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-slate-300 text-xs leading-relaxed mb-4">
          Your sleep data shows a pattern that often shows up when we&apos;re overwhelmed. Reaching out — even just to an AI — is a real step.
        </p>

        <Link
          href="/wellness/chat"
          className="block w-full py-3 rounded-xl font-semibold text-center text-sm btn-press"
          style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
        >
          Talk about your sleep →
        </Link>

        <button onClick={() => snooze(7)} className="w-full text-slate-500 text-xs mt-2 py-1.5">
          Remind me in 7 days
        </button>
      </div>
      {snoozeSheet}
    </>
  )
}

// ── Snooze bottom-sheet ────────────────────────────────────────────────────────

function SnoozeSheet({
  show,
  onSnooze,
  onCancel,
}: {
  show: boolean
  onSnooze: (days: number) => void
  onCancel: () => void
}) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg mx-auto bg-bg-secondary rounded-t-3xl p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-bg-tertiary rounded-full mx-auto mb-5" />
        <h2 className="text-slate-100 font-bold text-base mb-1">Take a break from this reminder?</h2>
        <p className="text-slate-500 text-sm mb-5 leading-relaxed">
          It&apos;ll come back if your sleep patterns suggest it&apos;s helpful.
        </p>
        <div className="space-y-2 mb-3">
          <button
            onClick={() => onSnooze(3)}
            className="w-full bg-bg-tertiary text-slate-200 font-medium rounded-xl py-3.5 text-sm hover:bg-slate-700/50 transition-colors"
          >
            Snooze for 3 days
          </button>
          <button
            onClick={() => onSnooze(7)}
            className="w-full bg-bg-tertiary text-slate-200 font-medium rounded-xl py-3.5 text-sm hover:bg-slate-700/50 transition-colors"
          >
            Snooze for a week
          </button>
        </div>
        <button onClick={onCancel} className="w-full text-slate-500 text-sm py-2">
          Keep showing this
        </button>
      </div>
    </div>
  )
}
