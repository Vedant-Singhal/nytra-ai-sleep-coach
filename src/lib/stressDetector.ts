import type { SleepSession } from '@/types'

export type StressSeverity = 'NONE' | 'MILD' | 'MODERATE' | 'HIGH'

export interface StressSignal {
  severity: StressSeverity
  avgScore30: number
  avgDuration30: number  // hours, 1 decimal place
  shortNights14: number  // nights < 6h in last 14 days
  sessionCount: number   // sessions analysed
}

const ZERO_SIGNAL: StressSignal = {
  severity: 'NONE',
  avgScore30: 0,
  avgDuration30: 0,
  shortNights14: 0,
  sessionCount: 0,
}

/**
 * Computes a stress severity signal from recent sleep sessions.
 *
 * Uses last 30 calendar days of non-excluded sessions.
 * Minimum 5 sessions required; returns NONE otherwise.
 *
 * Severity tiers (first match wins):
 *   HIGH     → avgScore30 < 45
 *   MODERATE → avgScore30 in [45, 55) AND avgDuration30 < 6.5h
 *   MILD     → avgScore30 in [55, 65) OR shortNights14 >= 3
 *   NONE     → otherwise
 */
export function computeStressSignal(sessions: SleepSession[]): StressSignal {
  if (!sessions.length) return ZERO_SIGNAL

  const now = Date.now()
  const ms30d = 30 * 24 * 60 * 60 * 1000
  const ms14d = 14 * 24 * 60 * 60 * 1000

  // Filter to last 30 calendar days, sorted newest first
  const recent30 = sessions
    .filter(s => !s.isExcluded && now - new Date(s.date).getTime() <= ms30d)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (recent30.length < 5) return ZERO_SIGNAL

  const avgScore30 = Math.round(
    recent30.reduce((sum, s) => sum + s.score, 0) / recent30.length
  )

  const avgDuration30 = Math.round(
    (recent30.reduce((sum, s) => sum + s.durationMinutes / 60, 0) / recent30.length) * 10
  ) / 10

  const shortNights14 = recent30.filter(
    s => now - new Date(s.date).getTime() <= ms14d && s.durationMinutes < 360
  ).length

  // Severity classification
  let severity: StressSeverity = 'NONE'
  if (avgScore30 < 45) {
    severity = 'HIGH'
  } else if (avgScore30 < 55 && avgDuration30 < 6.5) {
    severity = 'MODERATE'
  } else if (avgScore30 < 65 || shortNights14 >= 3) {
    severity = 'MILD'
  }

  return { severity, avgScore30, avgDuration30, shortNights14, sessionCount: recent30.length }
}

// ── Snooze helpers ─────────────────────────────────────────────────────────────

const SNOOZE_KEY = 'wellness_snooze_v1'

export function getSnoozeUntil(): Date | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SNOOZE_KEY)
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function setSnoozeUntil(days: number): void {
  if (typeof window === 'undefined') return
  const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  localStorage.setItem(SNOOZE_KEY, expiry.toISOString())
}

export function isSnoozed(): boolean {
  const until = getSnoozeUntil()
  return !!until && until > new Date()
}
