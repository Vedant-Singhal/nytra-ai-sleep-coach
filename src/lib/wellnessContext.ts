import { computeStressSignal } from './stressDetector'
import type { SleepSession } from '@/types'

export interface SleepContextPayload {
  severity: string
  avgScore30: number
  avgDuration30: number
  shortNights14: number
  sessionCount: number
  recentSessions: Array<{
    date: string
    score: number
    durationHours: number
    bedtime: string
    wake: string
  }>
  bedtimeStdDevMin: number
  trend: 'improving' | 'declining' | 'stable'
}

function toHHMM(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const m = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length)
}

export function buildSleepContext(sessions: SleepSession[]): SleepContextPayload {
  const included = sessions.filter(s => !s.isExcluded).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const signal = computeStressSignal(included)

  const recentSessions = included.slice(0, 5).map(s => ({
    date: s.date.slice(0, 10),
    score: s.score,
    durationHours: Math.round((s.durationMinutes / 60) * 10) / 10,
    bedtime: toHHMM(s.bedtime),
    wake: toHHMM(s.wakeTime),
  }))

  // Bedtime std dev over last 30 days
  const now = Date.now()
  const ms30d = 30 * 24 * 60 * 60 * 1000
  const last30 = included.filter(s => now - new Date(s.date).getTime() <= ms30d)
  const bedtimeMinutes = last30.map(s => {
    const d = new Date(s.bedtime)
    const mins = d.getHours() * 60 + d.getMinutes()
    // Treat post-midnight (0-6h) as same night: add 1440
    return mins < 360 ? mins + 1440 : mins
  })
  const bedtimeStdDevMin = Math.round(stddev(bedtimeMinutes))

  // Trend: compare last 7 vs prev 7
  const last7 = included.slice(0, 7)
  const prev7 = included.slice(7, 14)
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (last7.length >= 3 && prev7.length >= 3) {
    const last7Avg = last7.reduce((s, v) => s + v.score, 0) / last7.length
    const prev7Avg = prev7.reduce((s, v) => s + v.score, 0) / prev7.length
    const delta = last7Avg - prev7Avg
    if (delta > 3) trend = 'improving'
    else if (delta < -3) trend = 'declining'
  }

  return {
    severity: signal.severity,
    avgScore30: signal.avgScore30,
    avgDuration30: signal.avgDuration30,
    shortNights14: signal.shortNights14,
    sessionCount: signal.sessionCount,
    recentSessions,
    bedtimeStdDevMin,
    trend,
  }
}

export function formatSleepSummaryForClipboard(ctx: SleepContextPayload): string {
  const lines = [
    `Hi, here's my sleep data from the last 30 days:`,
    `- Average sleep score: ${ctx.avgScore30}/100`,
    `- Average sleep duration: ${ctx.avgDuration30}h/night`,
    `- Short nights (<6h) in last 2 weeks: ${ctx.shortNights14}`,
    `- Bedtime consistency: ±${ctx.bedtimeStdDevMin} min variability`,
    `- Recent trend: ${ctx.trend}`,
    ``,
    `My last ${ctx.recentSessions.length} nights:`,
    ...ctx.recentSessions.map(
      s => `  ${s.date}: score ${s.score}/100, ${s.durationHours}h (${s.bedtime} → ${s.wake})`
    ),
  ]
  return lines.join('\n')
}
