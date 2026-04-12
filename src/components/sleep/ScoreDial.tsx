'use client'
import { useEffect, useRef, useState } from 'react'
import { scoreColor, scoreLabel } from '@/lib/scorer'

interface Props {
  score: number
  size?: number
  animate?: boolean
}

export default function ScoreDial({ score, size = 160, animate = true }: Props) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score)
  const [progress, setProgress] = useState(animate ? 0 : score / 100)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!animate) { setDisplayScore(score); setProgress(score / 100); return }

    const start = performance.now()
    const duration = 1500

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(eased * score))
      setProgress(eased * (score / 100))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick)
    }, 300)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [score, animate])

  const strokeWidth = size * 0.075
  const radius = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  const startAngle = 135 * (Math.PI / 180)
  const totalSweep = 270 * (Math.PI / 180)
  const arcLength = circumference * (270 / 360)
  const filledLength = arcLength * progress

  function polarToXY(angle: number) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  }

  const startPt = polarToXY(startAngle)
  const endAngle = startAngle + totalSweep
  const endPt = polarToXY(endAngle)
  const trackPath = `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 1 1 ${endPt.x} ${endPt.y}`
  const color = scoreColor(score)

  // Glow class based on score
  const glowClass = score >= 75 ? 'score-glow-good' : score >= 60 ? 'score-glow-fair' : 'score-glow-poor'

  return (
    <div style={{ width: size, height: size }} className="relative flex-shrink-0">
      <svg width={size} height={size} className={glowClass}>
        <defs>
          <linearGradient id={`dialGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          {/* Glow filter */}
          <filter id={`glow_${size}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={size * 0.04} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track background */}
        <path
          d={trackPath}
          fill="none"
          stroke="#1A2332"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Subtle inner track glow */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(94,234,212,0.04)"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#dialGrad_${size})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${circumference - filledLength}`}
          strokeDashoffset={-(circumference * (135 / 360))}
          filter={`url(#glow_${size})`}
          style={{ transition: animate ? 'stroke-dasharray 1.5s cubic-bezier(0.16, 1, 0.3, 1)' : undefined }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: size * 0.28, color: '#F1F5F9' }}
        >
          {displayScore}
        </span>
        <span
          className="font-semibold mt-1 uppercase tracking-wide"
          style={{ fontSize: size * 0.085, color }}
        >
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  )
}
