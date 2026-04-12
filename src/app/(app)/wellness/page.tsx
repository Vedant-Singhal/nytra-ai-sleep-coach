'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSessions } from '@/lib/storage'
import { buildSleepContext } from '@/lib/wellnessContext'
import { scoreColor } from '@/lib/scorer'
import type { SleepContextPayload } from '@/lib/wellnessContext'

export default function WellnessPage() {
  const router = useRouter()
  const [ctx, setCtx] = useState<SleepContextPayload | null>(null)

  useEffect(() => {
    const sessions = getSessions()
    if (sessions.length) setCtx(buildSleepContext(sessions))
  }, [])

  const showData = ctx && ctx.severity !== 'NONE' && ctx.sessionCount >= 5

  return (
    <div className="px-4 pt-6 pb-24 space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 text-sm mb-5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold gradient-text">You&apos;re not alone in this.</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Sleep and mental health are deeply connected. Your data is already here — let&apos;s talk about it.
        </p>
      </div>

      {/* Evidence context strip */}
      {showData && ctx && (
        <div className="aurora-bg rounded-2xl p-4 border border-slate-700/20">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Your last 30 days</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-bg-tertiary/60 rounded-xl p-3 text-center">
              <p className="font-bold text-xl" style={{ color: scoreColor(ctx.avgScore30) }}>
                {ctx.avgScore30}
              </p>
              <p className="text-slate-500 text-[10px] mt-0.5">Avg score</p>
            </div>
            <div className="bg-bg-tertiary/60 rounded-xl p-3 text-center">
              <p className="font-bold text-xl text-accent-teal">{ctx.avgDuration30.toFixed(1)}h</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Avg sleep</p>
            </div>
            <div className="bg-bg-tertiary/60 rounded-xl p-3 text-center">
              <p className="font-bold text-xl" style={{ color: ctx.shortNights14 >= 3 ? '#F59E0B' : '#5EEAD4' }}>
                {ctx.shortNights14}
              </p>
              <p className="text-slate-500 text-[10px] mt-0.5">Short nights</p>
            </div>
          </div>
        </div>
      )}

      {/* Primary CTA — in-app AI companion */}
      <Link
        href="/wellness/chat"
        className="block aurora-bg rounded-2xl p-5 border border-slate-700/20"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(94,234,212,0.15) 0%, rgba(129,140,248,0.15) 100%)' }}
          >
            🧠
          </div>
          <div>
            <p className="text-slate-100 font-semibold text-sm">Talk about your sleep</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(94,234,212,0.1)', color: '#5EEAD4' }}>
              Uses your real data
            </span>
          </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed mb-3">
          Your AI companion has seen your last 30 nights. No sign-up, no judgment — just a conversation grounded in your actual sleep patterns.
        </p>
        {ctx && ctx.sessionCount >= 5 && (
          <div className="flex gap-2 mb-4">
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-bg-tertiary text-slate-400">
              Avg {ctx.avgScore30}/100
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-bg-tertiary text-slate-400">
              {ctx.avgDuration30.toFixed(1)}h avg
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-bg-tertiary text-slate-400">
              {ctx.trend} trend
            </span>
          </div>
        )}
        <div
          className="w-full py-3.5 rounded-xl font-bold text-center text-sm"
          style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
        >
          Start a conversation →
        </div>
      </Link>

      {/* FeelBetter in-app */}
      <Link
        href="/wellness/feelbot"
        className="block bg-bg-secondary rounded-2xl p-5 border border-bg-tertiary"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(94,234,212,0.1)' }}>
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-semibold text-sm">FeelBetter AI Companion</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(94,234,212,0.08)', color: '#5EEAD4' }}>
              Embedded — no new tab
            </span>
          </div>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          Chat with FeelBetter&apos;s AI companion right here in the app. Paste your sleep summary for personalised support.
        </p>
      </Link>

      {/* IIT Delhi — compact external link */}
      <a
        href="https://mentalhealth-bsw.iitd.ac.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-bg-secondary rounded-2xl px-5 py-4"
      >
        <span className="text-lg flex-shrink-0">🏛</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-300 text-sm font-medium">IIT Delhi Wellness</p>
          <p className="text-slate-500 text-xs">Real human counsellors · Free & confidential</p>
        </div>
        <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {/* Not ready yet */}
      <div className="bg-bg-secondary rounded-2xl p-5">
        <p className="text-slate-300 font-semibold text-sm mb-3">Not ready to talk?</p>
        <div className="space-y-1">
          {[
            { href: '/guidelines', icon: '📖', label: 'Sleep Guidelines', sub: 'Science-backed habits' },
            { href: '/music', icon: '🎵', label: 'Sleep Sounds', sub: 'Unwind with calming audio' },
            { href: '/games', icon: '🧩', label: 'Cognitive Shuffle', sub: 'Quiet racing thoughts' },
          ].map((item, i, arr) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 bg-bg-tertiary rounded-xl px-4 py-3 ${i < arr.length - 1 ? 'mb-1' : ''}`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-sm font-medium">{item.label}</p>
                <p className="text-slate-500 text-xs">{item.sub}</p>
              </div>
              <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
        <p className="text-[11px] text-slate-600 text-center mt-4">You don&apos;t have to fix everything tonight.</p>
      </div>

      {/* Medical disclaimer */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <p className="text-red-400 text-xs font-semibold mb-1.5">⚠️ Not a crisis service</p>
        <p className="text-slate-500 text-xs leading-relaxed">
          This feature is not a substitute for emergency mental health care. If you are in immediate distress, please call{' '}
          <a href="tel:9152987821" className="text-slate-300 underline">iCall (9152987821)</a> or{' '}
          <a href="tel:18602662345" className="text-slate-300 underline">Vandrevala Foundation (1860-2662-345)</a>.
        </p>
      </div>
    </div>
  )
}
