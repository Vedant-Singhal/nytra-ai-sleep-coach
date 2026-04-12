import type { SleepGoal } from '@/types'

let _notifTimer: ReturnType<typeof setTimeout> | null = null

const DISABLED_TONIGHT_KEY = 'notif_disabled_tonight'
const DISABLED_ALWAYS_KEY = 'notif_disabled_always'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  // Clear any "disabled always" flag when re-enabling
  localStorage.removeItem(DISABLED_ALWAYS_KEY)
  localStorage.removeItem(DISABLED_TONIGHT_KEY)
  const perm = await Notification.requestPermission()
  localStorage.setItem('notif_permission', perm)
  return perm
}

export function getStoredPermission(): NotificationPermission | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem('notif_permission') as NotificationPermission) ?? null
}

export function isDisabledAlways(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DISABLED_ALWAYS_KEY) === 'true'
}

export function isDisabledTonight(): boolean {
  if (typeof window === 'undefined') return false
  const val = localStorage.getItem(DISABLED_TONIGHT_KEY)
  if (!val) return false
  // expires at midnight
  const date = new Date(val)
  if (date < new Date()) {
    localStorage.removeItem(DISABLED_TONIGHT_KEY)
    return false
  }
  return true
}

export function disableNotificationsTonight(): void {
  cancelWindDownNotification()
  // Expires at 6 AM next morning
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 1)
  expiry.setHours(6, 0, 0, 0)
  localStorage.setItem(DISABLED_TONIGHT_KEY, expiry.toISOString())
}

export function disableNotificationsAlways(): void {
  cancelWindDownNotification()
  localStorage.setItem(DISABLED_ALWAYS_KEY, 'true')
}

export function enableNotificationsFromDisabled(): void {
  localStorage.removeItem(DISABLED_ALWAYS_KEY)
  localStorage.removeItem(DISABLED_TONIGHT_KEY)
}

export function scheduleWindDownNotification(goal: SleepGoal): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  if (isDisabledAlways() || isDisabledTonight()) return
  cancelWindDownNotification()

  const now = new Date()
  // Ideal bedtime = wake time minus sleep duration
  const bedtotalMin = goal.wakeHour * 60 + goal.wakeMinute - goal.durationGoalHours * 60
  const normMin = ((bedtotalMin % 1440) + 1440) % 1440
  const bedHour = Math.floor(normMin / 60)
  const bedMinute = normMin % 60

  // Notify 30 min before bedtime
  const notifyHour = bedMinute >= 30 ? bedHour : bedHour === 0 ? 23 : bedHour - 1
  const notifyMinute = bedMinute >= 30 ? bedMinute - 30 : bedMinute + 30

  const notifyTime = new Date()
  notifyTime.setHours(notifyHour, notifyMinute, 0, 0)
  // If already past for today, schedule for tomorrow
  if (notifyTime <= now) notifyTime.setDate(notifyTime.getDate() + 1)

  const msUntil = notifyTime.getTime() - now.getTime()
  _notifTimer = setTimeout(() => {
    new Notification('Time to wind down 🌙', {
      body: `Your ideal bedtime is in 30 minutes. Start winding down for a better sleep score.`,
      icon: '/icons/icon-192.png',
    })
  }, msUntil)
}

export function cancelWindDownNotification(): void {
  if (_notifTimer !== null) {
    clearTimeout(_notifTimer)
    _notifTimer = null
  }
}
