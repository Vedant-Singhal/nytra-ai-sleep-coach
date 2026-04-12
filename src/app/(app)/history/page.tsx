'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import SleepCard from '@/components/sleep/SleepCard'
import { getSessions, toggleSessionExcluded, toggleSessionShared } from '@/lib/storage'
import { computeStreak, formatDuration, scoreColor } from '@/lib/scorer'
import type { SleepSession } from '@/types'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SleepSession[]>([])

  useEffect(() => { setSessions(getSessions()) }, [])

  function toggle(id: string) {
    toggleSessionExcluded(id)
    setSessions(getSessions())
  }

  function toggleShare(id: string) {
    toggleSessionShared(id)
    setSessions(getSessions())
  }

  // Stats only count included sessions
  const included = sessions.filter(s => !s.isExcluded)
  const streak = computeStreak(included)
  const last7 = included.slice(0, 7)
  const avgScore = last7.length ? Math.round(last7.reduce((s, x) => s + x.score, 0) / last7.length) : 0
  const avgDur = last7.length ? Math.round(last7.reduce((s, x) => s + x.durationMinutes, 0) / last7.length) : 0

  const grouped = sessions.reduce<Record<string, SleepSession[]>>((acc, s) => {
    const key = format(new Date(s.date), 'MMMM yyyy')
    ;(acc[key] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="px-4 pt-6 pb-4 animate-fade-up">
      <h1 className="text-2xl font-bold text-slate-100 mb-5">Sleep History</h1>

      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: '7-day avg score', value: `${avgScore}`, color: scoreColor(avgScore) },
            { label: '7-day avg sleep', value: formatDuration(avgDur), color: '#5EEAD4' },
            { label: 'Current streak', value: `${streak}🔥`, color: '#F59E0B' },
          ].map(stat => (
            <div key={stat.label} className="bg-bg-secondary rounded-xl p-3">
              <p className="font-bold text-xl mb-0.5" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-slate-500 text-[10px] leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-5xl mb-4">📊</span>
          <p className="text-slate-400 text-sm">No sleep sessions yet.<br />Keep your phone nearby tonight.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, group]) => (
          <div key={month} className="mb-6">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">{month}</p>
            <div className="space-y-2">
              {group.map(s => (
                <div key={s.id} className={s.isExcluded ? 'opacity-50' : ''}>
                  <Link href={`/sleep/${s.id}`} className="block">
                    <SleepCard
                      session={s}
                      showDate
                      onToggleExclude={e => { e.preventDefault(); e.stopPropagation(); toggle(s.id) }}
                      onToggleShare={e => { e.preventDefault(); e.stopPropagation(); toggleShare(s.id) }}
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
