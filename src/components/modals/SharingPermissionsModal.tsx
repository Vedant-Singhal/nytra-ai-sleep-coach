import type { SharePref } from '@/types'

const OPTIONS: { pref: SharePref; label: string; desc: string; icon: string }[] = [
  { pref: 'score_only', label: 'Score only', desc: 'Just your sleep score number', icon: '🔢' },
  { pref: 'score_duration', label: 'Score + Duration', desc: 'Score and how long you slept', icon: '⏱' },
  { pref: 'full', label: 'Full details', desc: 'Score, duration, bedtime and wake time', icon: '📋' },
]

interface Props {
  onSelect: (pref: SharePref) => void
  onCancel: () => void
}

export default function SharingPermissionsModal({ onSelect, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-lg mx-auto bg-bg-secondary rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-bg-tertiary rounded-full mx-auto mb-5" />
        <h2 className="text-lg font-bold text-slate-100 mb-1">What do you want to share?</h2>
        <p className="text-slate-500 text-sm mb-5">This preference is saved and applied to all future shares. You can change it anytime in Profile.</p>

        <div className="space-y-2 mb-4">
          {OPTIONS.map(opt => (
            <button
              key={opt.pref}
              onClick={() => onSelect(opt.pref)}
              className="w-full flex items-center gap-4 bg-bg-tertiary rounded-xl px-4 py-3.5 text-left hover:bg-bg-tertiary/80 transition-colors"
            >
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p className="text-slate-100 font-semibold text-sm">{opt.label}</p>
                <p className="text-slate-500 text-xs">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={onCancel} className="w-full text-slate-500 text-sm py-2">Cancel</button>
      </div>
    </div>
  )
}
