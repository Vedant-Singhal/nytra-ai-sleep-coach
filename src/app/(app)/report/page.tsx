'use client'
import { useState, useEffect, useRef } from 'react'
import { format, getDay } from 'date-fns'
import Link from 'next/link'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { getSessions } from '@/lib/storage'
import { scoreColor, scoreLabel, formatDuration, formatTime } from '@/lib/scorer'
import type { SleepSession } from '@/types'

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

function stdDev(arr: number[]) {
  if (arr.length < 2) return 0
  const mean = avg(arr)
  return Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length)
}

function bedtimeMinutes(s: SleepSession): number {
  const d = new Date(s.bedtime)
  let m = d.getHours() * 60 + d.getMinutes()
  if (m < 360) m += 1440  // treat post-midnight as "next day" for comparison
  return m
}

export default function ReportPage() {
  const [sessions, setSessions] = useState<SleepSession[]>([])
  const [range, setRange] = useState<14 | 30>(14)
  const [exporting, setExporting] = useState(false)
  const [pdfMode, setPdfMode] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSessions(getSessions()) }, [])

  async function exportPdf() {
    if (!reportRef.current || exporting) return
    setExporting(true)
    try {
      setPdfMode(true)
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))

      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        windowWidth: reportRef.current.scrollWidth,
      })

      const image = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let position = 0
      let remaining = imgHeight

      pdf.addImage(image, 'PNG', 0, position, imgWidth, imgHeight)
      remaining -= pageHeight

      while (remaining > 0) {
        position = remaining - imgHeight
        pdf.addPage()
        pdf.addImage(image, 'PNG', 0, position, imgWidth, imgHeight)
        remaining -= pageHeight
      }

      const filename = `nytra-sleep-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      pdf.save(filename)
    } finally {
      setPdfMode(false)
      setExporting(false)
    }
  }

  const included = sessions.filter(s => !s.isExcluded)
  const ranged = included.slice(0, range)

  if (ranged.length === 0) {
    return (
      <div className="px-4 pt-6 pb-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-6 no-print">
          <Link href="/profile" className="text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">Nytra Sleep Report</h1>
        </div>
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-4xl mb-4">📊</span>
          <p className="text-slate-400 text-sm">No sessions in this range yet.</p>
        </div>
      </div>
    )
  }

  // Core stats
  const scores = ranged.map(s => s.score)
  const durations = ranged.map(s => s.durationMinutes)
  const avgScore = Math.round(avg(scores))
  const avgDur = Math.round(avg(durations))
  const best = ranged.reduce((b, s) => s.score > b.score ? s : b, ranged[0])
  const worst = ranged.reduce((b, s) => s.score < b.score ? s : b, ranged[0])
  const nights = ranged.length
  const goodNights = ranged.filter(s => s.score >= 75).length

  // Sleep debt (NSF: 8h ideal; debt = hours below 8h per night, cumulative)
  const IDEAL_HOURS = 8
  const sleepDebt = ranged.reduce((debt, s) => {
    const shortfall = IDEAL_HOURS * 60 - s.durationMinutes
    return debt + (shortfall > 0 ? shortfall : 0)
  }, 0)
  const avgDebtPerNight = sleepDebt / nights

  // Bedtime consistency (std deviation in minutes)
  const bedtimeMins = ranged.map(bedtimeMinutes)
  const bedtimeStd = Math.round(stdDev(bedtimeMins))
  const consistencyLabel = bedtimeStd < 15 ? 'Excellent' : bedtimeStd < 30 ? 'Good' : bedtimeStd < 60 ? 'Fair' : 'Poor'
  const consistencyColor = bedtimeStd < 15 ? '#22C55E' : bedtimeStd < 30 ? '#5EEAD4' : bedtimeStd < 60 ? '#F59E0B' : '#EF4444'

  // Weekday vs weekend
  const weekday = ranged.filter(s => { const d = getDay(new Date(s.date)); return d >= 1 && d <= 5 })
  const weekend = ranged.filter(s => { const d = getDay(new Date(s.date)); return d === 0 || d === 6 })
  const avgWeekdayScore = weekday.length ? Math.round(avg(weekday.map(s => s.score))) : null
  const avgWeekendScore = weekend.length ? Math.round(avg(weekend.map(s => s.score))) : null
  const avgWeekdayDur = weekday.length ? Math.round(avg(weekday.map(s => s.durationMinutes))) : null
  const avgWeekendDur = weekend.length ? Math.round(avg(weekend.map(s => s.durationMinutes))) : null

  // Trend: compare first half vs second half
  const half = Math.floor(ranged.length / 2)
  const recentHalf = ranged.slice(0, half)
  const olderHalf = ranged.slice(half)
  const recentAvg = recentHalf.length ? avg(recentHalf.map(s => s.score)) : avgScore
  const olderAvg = olderHalf.length ? avg(olderHalf.map(s => s.score)) : avgScore
  const trendDelta = Math.round(recentAvg - olderAvg)
  const trendLabel = trendDelta >= 3 ? 'Improving' : trendDelta <= -3 ? 'Declining' : 'Stable'
  const trendColor = trendDelta >= 3 ? '#22C55E' : trendDelta <= -3 ? '#EF4444' : '#F59E0B'

  // Score distribution
  const distribution = [
    { label: 'Excellent (90+)', count: ranged.filter(s => s.score >= 90).length, color: '#22C55E' },
    { label: 'Good (75–89)', count: ranged.filter(s => s.score >= 75 && s.score < 90).length, color: '#5EEAD4' },
    { label: 'Fair (60–74)', count: ranged.filter(s => s.score >= 60 && s.score < 75).length, color: '#F59E0B' },
    { label: 'Poor (<60)', count: ranged.filter(s => s.score < 60).length, color: '#EF4444' },
  ]

  // SVG bar chart
  const chartH = 80
  const chartW = 300
  const barW = Math.max(4, Math.floor((chartW - ranged.length * 2) / ranged.length))

  return (
    <div ref={reportRef} className={`px-4 pt-6 pb-8 animate-fade-up ${pdfMode ? 'pdf-mode' : ''}`}>
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link href="/profile" className="text-slate-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Nytra Sleep Report</h1>
          <p className="text-slate-500 text-xs mt-0.5">Generated {format(new Date(), 'MMM d, yyyy')}</p>
        </div>
        <button
          onClick={() => void exportPdf()}
          className="bg-accent-teal text-bg-primary text-sm font-semibold px-4 py-2 rounded-xl no-print"
        >
          {exporting ? 'Preparing...' : 'Download PDF'}
        </button>
      </div>

      {/* Range toggle */}
      <div className="flex gap-2 mb-6 no-print">
        {([14, 30] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${range === r ? 'bg-accent-teal text-bg-primary' : 'bg-bg-secondary text-slate-400'}`}
          >
            Last {r} days
          </button>
        ))}
      </div>

      {/* Hero stats */}
      <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-100 font-semibold">{range}-Day Overview</h2>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: trendColor, background: `${trendColor}18` }}>
            {trendLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Avg Score', value: `${avgScore}`, color: scoreColor(avgScore) },
            { label: 'Avg Duration', value: formatDuration(avgDur), color: '#5EEAD4' },
            { label: 'Good nights', value: `${goodNights}/${nights}`, color: '#818CF8' },
            { label: 'Best score', value: `${best.score}`, color: '#22C55E' },
          ].map(s => (
            <div key={s.label} className="bg-bg-tertiary rounded-xl p-3.5">
              <p className="font-bold text-2xl leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sleep Debt */}
      <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
        <h2 className="text-slate-100 font-semibold mb-3">Sleep Debt</h2>
        <div className="flex items-center gap-4 mb-3">
          <div>
            <p className="font-bold text-3xl" style={{ color: sleepDebt > 600 ? '#EF4444' : sleepDebt > 240 ? '#F59E0B' : '#22C55E' }}>
              {formatDuration(sleepDebt)}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Accumulated over {nights} nights</p>
          </div>
          <div className="flex-1 text-right">
            <p className="text-slate-300 text-sm font-medium">{formatDuration(Math.round(avgDebtPerNight))}</p>
            <p className="text-slate-500 text-xs">avg shortfall / night</p>
          </div>
        </div>
        {/* Debt bar */}
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{
            width: `${Math.min(100, (sleepDebt / (nights * 120)) * 100)}%`,
            background: sleepDebt > 600 ? '#EF4444' : sleepDebt > 240 ? '#F59E0B' : '#22C55E'
          }} />
        </div>
        <p className="text-slate-600 text-[11px] mt-2">Based on NSF recommended 8h/night (Hirshkowitz et al. 2015)</p>
      </div>

      {/* Score trend chart */}
      <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
        <h2 className="text-slate-100 font-semibold mb-4">Score Trend</h2>
        <div className="overflow-x-auto">
          <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 20}`} className="w-full">
            {[...ranged].reverse().map((s, i) => {
              const barH = Math.max(4, Math.round((s.score / 100) * chartH))
              const x = i * (barW + 2)
              const y = chartH - barH
              return (
                <g key={s.id}>
                  <rect x={x} y={y} width={barW} height={barH} fill={scoreColor(s.score)} rx={2} opacity={0.85} />
                  {i % Math.ceil(ranged.length / 7) === 0 && (
                    <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={8} fill="#64748b">
                      {format(new Date(s.date), 'M/d')}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1={0} y1={chartH - 0.75 * chartH} x2={chartW} y2={chartH - 0.75 * chartH}
              stroke="#5EEAD4" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.4} />
          </svg>
        </div>
        <p className="text-slate-600 text-xs mt-1">Dashed line = Good threshold (75)</p>
      </div>

      {/* Bedtime consistency */}
      <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
        <h2 className="text-slate-100 font-semibold mb-3">Bedtime Consistency</h2>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-2xl" style={{ color: consistencyColor }}>{consistencyLabel}</p>
            <p className="text-slate-500 text-xs mt-0.5">±{bedtimeStd} min variance</p>
          </div>
          <div className="text-right">
            <p className="text-slate-300 text-sm font-medium">
              {formatTime(ranged.reduce((acc, s) => {
                const m = bedtimeMinutes(s)
                return acc + m
              }, 0) / ranged.length > 1440
                ? new Date(ranged[0].bedtime).toISOString()
                : ranged[0].bedtime)}
            </p>
            <p className="text-slate-500 text-xs">avg bedtime</p>
          </div>
        </div>
        {/* Bedtime scatter — mini dots chart */}
        <div className="overflow-x-auto">
          <svg width="100%" viewBox={`0 0 ${chartW} 40`} className="w-full">
            {(() => {
              const minM = Math.min(...bedtimeMins)
              const maxM = Math.max(...bedtimeMins)
              const spanM = Math.max(maxM - minM, 60)
              return [...ranged].reverse().map((s, i) => {
                const m = bedtimeMinutes(s)
                const x = (i / (ranged.length - 1 || 1)) * chartW
                const y = 36 - ((m - minM) / spanM) * 32
                return <circle key={s.id} cx={x} cy={y} r={3} fill={scoreColor(s.score)} opacity={0.8} />
              })
            })()}
          </svg>
        </div>
        <p className="text-slate-600 text-xs mt-1">Dot position = bedtime. Consistent = flat line. (Walker 2017)</p>
      </div>

      {/* Weekday vs weekend */}
      {weekday.length > 0 && weekend.length > 0 && (
        <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
          <h2 className="text-slate-100 font-semibold mb-3">Weekday vs Weekend</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-tertiary rounded-xl p-3.5">
              <p className="text-slate-500 text-xs mb-2">Weekdays</p>
              <p className="font-bold text-xl" style={{ color: avgWeekdayScore ? scoreColor(avgWeekdayScore) : '#5EEAD4' }}>{avgWeekdayScore ?? '—'}</p>
              <p className="text-slate-400 text-xs mt-0.5">avg score</p>
              {avgWeekdayDur && <p className="text-slate-500 text-xs mt-1">{formatDuration(avgWeekdayDur)} avg</p>}
            </div>
            <div className="bg-bg-tertiary rounded-xl p-3.5">
              <p className="text-slate-500 text-xs mb-2">Weekends</p>
              <p className="font-bold text-xl" style={{ color: avgWeekendScore ? scoreColor(avgWeekendScore) : '#5EEAD4' }}>{avgWeekendScore ?? '—'}</p>
              <p className="text-slate-400 text-xs mt-0.5">avg score</p>
              {avgWeekendDur && <p className="text-slate-500 text-xs mt-1">{formatDuration(avgWeekendDur)} avg</p>}
            </div>
          </div>
          {avgWeekdayDur && avgWeekendDur && Math.abs(avgWeekendDur - avgWeekdayDur) > 60 && (
            <p className="text-amber-400 text-xs mt-3 leading-relaxed">
              ⚠️ Weekend sleep is {avgWeekendDur > avgWeekdayDur ? 'longer' : 'shorter'} by {formatDuration(Math.abs(avgWeekendDur - avgWeekdayDur))}. Large variation can shift your circadian rhythm (social jet lag).
            </p>
          )}
        </div>
      )}

      {/* Score distribution */}
      <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
        <h2 className="text-slate-100 font-semibold mb-3">Score Distribution</h2>
        <div className="space-y-2.5">
          {distribution.map(d => (
            <div key={d.label} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">{d.label}</span>
                  <span className="text-slate-300 font-medium">{d.count} night{d.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-1.5 bg-bg-tertiary rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${(d.count / nights) * 100}%`, background: d.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best & worst */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-secondary rounded-xl p-4 print-card">
          <p className="text-green-400 text-xs font-semibold mb-2">Best Night</p>
          <p className="font-bold text-3xl text-slate-100">{best.score}</p>
          <p className="text-slate-500 text-xs mt-1">{format(new Date(best.date), 'EEE, MMM d')}</p>
          <p className="text-slate-600 text-[11px] mt-0.5">{formatDuration(best.durationMinutes)}</p>
        </div>
        <div className="bg-bg-secondary rounded-xl p-4 print-card">
          <p className="text-red-400 text-xs font-semibold mb-2">Needs Work</p>
          <p className="font-bold text-3xl text-slate-100">{worst.score}</p>
          <p className="text-slate-500 text-xs mt-1">{format(new Date(worst.date), 'EEE, MMM d')}</p>
          <p className="text-slate-600 text-[11px] mt-0.5">{formatDuration(worst.durationMinutes)}</p>
        </div>
      </div>

      {/* Scoring methodology */}
      <div className="bg-bg-secondary rounded-2xl p-5 mb-4 print-card">
        <h2 className="text-slate-100 font-semibold mb-3">Scoring Methodology</h2>
        <div className="space-y-2.5">
          {[
            { label: 'Duration (40%)', desc: 'NSF recommends 7–9h. Peaks in the 7–9h optimal range.', cite: 'Hirshkowitz et al. 2015' },
            { label: 'Consistency (20%)', desc: 'Same bedtime nightly. ±15 min = full score.', cite: 'Walker 2017' },
            { label: 'Phone Stillness (20%)', desc: 'Low motion proxy for uninterrupted sleep.', cite: 'Actigraph proxy' },
            { label: 'Bedtime Alignment (20%)', desc: 'Optimal window 10 PM–1 AM per circadian biology.', cite: 'Monk et al. 1997; AASM' },
          ].map(item => (
            <div key={item.label} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-teal mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-slate-300 text-sm font-medium">{item.label}</p>
                <p className="text-slate-500 text-xs">{item.desc}</p>
                <p className="text-slate-600 text-[11px] italic">{item.cite}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All sessions table */}
      <div className="bg-bg-secondary rounded-2xl p-5 print-card">
        <h2 className="text-slate-100 font-semibold mb-4">All Sessions</h2>
        <div className="space-y-2">
          {ranged.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-bg-tertiary last:border-0">
              <div>
                <p className="text-slate-300 text-sm font-medium">{format(new Date(s.date), 'EEE, MMM d')}</p>
                <p className="text-slate-500 text-xs">{formatTime(s.bedtime)} → {formatTime(s.wakeTime)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base" style={{ color: scoreColor(s.score) }}>{s.score}</p>
                <p className="text-slate-500 text-xs">{formatDuration(s.durationMinutes)} · {scoreLabel(s.score)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .pdf-mode,
        .pdf-mode .animate-fade-up,
        .pdf-mode .bg-bg-primary {
          background: #ffffff !important;
          color: #111111 !important;
        }

        .pdf-mode .bg-bg-secondary,
        .pdf-mode .bg-bg-tertiary,
        .pdf-mode .print-card {
          background: #f8f8f8 !important;
          border: 1px solid #dddddd !important;
        }

        .pdf-mode .text-slate-100,
        .pdf-mode .text-slate-300,
        .pdf-mode .text-slate-400,
        .pdf-mode .text-slate-500,
        .pdf-mode .text-slate-600 {
          color: #111111 !important;
        }

        .pdf-mode .border-bg-tertiary {
          border-color: #dddddd !important;
        }

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .print-card { background: #f8f8f8 !important; border: 1px solid #ddd !important; margin-bottom: 16px !important; }
          .print-card p, .print-card h2, .print-card span { color: #111 !important; }
        }
      `}</style>
    </div>
  )
}
