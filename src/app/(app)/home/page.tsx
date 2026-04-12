'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { 
  Trophy, Medal, Award,
  BarChart2, History, MessageCircle, Puzzle, Users, Music,
  Moon, Sun, Clock, Flame, Beaker, Bed
} from 'lucide-react'
import ScoreDial from '@/components/sleep/ScoreDial'
import CounsellingCard from '@/components/sleep/CounsellingCard'
import AIInsightsCard from '@/components/sleep/AIInsightsCard'
import { getSessions, saveSession, getGoal, isTracking, startTracking, stopTrackingAndCompute, getTrackingBedtime, toggleSessionShared, getAutoShare } from '@/lib/storage'
import { startMotionSampling, stopMotionSampling } from '@/lib/detection'
import { computeStreak, formatDuration, formatTime, generateMockSession } from '@/lib/scorer'
import type { SleepSession } from '@/types'

const MILESTONES = [
  { days: 7, icon: <Medal className="w-5 h-5 text-bronze-400" />, label: '7 nights' },
  { days: 14, icon: <Award className="w-5 h-5 text-silver-400" />, label: '14 nights' },
  { days: 30, icon: <Trophy className="w-5 h-5 text-yellow-400" />, label: '30 nights' },
]

export default function HomePage() {
  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [tracking, setTracking] = useState(false)
  const [trackingSince, setTrackingSince] = useState<Date | null>(null)
  const [showShareSheet, setShowShareSheet] = useState(false)

  const load = useCallback(() => {
    setSessions(getSessions())
    setTracking(isTracking())
    setTrackingSince(getTrackingBedtime())
  }, [])

  useEffect(() => { load() }, [load])

  const latest = sessions[0] ?? null
  const streak = computeStreak(sessions.filter(s => !s.isExcluded))
  const goal = getGoal()
  const targetBedtime = (() => {
    const wakeMin = goal.wakeHour * 60 + goal.wakeMinute
    const sleepMin = Math.round(goal.durationGoalHours * 60)
    const total = ((wakeMin - sleepMin) % 1440 + 1440) % 1440
    const h = Math.floor(total / 60)
    const m = total % 60
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`
  })()

  const quickActions = [
    { href: '/report', icon: <BarChart2 className="w-5 h-5 text-accent-teal" />, title: 'Full Report', sub: 'Export + analytics' },
    { href: '/history', icon: <History className="w-5 h-5 text-accent-teal" />, title: 'Sleep History', sub: 'All night logs' },
    { href: '/wellness/chat', icon: <MessageCircle className="w-5 h-5 text-accent-teal" />, title: 'Nytra Chat', sub: 'AI sleep coach' },
    { href: '/games', icon: <Puzzle className="w-5 h-5 text-accent-teal" />, title: 'Sleep Lab', sub: 'Mind calming tools' },
    { href: '/community', icon: <Users className="w-5 h-5 text-accent-teal" />, title: 'Community', sub: 'Friends + feed' },
    { href: '/music', icon: <Music className="w-5 h-5 text-accent-teal" />, title: 'Sleep Audio', sub: 'Wind down mix' },
  ]

  function greeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  function toggleTracking() {
    if (tracking) {
      stopMotionSampling()
      const session = stopTrackingAndCompute(goal.durationGoalHours, sessions[0] ? new Date(sessions[0].bedtime) : undefined)
      if (session) {
        const autoShare = getAutoShare()
        saveSession({ ...session, isShared: autoShare })
        setSessions(getSessions())
        if (!autoShare) setShowShareSheet(true)
      }
      setTracking(false)
      setTrackingSince(null)
    } else {
      startTracking()
      startMotionSampling()
      setTracking(true)
      setTrackingSince(new Date())
    }
  }

  function addMock() {
    const mock = generateMockSession()
    saveSession(mock)
    setSessions(getSessions())
  }

  function handleShareToggle() {
    if (!latest) return
    toggleSessionShared(latest.id)
    setSessions(getSessions())
    setShowShareSheet(false)
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{greeting()}</p>
          <h1 className="text-xl font-bold text-slate-100">{format(new Date(), 'EEEE, MMM d')}</h1>
        </div>
        <button
          onClick={toggleTracking}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            tracking ? 'border-accent-teal text-accent-teal bg-accent-teal/10' : 'border-bg-tertiary text-slate-400 bg-bg-secondary'
          }`}
        >
          {tracking
            ? <><span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse-dot" />Tracking</>
            : <><Moon className="w-3.5 h-3.5" /><span>Track sleep</span></>}
        </button>
      </div>

      {/* Tracking indicator */}
      {tracking && trackingSince && (
        <div className="bg-accent-teal/8 border border-accent-teal/20 rounded-xl p-3">
          <div className="flex items-center gap-3 mb-2">
            <Bed className="w-5 h-5 text-accent-teal" />
            <div>
              <p className="text-accent-teal text-sm font-semibold">Sleep tracking active</p>
              <p className="text-slate-400 text-xs">Started at {formatTime(trackingSince.toISOString())} · Tap chip to stop</p>
            </div>
          </div>
          <Link href="/games" className="text-xs text-slate-500 underline">
            Try cognitive shuffle to fall asleep faster →
          </Link>
        </div>
      )}

      {/* Tonight command deck */}
      <div className="bg-bg-secondary rounded-2xl p-4 border border-bg-tertiary">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-slate-100 font-semibold text-sm">Tonight plan</p>
            <p className="text-slate-500 text-xs mt-0.5">Target bedtime {targetBedtime} · Goal {goal.durationGoalHours}h</p>
          </div>
          <button
            onClick={toggleTracking}
            className={`text-xs font-semibold px-3 py-2 rounded-xl ${
              tracking
                ? 'bg-accent-teal/15 text-accent-teal'
                : 'bg-accent-teal text-bg-primary'
            }`}
          >
            {tracking ? 'Stop tracking' : 'Start tracking'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.slice(0, 4).map(action => (
            <Link key={action.href} href={action.href} className="bg-bg-tertiary rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{action.icon}</span>
                <span className="text-slate-100 text-sm font-semibold leading-none">{action.title}</span>
              </div>
              <p className="text-slate-500 text-[11px]">{action.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Hero sleep card */}
      {latest ? (
        <div className="aurora-bg rounded-2xl p-5 border border-slate-700/30">
          <div className="flex flex-col items-center">
            <ScoreDial score={latest.score} size={160} />
            <div className="flex gap-3 mt-5 w-full justify-center">
              {[
                { label: 'Duration', value: formatDuration(latest.durationMinutes), icon: <Clock className="w-4 h-4 text-slate-400" /> },
                { label: 'Bedtime', value: formatTime(latest.bedtime), icon: <Moon className="w-4 h-4 text-slate-400" /> },
                { label: 'Wake', value: formatTime(latest.wakeTime), icon: <Sun className="w-4 h-4 text-slate-400" /> },
              ].map(stat => (
                <div key={stat.label} className="flex-1 bg-bg-tertiary rounded-xl py-2 px-1 flex flex-col items-center gap-0.5">
                  <span className="text-sm">{stat.icon}</span>
                  <span className="text-slate-100 font-semibold text-xs">{stat.value}</span>
                  <span className="text-slate-500 text-[10px]">{stat.label}</span>
                </div>
              ))}
            </div>
            <div className="flex w-full items-center justify-between mt-4 pt-3 border-t border-bg-tertiary">
              <Link href={`/sleep/${latest.id}`} className="text-accent-teal text-sm font-medium">
                View full report →
              </Link>
              <button
                onClick={() => latest.isShared ? handleShareToggle() : setShowShareSheet(true)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  latest.isShared
                    ? 'bg-green-400/10 text-green-400'
                    : 'bg-bg-tertiary text-slate-400 hover:text-slate-200'
                }`}
              >
                {latest.isShared ? '✓ Shared' : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-bg-secondary rounded-2xl p-8 border border-bg-tertiary flex flex-col items-center text-center">
          <Moon className="w-10 h-10 mb-4 text-accent-teal" />
          <p className="text-slate-300 font-semibold mb-2">Tonight is your first tracked night</p>
          <p className="text-slate-500 text-sm">Keep your phone nearby while you sleep.</p>
        </div>
      )}

      {/* AI Insights */}
      {sessions.length > 0 && <AIInsightsCard sessions={sessions} />}

      {/* Streak row + milestones */}
      {sessions.length > 0 && (
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 flex-1">
              {Array.from({ length: 7 }, (_, i) => {
                const offset = i - 6
                const filled = offset <= 0 && -offset < streak
                const isToday = offset === 0
                const day = ['M','T','W','T','F','S','S'][new Date(Date.now() + offset * 86400000).getDay() === 0 ? 6 : new Date(Date.now() + offset * 86400000).getDay() - 1]
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${filled ? 'bg-accent-teal/20' : 'bg-bg-tertiary'} ${isToday ? 'ring-1 ring-accent-teal' : ''}`}>
                      {filled && <svg className="w-3.5 h-3.5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-[10px] ${isToday ? 'text-accent-teal font-semibold' : 'text-slate-600'}`}>{day}</span>
                  </div>
                )
              })}
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-slate-100 font-bold text-xl flex items-center gap-1">{streak} <Flame className="w-5 h-5 text-orange-500" /></p>
              <p className="text-slate-500 text-[10px]">night streak</p>
            </div>
          </div>

          {/* Milestone badges */}
          <div className="flex gap-2 pt-1 border-t border-bg-tertiary">
            {MILESTONES.map(m => (
              <div
                key={m.days}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg ${streak >= m.days ? 'bg-accent-teal/10' : 'bg-bg-tertiary opacity-40'}`}
              >
                <span className="text-base">{m.icon}</span>
                <span className="text-[10px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counselling suggestion */}
      <CounsellingCard sessions={sessions} />

      {/* Explore row */}
      <div className="bg-bg-secondary rounded-xl p-3.5 border border-bg-tertiary">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Explore</p>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.slice(4).map(action => (
            <Link key={action.href} href={action.href} className="bg-bg-tertiary rounded-xl p-3 flex items-center gap-2">
              <span className="text-base">{action.icon}</span>
              <div>
                <p className="text-slate-200 text-xs font-semibold leading-none">{action.title}</p>
                <p className="text-slate-500 text-[10px] mt-1">{action.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Demo button */}
      <button
        onClick={addMock}
        className="w-full border border-bg-tertiary text-slate-500 text-sm rounded-xl py-3 flex items-center justify-center gap-2"
      >
        <Beaker className="w-4 h-4" /> Add demo sleep session
      </button>

      {/* Share sheet */}
      {showShareSheet && latest && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowShareSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-lg mx-auto bg-bg-secondary rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-bg-tertiary rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-bold text-slate-100 mb-1">Post to community</h2>
            <p className="text-slate-500 text-sm mb-5">Your sleep session will appear in the community feed. Change what details you share in Profile.</p>
            <div className="bg-bg-tertiary rounded-xl p-4 flex items-center gap-4 mb-5">
              <ScoreDial score={latest.score} size={72} animate={false} />
              <div>
                <p className="text-slate-100 font-bold text-lg">{formatDuration(latest.durationMinutes)}</p>
                <p className="text-slate-400 text-sm">{formatTime(latest.bedtime)} → {formatTime(latest.wakeTime)}</p>
              </div>
            </div>
            <button
              onClick={handleShareToggle}
              className="w-full font-semibold rounded-xl py-3.5 text-sm mb-2"
              style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
            >
              Post to Feed
            </button>
            <button onClick={() => setShowShareSheet(false)} className="w-full text-slate-500 text-sm py-2">Not now</button>
          </div>
        </div>
      )}
    </div>
  )
}
