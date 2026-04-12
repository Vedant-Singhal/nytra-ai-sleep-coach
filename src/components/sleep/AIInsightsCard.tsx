'use client'
import { useEffect, useMemo, useState, ReactNode } from 'react'
import { TrendingUp, TrendingDown, ArrowRight, Clock, Moon, Smartphone } from 'lucide-react'
import { getAIAnalysisCache, setAIAnalysisCache } from '@/lib/storage'
import type { SleepSession } from '@/types'

type Trend = 'improving' | 'declining' | 'stable'
type Tone = 'good' | 'warn' | 'neutral'

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

interface Analysis {
  headline: string
  chips: Array<{
    icon: ReactNode
    metric: string
    value: string
    direction: 'up' | 'down' | 'flat'
    tone: Tone
  }>
  action: string
  trend: Trend
  confidence: number
  caution: string | null
}

interface Props {
  sessions: SleepSession[]
}

const TREND_CONFIG: Record<Trend, { icon: ReactNode; label: string; color: string }> = {
  improving: { icon: <TrendingUp className="w-4 h-4 text-green-500" />, label: 'Improving', color: '#22C55E' },
  declining: { icon: <TrendingDown className="w-4 h-4 text-red-500" />, label: 'Declining', color: '#EF4444' },
  stable: { icon: <ArrowRight className="w-4 h-4 text-amber-500" />, label: 'Stable', color: '#F59E0B' },
}

