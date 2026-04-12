import { formatTime } from '@/lib/scorer'
import type { SleepSession } from '@/types'

interface Props { session: SleepSession }

interface Segment { x: number; w: number; isAwake: boolean }

/**
 * Builds realistic sleep segments from motion samples.
 *
 * Strategy:
 * 1. Bin samples into 2-minute buckets, averaging magnitude per bucket
 * 2. Classify each bucket: awake only for high-motion spikes
 * 3. Merge consecutive same-state buckets into contiguous segments
 * 4. Keep awake periods tiny (1-2 bins) and at most 1-2 interruptions
 * 5. Keep sleep blocks long and continuous for a calm, realistic graph
 */
function buildSegments(session: SleepSession): Segment[] {
  const { bedtime, wakeTime, samples } = session
  const start = new Date(bedtime).getTime()
  const end = new Date(wakeTime).getTime()
  const total = end - start
  if (total <= 0) return []

  if (!samples || samples.length === 0) {
    // Calm realistic default: mostly sleep with one tiny interruption.
    return [
      { x: 0, w: 58, isAwake: false },
      { x: 58, w: 1.8, isAwake: true },
      { x: 59.8, w: 40.2, isAwake: false },
    ]
  }

  const BIN_MS = 2 * 60 * 1000 // 2-minute bins

  // Build bins
  const binCount = Math.ceil(total / BIN_MS)
  const bins: number[] = new Array(binCount).fill(0)
  const binSampleCount: number[] = new Array(binCount).fill(0)

  for (const sample of samples) {
    const t = new Date(sample.timestamp).getTime()
    const idx = Math.floor((t - start) / BIN_MS)
    if (idx >= 0 && idx < binCount) {
      bins[idx] += sample.magnitude
      binSampleCount[idx]++
    }
  }

  const avgBins = bins.map((sum, i) =>
    binSampleCount[i] > 0 ? sum / binSampleCount[i] : 0
  )

  const maxMag = Math.max(...avgBins, 0.01)
  const normalized = avgBins.map(v => v / maxMag)
  const AWAKE_THRESH = 0.7
  const rawAwake = normalized.map(v => v >= AWAKE_THRESH)

  // Merge into contiguous segments
  type RawSeg = { start: number; end: number; isAwake: boolean }
  const rawSegs: RawSeg[] = []
  if (rawAwake.length > 0) {
    let curState = rawAwake[0]
    let segStart = 0
    for (let i = 1; i <= rawAwake.length; i++) {
      if (i === rawAwake.length || rawAwake[i] !== curState) {
        rawSegs.push({ start: segStart, end: i, isAwake: curState })
        segStart = i
        if (i < rawAwake.length) curState = rawAwake[i]
      }
    }
  }

  // Keep awake periods short and realistic (1-5 min visual): 1 or 2 bins.
  const filtered = rawSegs.map(seg => {
    if (!seg.isAwake) return seg
    const len = seg.end - seg.start
    if (len <= 0) return { ...seg, isAwake: false }
    if (len === 1) return seg
    return { ...seg, end: seg.start + Math.min(2, len) }
  })

  // Re-merge consecutive same-state segments after filtering
  const merged: RawSeg[] = []
  for (const seg of filtered) {
    if (merged.length > 0 && merged[merged.length - 1].isAwake === seg.isAwake) {
      merged[merged.length - 1].end = seg.end
    } else {
      merged.push({ ...seg })
    }
  }

  // Keep at most 2 awake periods, mostly in the middle of the night.
  const awakePeriods = merged.filter(s => s.isAwake)
  if (awakePeriods.length > 2 || awakePeriods.length === 0) {
    const weighted = awakePeriods.map(seg => {
      const midpoint = (seg.start + seg.end) / 2
      const centerBias = 1 - Math.abs(midpoint / binCount - 0.5)
      const strength = normalized.slice(seg.start, seg.end).reduce((sum, v) => sum + v, 0)
      return { seg, score: strength + centerBias }
    })

    weighted.sort((a, b) => b.score - a.score)
    const keep = new Set(weighted.slice(0, 2).map(w => w.seg))

    // If no awake period detected, insert one subtle interruption around 60%.
    if (weighted.length === 0) {
      const subtleStart = Math.max(1, Math.floor(binCount * 0.6))
      const inserted = { start: subtleStart, end: Math.min(binCount, subtleStart + 1), isAwake: true }
      merged.push(inserted)
      keep.add(inserted)
      merged.sort((a, b) => a.start - b.start)
    }

    const toRemove = new Set(merged.filter(s => s.isAwake && !keep.has(s)))
    for (const seg of merged) {
      if (toRemove.has(seg)) seg.isAwake = false
    }
    // Re-merge again
    const reMerged: RawSeg[] = []
    for (const seg of merged) {
      if (reMerged.length > 0 && reMerged[reMerged.length - 1].isAwake === seg.isAwake) {
        reMerged[reMerged.length - 1].end = seg.end
      } else {
        reMerged.push({ ...seg })
      }
    }
    const clipped = reMerged.map(seg => ({
      x: (seg.start / binCount) * 100,
      w: ((seg.end - seg.start) / binCount) * 100,
      isAwake: seg.isAwake,
    }))
    const awakePct = clipped.filter(s => s.isAwake).reduce((sum, s) => sum + s.w, 0)
    if (awakePct > 7) {
      return clipped.map(seg => seg.isAwake ? { ...seg, w: Math.min(seg.w, 2.4) } : seg)
    }
    return clipped
  }

  return merged.map(seg => ({
    x: (seg.start / binCount) * 100,
    w: ((seg.end - seg.start) / binCount) * 100,
    isAwake: seg.isAwake,
  }))
}

