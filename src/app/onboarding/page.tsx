'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveGoal, setOnboardingComplete } from '@/lib/storage'

type Step = 'welcome' | 'goal'

function MoonIllustration() {
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" fill="none" className="animate-float">
      {/* Outer glow ring */}
      <circle cx="110" cy="110" r="100" fill="rgba(94,234,212,0.04)" />
      <circle cx="110" cy="110" r="82" fill="rgba(94,234,212,0.06)" />
      {/* Moon */}
      <circle cx="110" cy="110" r="62" fill="#1A2332" />
      <circle cx="110" cy="110" r="60" fill="url(#moonGrad)" />
      {/* Moon crescent shadow */}
      <circle cx="130" cy="98" r="46" fill="#0A0D14" opacity="0.85" />
      {/* Stars */}
      <circle cx="58" cy="52" r="1.5" fill="#5EEAD4" opacity="0.8" />
      <circle cx="165" cy="70" r="1" fill="#818CF8" opacity="0.7" />
      <circle cx="44" cy="148" r="1" fill="#5EEAD4" opacity="0.6" />
      <circle cx="178" cy="145" r="1.5" fill="#818CF8" opacity="0.8" />
      <circle cx="82" cy="32" r="1" fill="white" opacity="0.5" />
      <circle cx="148" cy="28" r="1.5" fill="white" opacity="0.4" />
      <circle cx="190" cy="100" r="1" fill="#5EEAD4" opacity="0.6" />
      <circle cx="30" cy="95" r="1" fill="white" opacity="0.4" />
      {/* Sparkle top-right */}
      <g transform="translate(162, 50)" opacity="0.7">
        <line x1="0" y1="-6" x2="0" y2="6" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="-6" y1="0" x2="6" y2="0" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
      <defs>
        <radialGradient id="moonGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2A3A52" />
          <stop offset="100%" stopColor="#141C2A" />
        </radialGradient>
      </defs>
    </svg>
  )
}

const STATS = [
  { value: '2M+', label: 'nights tracked' },
  { value: '8.1h', label: 'avg goal sleep' },
  { value: '94%', label: 'feel better' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [wakeHour, setWakeHour] = useState(7)
  const [wakeMinute, setWakeMinute] = useState(0)
  const [durationGoalHours, setDurationGoalHours] = useState(8)

  const bedtimeFormatted = (() => {
    const totalMin = wakeHour * 60 + wakeMinute - durationGoalHours * 60
    const norm = ((totalMin % 1440) + 1440) % 1440
    const h = Math.floor(norm / 60)
    const m = (norm % 60).toString().padStart(2, '0')
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour}:${m} ${period}`
  })()

  const wakeTimeFormatted = (() => {
    const h = wakeHour
    const m = wakeMinute.toString().padStart(2, '0')
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour}:${m} ${period}`
  })()

  function finish() {
    saveGoal({ wakeHour, wakeMinute, durationGoalHours })
    setOnboardingComplete()
    router.replace('/home')
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col overflow-hidden" style={{
        background: 'radial-gradient(ellipse at 60% 20%, rgba(94,234,212,0.10) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(129,140,248,0.10) 0%, transparent 50%), #0A0D14'
      }}>
        {/* Top decorative dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 2 + 1 + 'px',
                height: Math.random() * 2 + 1 + 'px',
                background: i % 2 === 0 ? '#5EEAD4' : '#818CF8',
                opacity: Math.random() * 0.4 + 0.2,
                top: Math.random() * 60 + '%',
                left: Math.random() * 100 + '%',
              }}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 animate-fade-up">
          {/* Moon illustration */}
          <div className="mb-6">
            <MoonIllustration />
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold text-center leading-[1.1] tracking-tight mb-4">
            <span className="gradient-text">Nytra</span>
          </h1>
          <p className="text-slate-300 text-xl font-semibold text-center mt-1 mb-3">Sleep Smarter.</p>
          <p className="text-slate-400 text-base text-center leading-relaxed max-w-xs mb-10">
            Your phone already knows when you sleep. Nytra turns that into insights — and a community.
          </p>

          {/* Social proof stats */}
          <div className="flex gap-6 mb-12">
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="gradient-text font-bold text-xl">{s.value}</span>
                <span className="text-slate-600 text-[11px] mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="px-6 pb-12 space-y-3">
          <button
            onClick={() => setStep('goal')}
            className="btn-press w-full font-semibold rounded-2xl py-4 text-base relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
          >
            Get Started
          </button>
          <p className="text-slate-700 text-xs text-center">
            We never read your messages, photos, or location.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col animate-fade-up">
      {/* Header */}
      <div className="px-6 pt-12 pb-2">
        <button onClick={() => setStep('welcome')} className="text-slate-500 mb-6 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-slate-100 mb-1">When do you<br />want to wake up?</h1>
        <p className="text-slate-500 text-sm">We&apos;ll build your sleep goal around this.</p>
      </div>

      <div className="flex-1 px-6 pt-8 space-y-8">
        {/* Wake time display — large clickable cards */}
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Wake time</p>
          <div className="flex items-center justify-center gap-3">
            <select
              value={wakeHour}
              onChange={e => setWakeHour(Number(e.target.value))}
              className="flex-1 text-center text-5xl font-bold rounded-2xl py-5 outline-none appearance-none cursor-pointer"
              style={{ background: '#111827', color: '#5EEAD4', border: '1px solid rgba(94,234,212,0.2)' }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
              ))}
            </select>
            <span className="text-5xl font-bold text-slate-600">:</span>
            <select
              value={wakeMinute}
              onChange={e => setWakeMinute(Number(e.target.value))}
              className="flex-1 text-center text-5xl font-bold rounded-2xl py-5 outline-none appearance-none cursor-pointer"
              style={{ background: '#111827', color: '#5EEAD4', border: '1px solid rgba(94,234,212,0.2)' }}
            >
              {[0, 15, 30, 45].map(m => (
                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration slider */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Sleep duration goal</p>
            <span className="font-bold text-lg gradient-text">{durationGoalHours}h</span>
          </div>
          <input
            type="range"
            min={5} max={10} step={0.5}
            value={durationGoalHours}
            onChange={e => setDurationGoalHours(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #5EEAD4 0%, #818CF8 ${((durationGoalHours - 5) / 5) * 100}%, #1A2332 ${((durationGoalHours - 5) / 5) * 100}%, #1A2332 100%)`
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="text-slate-600 text-xs">5 hours</span>
            <span className="text-slate-500 text-xs">NSF recommends 7–9h</span>
            <span className="text-slate-600 text-xs">10 hours</span>
          </div>
        </div>

        {/* Derived bedtime — prominent card */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(94,234,212,0.08) 0%, rgba(129,140,248,0.08) 100%)', border: '1px solid rgba(94,234,212,0.2)' }}>
          <div className="w-12 h-12 rounded-xl bg-accent-teal/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🛏️</span>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Your ideal bedtime</p>
            <p className="text-2xl font-bold gradient-text">{bedtimeFormatted}</p>
            <p className="text-slate-500 text-xs mt-0.5">to wake at {wakeTimeFormatted}</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-12 pt-6">
        <button
          onClick={finish}
          className="btn-press w-full font-semibold rounded-2xl py-4 text-base"
          style={{ background: 'linear-gradient(135deg, #5EEAD4 0%, #818CF8 100%)', color: '#0A0D14' }}
        >
          Let&apos;s go →
        </button>
      </div>
    </div>
  )
}
