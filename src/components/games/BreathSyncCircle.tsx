'use client'

import { useEffect, useRef } from 'react'

export default function BreathSyncCircle() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let start = performance.now()

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000
      const phaseLength = 10
      const t = (elapsed % phaseLength) / phaseLength

      // Starts around 4.5s cycles and eases toward slower 7s cycles
      const easing = Math.min(1, elapsed / 90)
      const breath = Math.sin(t * Math.PI * 2)
      const slowScale = 1 - easing * 0.3
      const pulse = 0.55 + ((breath + 1) / 2) * 0.45 * slowScale

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w / 2
      const cy = h / 2
      const baseR = Math.min(w, h) * 0.2
      const radius = baseR + pulse * (Math.min(w, h) * 0.2)

      ctx.clearRect(0, 0, w, h)

      const grad = ctx.createRadialGradient(cx, cy, baseR * 0.3, cx, cy, radius)
      grad.addColorStop(0, 'rgba(94,234,212,0.42)')
      grad.addColorStop(1, 'rgba(129,140,248,0.08)')

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(148,163,184,0.28)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 2.1, 0, Math.PI * 2)
      ctx.stroke()

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section className="bg-bg-secondary rounded-2xl p-4 border border-bg-tertiary">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-100 font-semibold text-sm">Breath-Sync Circle</h2>
        <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-300/15 text-indigo-200">Slow mode</span>
      </div>
      <p className="text-slate-500 text-xs mb-3">Follow the circle. Inhale as it grows, exhale as it softens.</p>
      <div className="rounded-xl bg-bg-tertiary p-2">
        <canvas ref={canvasRef} className="w-full h-36 rounded-lg" />
      </div>
    </section>
  )
}
