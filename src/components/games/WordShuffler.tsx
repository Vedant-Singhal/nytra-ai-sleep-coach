'use client'

import { useEffect, useMemo, useState } from 'react'

const SEED_GROUPS = [
  { seed: 'Ocean', words: ['Wave', 'Drift', 'Shell', 'Harbor', 'Mist', 'Coral'] },
  { seed: 'Forest', words: ['Moss', 'Fern', 'Trail', 'Pine', 'Glade', 'Brook'] },
  { seed: 'Sky', words: ['Cloud', 'Moon', 'Horizon', 'Comet', 'Breeze', 'Dawn'] },
  { seed: 'Cozy', words: ['Blanket', 'Candle', 'Pillow', 'Sofa', 'Warmth', 'Whisper'] },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WordShuffler() {
  const [groupIndex, setGroupIndex] = useState(0)
  const [wordIndex, setWordIndex] = useState(0)
  const [fade, setFade] = useState(true)

  const group = SEED_GROUPS[groupIndex]
  const words = useMemo(() => shuffle(group.words), [groupIndex, group.words])

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setWordIndex(prev => {
          if (prev >= words.length - 1) {
            setGroupIndex(g => (g + 1) % SEED_GROUPS.length)
            return 0
          }
          return prev + 1
        })
        setFade(true)
      }, 220)
    }, 5000)

    return () => clearInterval(timer)
  }, [words.length])

  return (
    <section className="bg-bg-secondary rounded-2xl p-4 border border-bg-tertiary">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-100 font-semibold text-sm">Word Shuffler</h2>
        <span className="text-[10px] px-2 py-1 rounded-full bg-accent-teal/15 text-accent-teal">5s flow</span>
      </div>
      <p className="text-slate-500 text-xs mb-3">Seed: <span className="text-slate-300">{group.seed}</span> · visualize each word softly.</p>
      <div className="rounded-xl bg-bg-tertiary px-3 py-6 text-center min-h-[92px] flex items-center justify-center">
        <p className="text-3xl font-light text-slate-100 transition-opacity duration-200" style={{ opacity: fade ? 1 : 0 }}>
          {words[wordIndex]}
        </p>
      </div>
    </section>
  )
}
