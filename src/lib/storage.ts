import type { SleepSession, SleepGoal, SharePref } from '@/types'
import { computeScore, motionIndexFromSamples } from './scorer'

const SESSIONS_KEY = 'sleep_sessions_v1'
const GOAL_KEY = 'sleep_goal_v1'
const BEDTIME_KEY = 'tracking_bedtime'
const SAMPLES_KEY = 'tracking_samples'
const SHARE_PREF_KEY = 'sharing_pref_v1'

// ── Sessions ──────────────────────────────────────────────────────────────────

export function getSessions(): SleepSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SleepSession[]
    return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch { return [] }
}

export function saveSession(session: SleepSession): void {
  const existing = getSessions()
  const filtered = existing.filter(s => s.id !== session.id)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([session, ...filtered]))
}

export function updateSession(updated: SleepSession): void {
  const existing = getSessions()
  localStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify(existing.map(s => (s.id === updated.id ? updated : s)))
  )
}

// ── Sleep goal ────────────────────────────────────────────────────────────────

export function getGoal(): SleepGoal {
  if (typeof window === 'undefined') return { wakeHour: 7, wakeMinute: 0, durationGoalHours: 8 }
  try {
    const raw = localStorage.getItem(GOAL_KEY)
    return raw ? JSON.parse(raw) : { wakeHour: 7, wakeMinute: 0, durationGoalHours: 8 }
  } catch { return { wakeHour: 7, wakeMinute: 0, durationGoalHours: 8 } }
}

export function saveGoal(goal: SleepGoal): void {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal))
}

// ── Active tracking state ─────────────────────────────────────────────────────

export function startTracking(): void {
  localStorage.setItem(BEDTIME_KEY, new Date().toISOString())
  localStorage.removeItem(SAMPLES_KEY)
}

export function appendSample(magnitude: number): void {
  try {
    const raw = localStorage.getItem(SAMPLES_KEY)
    const existing: Array<{ timestamp: string; magnitude: number }> =
      raw ? JSON.parse(raw) : []
    existing.push({ timestamp: new Date().toISOString(), magnitude })
    // Keep last 2000 samples (~16 hours at 30s intervals)
    const trimmed = existing.slice(-2000)
    localStorage.setItem(SAMPLES_KEY, JSON.stringify(trimmed))
  } catch {}
}

export function stopTrackingAndCompute(goalHours: number, yesterdayBedtime?: Date): SleepSession | null {
  const bedtimeStr = localStorage.getItem(BEDTIME_KEY)
  if (!bedtimeStr) return null

  const bedtime = new Date(bedtimeStr)
  const wakeTime = new Date()
  const durationMinutes = Math.floor((wakeTime.getTime() - bedtime.getTime()) / 60_000)

  if (durationMinutes < 60) return null // must be at least 1h

  const rawSamples = localStorage.getItem(SAMPLES_KEY)
  const samples: Array<{ timestamp: string; magnitude: number }> =
    rawSamples ? JSON.parse(rawSamples) : []

  const motionIndex = motionIndexFromSamples(samples)
  const score = computeScore({
    durationMinutes,
    motionIndex,
    goalHours,
    todayBedtime: bedtime,
    yesterdayBedtime,
  })

  localStorage.removeItem(BEDTIME_KEY)
  localStorage.removeItem(SAMPLES_KEY)

  return {
    id: `session_${Date.now()}`,
    date: wakeTime.toISOString(),
    bedtime: bedtime.toISOString(),
    wakeTime: wakeTime.toISOString(),
    score,
    durationMinutes,
    motionIndex,
    isShared: false,
    samples,
  }
}

export function isTracking(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(BEDTIME_KEY)
}

export function getTrackingBedtime(): Date | null {
  const s = localStorage.getItem(BEDTIME_KEY)
  return s ? new Date(s) : null
}

// ── Session exclude toggle ────────────────────────────────────────────────────

export function toggleSessionExcluded(id: string): void {
  const sessions = getSessions()
  const updated = sessions.map(s =>
    s.id === id ? { ...s, isExcluded: !s.isExcluded } : s
  )
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
}

// ── Sharing preference ────────────────────────────────────────────────────────

export function getSharingPreference(): SharePref | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(SHARE_PREF_KEY) as SharePref) ?? null
}

export function setSharingPreference(pref: SharePref): void {
  localStorage.setItem(SHARE_PREF_KEY, pref)
}

const AUTO_SHARE_KEY = 'auto_share_v1'

export function getAutoShare(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AUTO_SHARE_KEY) === 'true'
}

export function setAutoShare(enabled: boolean): void {
  localStorage.setItem(AUTO_SHARE_KEY, String(enabled))
}

export function toggleSessionShared(id: string): void {
  const sessions = getSessions()
  const updated = sessions.map(s =>
    s.id === id ? { ...s, isShared: !s.isShared } : s
  )
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated))
}

// ── AI analysis cache ─────────────────────────────────────────────────────────

export function getAIAnalysisCache(): { hash: string; result: object } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ai_analysis_v1')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setAIAnalysisCache(hash: string, result: object): void {
  localStorage.setItem('ai_analysis_v1', JSON.stringify({ hash, result }))
}

// ── Onboarding flag ───────────────────────────────────────────────────────────

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('onboarding_complete') === 'true'
}

export function setOnboardingComplete(): void {
  localStorage.setItem('onboarding_complete', 'true')
}
