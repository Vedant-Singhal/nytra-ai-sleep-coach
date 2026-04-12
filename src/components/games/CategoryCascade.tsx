'use client'

import { useEffect, useState } from 'react'

const CATEGORIES = [
  { title: 'Quiet Places', hints: ['Library', 'Garden', 'Shoreline'] },
  { title: 'Soft Textures', hints: ['Cotton', 'Velvet', 'Wool'] },
  { title: 'Calm Colors', hints: ['Sage', 'Sand', 'Sky blue'] },
  { title: 'Gentle Sounds', hints: ['Rain', 'Wind chimes', 'Ocean'] },
]

export default function CategoryCascade() {
  const [index, setIndex] = useState(0)
  const [seconds, setSeconds] = useState(20)

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setIndex(i => (i + 1) % CATEGORIES.length)
          return 20
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const current = CATEGORIES[index]

  return (
    <section className="bg-bg-secondary rounded-2xl p-4 border border-bg-tertiary">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-100 font-semibold text-sm">Category Cascade</h2>
        <span className="text-[10px] px-2 py-1 rounded-full bg-amber-300/15 text-amber-200">{seconds}s</span>
      </div>
      <p className="text-slate-500 text-xs mb-3">List 3 things mentally. No pressure, just gentle recall.</p>
      <div className="rounded-xl bg-bg-tertiary p-3.5">
        <p className="text-slate-100 font-semibold text-base">{current.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {current.hints.map(hint => (
            <span key={hint} className="text-[11px] px-2 py-1 rounded-full bg-bg-primary text-slate-400">{hint}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
