import type { MotionSample, SleepSession } from '@/types'

/**
 * Research-backed sleep scoring formula (v2).
 * Sources:
 *   - NSF (Hirshkowitz et al. 2015): 7–9h optimal duration for adults
 *   - Walker, M. (2017) "Why We Sleep": circadian rhythm stability, bedtime regularity
 *   - Monk et al. (1997) / AASM guidelines: optimal sleep onset window 10 PM–1 AM
 *   - Cappuccio et al. (2010): oversleeping (>9h) associated with adverse outcomes
 *
 * Duration (40 pts):      NSF optimal 7–9h. Penalty for under/oversleeping.
 * Consistency (20 pts):   Bedtime variance vs prior night (circadian stability).
 * Phone Stillness (20 pts): Proxy for sleep — low motion = likely sleeping.
 * Bedtime Alignment (20 pts): Circadian window 10 PM–1 AM (melatonin onset research).
 *
 * Note: Sessions scored before this formula keep their old scores (no migration).
 */
export function computeScore({
  durationMinutes,
  motionIndex,
  goalHours: _goalHours,
  todayBedtime,
  yesterdayBedtime,
}: {
  durationMinutes: number
  motionIndex: number
  goalHours: number
  todayBedtime?: Date
  yesterdayBedtime?: Date
}): number {
  const hours = durationMinutes / 60

  // Duration score (40 pts) — NSF 7–9h optimal; oversleeping penalised (Cappuccio 2010)
  let durationScore: number
  if (hours < 5) durationScore = 0
  else if (hours < 7) durationScore = Math.round(((hours - 5) / 2) * 32)  // 0→32 over 5–7h
  else if (hours <= 9) durationScore = 40                                   // optimal range
  else if (hours <= 10) durationScore = Math.round(40 - (hours - 9) * 8)   // slight oversleep
  else durationScore = Math.max(20, Math.round(32 - (hours - 10) * 6))     // significant oversleep

  // Consistency score (20 pts) — circadian rhythm stability (Walker 2017)
  let consistencyScore = 10 // neutral if no prior session
  if (todayBedtime && yesterdayBedtime) {
    const todayMin = todayBedtime.getHours() * 60 + todayBedtime.getMinutes()
    const yestMin = yesterdayBedtime.getHours() * 60 + yesterdayBedtime.getMinutes()
    // Handle midnight wrap (e.g. 11:50 PM vs 0:10 AM = 20 min diff, not 1420)
    let diff = Math.abs(todayMin - yestMin)
    if (diff > 720) diff = 1440 - diff
    if (diff <= 15) consistencyScore = 20
    else if (diff <= 45) consistencyScore = Math.round(20 - ((diff - 15) / 30) * 8)
    else if (diff <= 90) consistencyScore = Math.round(12 - ((diff - 45) / 45) * 8)
    else consistencyScore = 0
  }

  // Phone stillness score (20 pts) — low motion = phone untouched = likely sleeping
  let stillnessScore: number
  if (motionIndex <= 0.15) stillnessScore = 20
  else if (motionIndex <= 0.4) stillnessScore = Math.round(20 - ((motionIndex - 0.15) / 0.25) * 20)
  else stillnessScore = 0

  // Bedtime alignment score (20 pts) — circadian window (Monk 1997; AASM)
  // Optimal: 10 PM–1 AM. Each hour outside window reduces score.
  let alignmentScore = 0
  if (todayBedtime) {
    const h = todayBedtime.getHours() + todayBedtime.getMinutes() / 60
    // Normalise: 22.0 = 10 PM, 25.0 = 1 AM (treating post-midnight as 24+)
    const norm = h < 6 ? h + 24 : h  // 0–5 AM → 24–29
    if (norm >= 22 && norm <= 25) {
      alignmentScore = 20  // optimal window
    } else if (norm > 25 && norm <= 27) {
      alignmentScore = Math.round(20 - (norm - 25) * 6)  // 1–3 AM: 20→8
    } else if (norm >= 20 && norm < 22) {
      alignmentScore = Math.round(20 - (22 - norm) * 5)  // 8–10 PM: 10→20
    } else if (norm > 27) {
      alignmentScore = 0   // after 3 AM: no benefit
    } else {
      // Before 8 PM or daytime nap — no alignment bonus
      alignmentScore = 5
    }
  } else {
    alignmentScore = 10  // neutral if no bedtime data
  }

  return Math.max(0, Math.min(100, durationScore + consistencyScore + stillnessScore + alignmentScore))
}

export function motionIndexFromSamples(samples: MotionSample[]): number {
  if (!samples.length) return 0.5
  const avg = samples.reduce((s, x) => s + x.magnitude, 0) / samples.length
  return Math.max(0, Math.min(1, avg / 5.0))
}

export function scoreColor(score: number): string {
  if (score >= 75) return '#22C55E'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Poor'
}

export function scoreGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const period = h >= 12 ? 'PM' : 'AM'
  h = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h}:${m} ${period}`
}

export function generateMockSession(): SleepSession {
  const now = new Date()
  const hourOffset = 21 + Math.floor(Math.random() * 3) // 9–11 PM bedtime
  const bedtime = new Date(now)
  bedtime.setDate(bedtime.getDate() - 1)
  bedtime.setHours(hourOffset, Math.floor(Math.random() * 4) * 15, 0, 0)

  const durationMinutes = 390 + Math.floor(Math.random() * 90)
  const wakeTime = new Date(bedtime.getTime() + durationMinutes * 60_000)
  const motionIndex = 0.1 + Math.random() * 0.35

  const samples: MotionSample[] = Array.from(
    { length: Math.floor(durationMinutes / 5) },
    (_, i) => ({
      timestamp: new Date(bedtime.getTime() + i * 5 * 60_000).toISOString(),
      magnitude: Math.random() * 0.5,
    })
  )

  const score = computeScore({ durationMinutes, motionIndex, goalHours: 8 })

  return {
    id: `mock_${Date.now()}`,
    date: now.toISOString(),
    bedtime: bedtime.toISOString(),
    wakeTime: wakeTime.toISOString(),
    score,
    durationMinutes,
    motionIndex,
    isShared: false,
    samples,
  }
}

export function computeStreak(sessions: SleepSession[]): number {
  if (!sessions.length) return 0
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  let streak = 0
  let expected = new Date()
  for (const s of sorted) {
    const sDay = new Date(s.date)
    sDay.setHours(0, 0, 0, 0)
    const expDay = new Date(expected)
    expDay.setHours(0, 0, 0, 0)
    const diffDays = Math.abs(sDay.getTime() - expDay.getTime()) / 86_400_000
    if (diffDays <= 1) {
      streak++
      expected = new Date(new Date(s.date).getTime() - 86_400_000)
    } else break
  }
  return streak
}