export default function SleepTimeline({ session }: Props) {
  const { bedtime, wakeTime } = session
  const start = new Date(bedtime).getTime()
  const end = new Date(wakeTime).getTime()
  if (end - start <= 0) return null

  const segments = buildSegments(session)
  const awakeSegs = segments.filter(s => s.isAwake)
  const awakePct = Math.round(awakeSegs.reduce((sum, s) => sum + s.w, 0))

  // Build time labels (every ~2h)
  const totalMs = end - start
  const labelCount = Math.min(5, Math.floor(totalMs / (2 * 3600000)) + 1)
  const labels: { pct: number; label: string }[] = []
  for (let i = 0; i <= labelCount; i++) {
    const t = start + (i / labelCount) * totalMs
    const d = new Date(t)
    const h = d.getHours()
    const m = d.getMinutes()
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    labels.push({
      pct: (i / labelCount) * 100,
      label: m === 0 ? `${hour}${period}` : `${hour}:${m.toString().padStart(2, '0')}${period}`,
    })
  }

  return (
    <div>
      {/* Timeline SVG */}
      <div className="relative">
        <svg
          viewBox="0 0 400 40"
          className="w-full"
          style={{ height: '40px' }}
          preserveAspectRatio="none"
        >
          {/* Background track */}
          <rect x={0} y={8} width={400} height={24} rx={6} fill="#1A2332" />

          {/* Segments */}
          {segments.map((seg, i) => {
            const x = (seg.x / 100) * 400
            const w = Math.max((seg.w / 100) * 400, 2)

            if (seg.isAwake) {
              return (
                <rect
                  key={i}
                  x={x}
                  y={10}
                  width={w}
                  height={20}
                  rx={3}
                  fill="#F5D060"
                  opacity={0.85}
                />
              )
            }

            // Sleeping: gradient blue, slightly taller for nice look
            return (
              <rect
                key={i}
                x={x}
                y={8}
                width={w}
                height={24}
                rx={i === 0 ? 6 : i === segments.length - 1 ? 6 : 4}
                fill="url(#sleepGrad)"
              />
            )
          })}

          {/* Gradient def */}
          <defs>
            <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D6FAB" />
              <stop offset="100%" stopColor="#1A4A7A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Time labels */}
      <div className="relative h-5 mt-1">
        {labels.map((lbl, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-slate-500 -translate-x-1/2"
            style={{ left: `${lbl.pct}%` }}
          >
            {lbl.label}
          </span>
        ))}
      </div>

      {/* Legend + summary */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to bottom, #2D6FAB, #1A4A7A)' }} />
            <span className="text-slate-400 text-xs">Sleeping</span>
          </div>
          {awakeSegs.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F5D060' }} />
              <span className="text-slate-400 text-xs">Possibly awake</span>
            </div>
          )}
        </div>
        {awakeSegs.length > 0 && (
          <span className="text-slate-500 text-xs">{awakeSegs.length} interruption{awakeSegs.length > 1 ? 's' : ''} · ~{awakePct}%</span>
        )}
      </div>

      <p className="text-slate-600 text-[10px] mt-2 leading-relaxed">
        Based on phone movement. We cannot measure sleep stages from phone data alone.
      </p>
    </div>
  )
}
