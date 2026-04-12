import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

type WindowStats = {
  nights: number
  avgScore: number
  avgDurationHours: number
  avgMotion: number
  bedtimeVariabilityMin: number
  wakeVariabilityMin: number
}

type AnalysisFeatures = {
  recent7: Array<{
    date: string
    score: number
    durationHours: number
    motionIndex: number
    bedtimeHour: number
    wakeHour: number
  }>
  trends: {
    sampleCount: number
    last7: WindowStats
    prev7: WindowStats | null
    last30: WindowStats
    last90: WindowStats
    deltas: {
      scoreVsPrev7: number
      scoreVs30: number
      durationVsPrev7: number
      durationVs30: number
      motionVs30: number
    }
    weekendVsWeekday: {
      weekdayAvgScore: number
      weekendAvgScore: number
      weekdayAvgDuration: number
      weekendAvgDuration: number
    }
  }
}

function toHourIso(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  return Math.sqrt(mean(values.map(v => (v - m) ** 2)))
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function summarizeWindow(sessions: Array<{ score: number; durationMinutes: number; motionIndex: number; bedtime: string; wakeTime: string }>): WindowStats {
  return {
    nights: sessions.length,
    avgScore: round(mean(sessions.map(s => s.score)), 1),
    avgDurationHours: round(mean(sessions.map(s => s.durationMinutes / 60)), 2),
    avgMotion: round(mean(sessions.map(s => s.motionIndex)), 3),
    bedtimeVariabilityMin: round(stddev(sessions.map(s => toHourIso(s.bedtime))) * 60, 1),
    wakeVariabilityMin: round(stddev(sessions.map(s => toHourIso(s.wakeTime))) * 60, 1),
  }
}

function buildFeaturesFromSessions(sessions: Array<{
  date: string
  score: number
  durationMinutes: number
  motionIndex: number
  bedtime: string
  wakeTime: string
}>): AnalysisFeatures {
  const recent = sessions.slice(0, 90)
  const last7 = recent.slice(0, 7)
  const prev7 = recent.slice(7, 14)
  const last30 = recent.slice(0, 30)
  const last90 = recent.slice(0, 90)

  const weekday = recent.filter(s => {
    const day = new Date(s.date).getDay()
    return day !== 0 && day !== 6
  })
  const weekend = recent.filter(s => {
    const day = new Date(s.date).getDay()
    return day === 0 || day === 6
  })

  const last7Stats = summarizeWindow(last7)
  const prev7Stats = prev7.length ? summarizeWindow(prev7) : null
  const last30Stats = summarizeWindow(last30)
  const last90Stats = summarizeWindow(last90)

  return {
    recent7: last7.map(s => ({
      date: s.date.slice(0, 10),
      score: s.score,
      durationHours: round(s.durationMinutes / 60, 1),
      motionIndex: round(s.motionIndex, 3),
      bedtimeHour: round(toHourIso(s.bedtime), 2),
      wakeHour: round(toHourIso(s.wakeTime), 2),
    })),
    trends: {
      sampleCount: recent.length,
      last7: last7Stats,
      prev7: prev7Stats,
      last30: last30Stats,
      last90: last90Stats,
      deltas: {
        scoreVsPrev7: round(last7Stats.avgScore - (prev7Stats?.avgScore ?? last7Stats.avgScore), 1),
        scoreVs30: round(last7Stats.avgScore - last30Stats.avgScore, 1),
        durationVsPrev7: round(last7Stats.avgDurationHours - (prev7Stats?.avgDurationHours ?? last7Stats.avgDurationHours), 2),
        durationVs30: round(last7Stats.avgDurationHours - last30Stats.avgDurationHours, 2),
        motionVs30: round(last7Stats.avgMotion - last30Stats.avgMotion, 3),
      },
      weekendVsWeekday: {
        weekdayAvgScore: round(mean(weekday.map(s => s.score)), 1),
        weekendAvgScore: round(mean(weekend.map(s => s.score)), 1),
        weekdayAvgDuration: round(mean(weekday.map(s => s.durationMinutes / 60)), 2),
        weekendAvgDuration: round(mean(weekend.map(s => s.durationMinutes / 60)), 2),
      },
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sessions = Array.isArray(body?.sessions) ? body.sessions : []
    const features = body?.features as AnalysisFeatures | undefined
    const effectiveFeatures = features ?? (sessions.length ? buildFeaturesFromSessions(sessions) : null)

    if (!effectiveFeatures || !effectiveFeatures.recent7.length) {
      return NextResponse.json({ error: 'No sleep features provided' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a sleep wellness coach. Use this trend-aware feature payload to generate concise, visual-first insights.

Feature payload:
${JSON.stringify(effectiveFeatures)}

Respond with ONLY valid JSON (no markdown/code fences) in this exact structure:
{
  "headline": "very short punchy line (max 6 words)",
  "chips": [
    {"icon":"emoji", "metric":"Duration|Timing|Stillness", "value":"max 8 chars", "direction":"up|down|flat", "tone":"good|warn|neutral"},
    {"icon":"emoji", "metric":"Duration|Timing|Stillness", "value":"max 8 chars", "direction":"up|down|flat", "tone":"good|warn|neutral"},
    {"icon":"emoji", "metric":"Duration|Timing|Stillness", "value":"max 8 chars", "direction":"up|down|flat", "tone":"good|warn|neutral"}
  ],
  "action": "single actionable next step, max 10 words",
  "trend": "improving" | "declining" | "stable",
  "confidence": 0.0,
  "caution": "optional short caution or null"
}

Rules:
- Keep copy ultra concise and visual-first.
- Never return paragraphs.
- Use only data provided.
- If sampleCount < 10, reduce certainty.
- Confidence must be between 0 and 1.
- Do not mention sleep stages (we only track phone activity, not actual sleep stages).`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    // Strip markdown code fences if Claude wraps the JSON
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    let result
    try {
      result = JSON.parse(text)
    } catch {
      console.error('JSON parse failed. Raw response:', raw)
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 })
    }
    if (!result.headline || !Array.isArray(result.chips) || !result.action || !result.trend) {
      console.error('Missing fields in response:', result)
      return NextResponse.json({ error: 'Incomplete response' }, { status: 500 })
    }

    const fallbackChip = {
      icon: '💤',
      metric: 'Duration',
      value: '7h',
      direction: 'flat' as const,
      tone: 'neutral' as const,
    }

    const normalized = {
      headline: String(result.headline).slice(0, 64),
      chips: (result.chips as Array<{
        icon?: string
        metric?: string
        value?: string
        direction?: string
        tone?: string
      }>)
        .slice(0, 3)
        .map(chip => ({
          icon: chip.icon ? String(chip.icon).slice(0, 4) : fallbackChip.icon,
          metric: chip.metric ? String(chip.metric).slice(0, 20) : fallbackChip.metric,
          value: chip.value ? String(chip.value).slice(0, 8) : fallbackChip.value,
          direction: chip.direction === 'up' || chip.direction === 'down' ? chip.direction : fallbackChip.direction,
          tone: chip.tone === 'good' || chip.tone === 'warn' ? chip.tone : fallbackChip.tone,
        })),
      action: String(result.action).slice(0, 80),
      trend: result.trend === 'improving' || result.trend === 'declining' ? result.trend : 'stable',
      confidence: Math.max(0, Math.min(1, Number(result.confidence ?? 0.6))),
      caution: result.caution ? String(result.caution).slice(0, 64) : null,
    }
    return NextResponse.json(normalized)
  } catch (err) {
    console.error('AI analysis error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
