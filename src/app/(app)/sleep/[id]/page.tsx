'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ScoreDial from '@/components/sleep/ScoreDial'
import SleepTimeline from '@/components/sleep/SleepTimeline'
import CounsellingCard from '@/components/sleep/CounsellingCard'
import { getSessions, toggleSessionShared } from '@/lib/storage'
import { formatDuration, formatTime, scoreColor, scoreGrade, scoreLabel } from '@/lib/scorer'
import type { SleepSession } from '@/types'

export default function SleepDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<SleepSession | null>(null)
  const [allSessions, setAllSessions] = useState<SleepSession[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const sessions = getSessions()
    setAllSessions(sessions)
    setSession(sessions.find(s => s.id === id) ?? null)
  }, [id])

  function handleShareToggle() {
    if (!session) return
    if (session.isShared) {
      const shouldUnshare = window.confirm('Turn off sharing for this report? It will be removed from the community feed.')
      if (!shouldUnshare) return
    }

    toggleSessionShared(session.id)
    const next = getSessions().find(s => s.id === session.id) ?? null
    setSession(next)
  }

  if (!session) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const color = scoreColor(session.score)
  const motionLabel = session.motionIndex < 0.2 ? 'Very low' : session.motionIndex < 0.4 ? 'Low' : session.motionIndex < 0.6 ? 'Moderate' : 'High'
  const motionColor = session.motionIndex < 0.3 ? '#22C55E' : session.motionIndex < 0.6 ? '#F59E0B' : '#EF4444'
  const grade = scoreGrade(session.score)

  const insight = (() => {
    if (session.score >= 85) return { text: 'Great night! Your phone was still and you hit your duration goal. Keep it up.', icon: '🌟' }
    if (session.durationMinutes < 360) return { text: 'You slept under 6 hours. Try getting to bed 30 minutes earlier tonight.', icon: '⏰' }
    if (session.motionIndex > 0.6) return { text: 'High phone activity overnight. A cooler, darker room can reduce restlessness.', icon: '🌡️' }
    return { text: 'Solid night. Consistent bedtimes are the single biggest driver of sleep quality.', icon: '💡' }
  })()

  const stats = [
    { label: 'Duration', value: formatDuration(session.durationMinutes), icon: '⏱' },
    { label: 'Bedtime', value: formatTime(session.bedtime), icon: '🌙' },
    { label: 'Wake time', value: formatTime(session.wakeTime), icon: '☀️' },
    { label: 'Phone activity', value: motionLabel, icon: '📱', color: motionColor },
    { label: 'Score', value: `${session.score}`, icon: '⭐', color },
    { label: 'Grade', value: grade, icon: '🎓', color },
  ]

  return (
    <div className="animate-fade-up">
      {/* Score hero — color-reactive gradient */}
      <div className="relative px-4 pt-4 pb-8 mb-3" style={{
        background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 70%), #0A0D14`
      }}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-400 text-sm btn-press">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <span className="text-slate-300 font-semibold text-sm">Sleep Report</span>
          <button
            onClick={handleShareToggle}
            className={`text-sm font-medium btn-press ${session.isShared ? 'text-green-400' : 'text-accent-teal'}`}
          >
            {session.isShared ? 'Shared · Turn Off' : 'Share'}
          </button>
        </div>

        {/* Dial */}
        <div className="flex justify-center">
          <ScoreDial score={session.score} size={196} />
        </div>

        {/* Date subtitle */}
        <p className="text-center text-slate-500 text-xs mt-3">
          {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="px-4 pb-8 space-y-3">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map(s => (
            <div key={s.label} className="bg-bg-secondary rounded-2xl p-3.5 flex flex-col gap-1.5 card-hover">
              <span className="text-base">{s.icon}</span>
              <p className="font-bold text-sm leading-tight" style={{ color: s.color ?? '#F1F5F9' }}>{s.value}</p>
              <p className="text-slate-600 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-bg-secondary rounded-2xl p-4">
          <p className="text-slate-300 font-semibold text-sm mb-3">Sleep timeline</p>
          <SleepTimeline session={session} />
        </div>

        {/* Insight card */}
        <div className="rounded-2xl p-4 flex gap-3" style={{
          background: `linear-gradient(135deg, ${color}10 0%, transparent 60%), #111827`,
          border: `1px solid ${color}25`
        }}>
          <span className="text-xl flex-shrink-0">{insight.icon}</span>
          <p className="text-slate-300 text-sm leading-relaxed">{insight.text}</p>
        </div>

        {/* Counselling card */}
        <CounsellingCard sessions={allSessions} />

        {/* Signals accordion */}
        <div className="bg-bg-secondary rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-4 btn-press"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🔍</span>
              <span className="text-slate-300 font-semibold text-sm">How we detected this</span>
            </div>
            <svg className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <div className="px-4 pb-4 border-t border-bg-tertiary pt-3 space-y-2.5 animate-fade-in">
              {[
                { icon: '📱', text: `Screen activity stopped around ${formatTime(session.bedtime)}` },
                { icon: '📳', text: `Phone stillness: ${motionLabel.toLowerCase()} — ${session.motionIndex < 0.4 ? 'good, minimal movement' : 'elevated movement detected'}` },
                { icon: '☀️', text: `Activity resumed at ${formatTime(session.wakeTime)}` },
              ].map((item, i) => (
                <div key={i} className="flex gap-2.5 text-slate-400 text-xs">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
              <p className="text-slate-600 text-[11px] italic pt-1 border-t border-bg-tertiary">
                Score = duration (40%) + consistency (20%) + phone stillness (20%) + bedtime alignment (20%)
              </p>
            </div>
          )}
        </div>

        {/* Share CTA */}
        {session.isShared ? (
          <button
            onClick={handleShareToggle}
            className="w-full rounded-xl p-3.5 flex items-center justify-center gap-2 text-green-400 text-sm"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span>✓</span> Shared to community feed · Tap to unshare
          </button>
        ) : (
          <button
            onClick={handleShareToggle}
            className="btn-press w-full font-semibold rounded-2xl py-4 text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share to Feed
          </button>
        )}
      </div>
    </div>
  )
}
