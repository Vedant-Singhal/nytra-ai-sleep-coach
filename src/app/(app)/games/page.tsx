'use client'

import Link from 'next/link'
import BreathSyncCircle from '@/components/games/BreathSyncCircle'
import CategoryCascade from '@/components/games/CategoryCascade'
import WordShuffler from '@/components/games/WordShuffler'

export default function GamesPage() {
  return (
    <div className="px-4 pt-6 pb-24 animate-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/home" className="text-slate-400 flex items-center gap-1.5 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>

      <div className="mb-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-accent-teal mb-1">Nytra Sleep Lab</p>
        <h1 className="text-2xl font-bold text-slate-100">Quiet Your Mind</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a calm cognitive exercise and let thoughts slow down naturally.</p>
      </div>

      <div className="space-y-3">
        <WordShuffler />
        <CategoryCascade />
        <BreathSyncCircle />
      </div>

      <section className="mt-5 bg-bg-secondary rounded-2xl p-4 border border-bg-tertiary">
        <h2 className="text-slate-100 font-semibold text-sm mb-2">Explore More</h2>
        <p className="text-slate-500 text-xs mb-3">
          Want deeper scientific audio-shuffling packs? Explore Sleep Button resources.
        </p>
        <a
          href="https://mysleepbutton.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
        >
          Open Advanced Packs
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </section>
    </div>
  )
}
