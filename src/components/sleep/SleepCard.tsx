import { formatDuration, formatTime, scoreColor, scoreLabel } from '@/lib/scorer'
import type { SleepSession } from '@/types'
import { format } from 'date-fns'

interface Props {
  session: SleepSession
  showDate?: boolean
  compact?: boolean
  href?: string
  onToggleExclude?: (e: React.MouseEvent) => void
  onToggleShare?: (e: React.MouseEvent) => void
}

export default function SleepCard({ session, showDate = true, compact = false, onToggleExclude, onToggleShare }: Props) {
  const color = scoreColor(session.score)
  const label = scoreLabel(session.score)

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-bg-secondary rounded-2xl p-3.5"
        style={{ border: `1px solid ${color}20` }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18` }}>
          <span className="font-bold text-sm" style={{ color }}>{session.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-100 font-semibold text-sm">{formatDuration(session.durationMinutes)}</p>
          <p className="text-slate-400 text-xs">{formatTime(session.bedtime)} → {formatTime(session.wakeTime)}</p>
        </div>
        {showDate && <span className="text-slate-500 text-xs flex-shrink-0">{format(new Date(session.date), 'MMM d')}</span>}
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-2xl p-4 card-hover transition-all"
      style={{ border: `1px solid ${color}22` }}>
      {onToggleShare && (
        <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-bg-tertiary">
          <span className="text-xs text-slate-500">Community</span>
          <button
            onClick={onToggleShare}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              session.isShared
                ? 'bg-green-400/10 text-green-400'
                : 'bg-bg-tertiary text-slate-500 hover:text-slate-300'
            }`}
          >
            {session.isShared ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                Shared
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
              </>
            )}
          </button>
        </div>
      )}
      <div className="flex items-center gap-4">
        {/* Score ring */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1A2332" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="4"
              strokeLinecap="round" opacity="0.8"
              strokeDasharray={`${(session.score / 100) * 138} 138`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-sm leading-none" style={{ color }}>{session.score}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {showDate && (
            <p className="text-slate-500 text-xs mb-0.5">
              {format(new Date(session.date), 'EEE, MMM d')}
            </p>
          )}
          <p className="text-slate-100 font-semibold text-base">{formatDuration(session.durationMinutes)}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-slate-400 text-xs">🌙 {formatTime(session.bedtime)}</span>
            <span className="text-slate-400 text-xs">☀️ {formatTime(session.wakeTime)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color, background: `${color}18` }}>
            {label}
          </span>
          {onToggleExclude ? (
            <button
              onClick={onToggleExclude}
              title={session.isExcluded ? 'Include in score' : 'Exclude from score'}
              className="p-1 rounded-lg transition-colors text-slate-500 hover:text-slate-300 hover:bg-slate-700/40"
            >
              {session.isExcluded ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              )}
            </button>
          ) : (
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