const TONE_STYLES: Record<Tone, string> = {
  good: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  warn: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  neutral: 'border-slate-300/20 bg-bg-tertiary text-slate-200',
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

function toHour(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

function summarizeWindow(sessions: SleepSession[]): WindowStats {
  return {
    nights: sessions.length,
    avgScore: round(mean(sessions.map(s => s.score)), 1),
    avgDurationHours: round(mean(sessions.map(s => s.durationMinutes / 60)), 2),
    avgMotion: round(mean(sessions.map(s => s.motionIndex)), 3),
    bedtimeVariabilityMin: round(stddev(sessions.map(s => toHour(s.bedtime))) * 60, 1),
    wakeVariabilityMin: round(stddev(sessions.map(s => toHour(s.wakeTime))) * 60, 1),
  }
}

function buildFeatures(sessions: SleepSession[]): AnalysisFeatures {
  const recent = sessions.filter(s => !s.isExcluded).slice(0, 90)
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
      bedtimeHour: round(toHour(s.bedtime), 2),
      wakeHour: round(toHour(s.wakeTime), 2),
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

function fallbackAnalysis(features: AnalysisFeatures): Analysis {
  const d = features.trends.deltas
  const trend: Trend = d.scoreVs30 > 2 ? 'improving' : d.scoreVs30 < -2 ? 'declining' : 'stable'

  return {
    headline:
      trend === 'improving'
        ? 'Recovery trending up'
        : trend === 'declining'
          ? 'Recovery needs reset'
          : 'Holding a stable baseline',
    chips: [
      {
        icon: <Clock className="w-4 h-4 text-slate-400" />,
        metric: 'Duration',
        value: `${features.trends.last7.avgDurationHours.toFixed(1)}h`,
        direction: d.durationVs30 > 0.1 ? 'up' : d.durationVs30 < -0.1 ? 'down' : 'flat',
        tone: d.durationVs30 > 0.1 ? 'good' : d.durationVs30 < -0.1 ? 'warn' : 'neutral',
      },
      {
        icon: <Moon className="w-4 h-4 text-slate-400" />,
        metric: 'Timing',
        value: `${Math.round(features.trends.last7.bedtimeVariabilityMin)}m var`,
        direction: features.trends.last7.bedtimeVariabilityMin <= features.trends.last30.bedtimeVariabilityMin ? 'up' : 'down',
        tone: features.trends.last7.bedtimeVariabilityMin <= features.trends.last30.bedtimeVariabilityMin ? 'good' : 'warn',
      },
      {
        icon: <Smartphone className="w-4 h-4 text-slate-400" />,
        metric: 'Stillness',
        value: features.trends.last7.avgMotion < 0.2 ? 'Low' : features.trends.last7.avgMotion < 0.35 ? 'Medium' : 'High',
        direction: d.motionVs30 < 0 ? 'up' : d.motionVs30 > 0 ? 'down' : 'flat',
        tone: d.motionVs30 < 0 ? 'good' : d.motionVs30 > 0 ? 'warn' : 'neutral',
      },
    ],
    action: 'Keep wake time fixed tomorrow morning.',
    trend,
    confidence: Math.min(0.9, Math.max(0.55, features.trends.sampleCount / 30)),
    caution: features.trends.sampleCount < 10 ? 'Low sample history' : null,
  }
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-12 rounded-xl bg-bg-tertiary" />

  const width = 240
  const height = 48
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
      <polyline
        points={points}
        fill="none"
        stroke="#5EEAD4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function AIInsightsCard({ sessions }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const included = useMemo(
    () => sessions.filter(s => !s.isExcluded).slice(0, 90),
    [sessions]
  )

  const features = useMemo(() => buildFeatures(included), [included])
  const scoreSparkline = useMemo(
    () => included.slice(0, 14).reverse().map(s => s.score),
    [included]
  )

  useEffect(() => {
    if (features.recent7.length < 2) {
      setLoading(false)
      return
    }

    const hash = JSON.stringify(features)
    const cached = getAIAnalysisCache()
    if (cached && cached.hash === hash) {
      setAnalysis(cached.result as Analysis)
      setLoading(false)
      return
    }

    fetch('/api/analyze-sleep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setAIAnalysisCache(hash, data)
        setAnalysis(data)
      })
      .catch(() => {
        setError(true)
        setAnalysis(fallbackAnalysis(features))
      })
      .finally(() => setLoading(false))
  }, [features])

  if (!loading && !analysis && !error) return null

  const content = analysis ?? fallbackAnalysis(features)
  const trendCfg = TREND_CONFIG[content.trend]

  return (
    <div className="aurora-bg rounded-2xl p-5 border border-slate-700/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <p className="text-slate-100 font-semibold text-sm">Coach Snapshot</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${trendCfg.color}20` }}>
          <span className="text-xs">{trendCfg.icon}</span>
          <span className="text-xs font-medium" style={{ color: trendCfg.color }}>{trendCfg.label}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 w-full rounded skeleton" />
          <div className="h-3 w-4/5 rounded skeleton" />
          <div className="h-12 w-full rounded-xl skeleton mt-3" />
        </div>
      ) : (
        <>
          <p className="text-slate-100 text-base font-semibold mb-2">{content.headline}</p>

          <div className="bg-bg-secondary/70 border border-bg-tertiary rounded-xl p-2.5 mb-3">
            <Sparkline values={scoreSparkline} />
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="text-[10px] text-slate-500">14-night trend</span>
              <span className="text-[10px] text-slate-400">confidence {Math.round(content.confidence * 100)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {content.chips.slice(0, 3).map((chip, index) => (
              <div key={`${chip.metric}-${index}`} className={`rounded-xl border px-2 py-2 ${TONE_STYLES[chip.tone]}`}>
                <p className="text-sm leading-none mb-1">{chip.icon}</p>
                <p className="text-[10px] uppercase tracking-wide opacity-80">{chip.metric}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-semibold">{chip.value}</span>
                  <span className="text-[10px] opacity-80">{chip.direction === 'up' ? '↑' : chip.direction === 'down' ? '↓' : '→'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-accent-teal/35 bg-accent-teal/10 px-3 py-2.5 flex items-center gap-2">
            <span className="text-sm">🎯</span>
            <p className="text-xs text-slate-100 font-medium">Tonight: {content.action}</p>
          </div>

          {content.caution && (
            <p className="text-[11px] text-amber-200 mt-2">⚠ {content.caution}</p>
          )}
        </>
      )}
    </div>
  )
}
