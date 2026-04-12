/**
 * Web sleep detection via DeviceMotion API.
 * Works on iOS Safari (requires user gesture + permission) and Android Chrome.
 * Falls back gracefully on desktop.
 */

import { appendSample } from './storage'

let _intervalId: ReturnType<typeof setInterval> | null = null
let _lastMagnitude = 0

export async function requestMotionPermission(): Promise<boolean> {
  // iOS 13+ requires explicit permission
  if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
    const result = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
    return result === 'granted'
  }
  // Android Chrome / desktop — no permission needed
  return true
}

export function startMotionSampling(): void {
  if (typeof window === 'undefined') return

  // Listen to accelerometer
  const handleMotion = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity
    if (!acc) return
    const mag = Math.sqrt(
      (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2
    ) - 9.8
    _lastMagnitude = Math.abs(mag)
  }

  window.addEventListener('devicemotion', handleMotion)

  // Write a sample to localStorage every 30 seconds
  _intervalId = setInterval(() => {
    appendSample(_lastMagnitude)
    _lastMagnitude = 0 // reset to detect quiet periods
  }, 30_000)

  // Store cleanup function on window for service-like behaviour
  ;(window as unknown as Record<string, unknown>).__sleepCleanup = () => {
    window.removeEventListener('devicemotion', handleMotion)
    if (_intervalId) clearInterval(_intervalId)
  }
}

export function stopMotionSampling(): void {
  const cleanup = (window as unknown as Record<string, unknown>).__sleepCleanup as (() => void) | undefined
  cleanup?.()
  if (_intervalId) { clearInterval(_intervalId); _intervalId = null }
}
