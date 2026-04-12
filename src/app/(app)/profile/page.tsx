'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BedDouble, CheckCircle2, Heart, BookOpen, BarChart3, Music2, Gamepad2 } from 'lucide-react'
import { getGoal, saveGoal, getSharingPreference, setSharingPreference, getAutoShare, setAutoShare } from '@/lib/storage'
import { requestNotificationPermission, scheduleWindDownNotification, getStoredPermission, notificationsSupported, isDisabledAlways, isDisabledTonight, disableNotificationsTonight, disableNotificationsAlways, enableNotificationsFromDisabled } from '@/lib/notifications'
import type { SleepGoal, SharePref } from '@/types'

export default function ProfilePage() {
  const [goal, setGoal] = useState<SleepGoal>({ wakeHour: 7, wakeMinute: 0, durationGoalHours: 8 })
  const [editingGoal, setEditingGoal] = useState(false)
  const [draft, setDraft] = useState<SleepGoal>(goal)
  const [notifPerm, setNotifPerm] = useState<string | null>(null)
  const [notifDisabledAlways, setNotifDisabledAlways] = useState(false)
  const [notifDisabledTonight, setNotifDisabledTonight] = useState(false)
  const [sharePref, setSharePref] = useState<SharePref>('score_duration')
  const [autoShare, setAutoShareState] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setGoal(getGoal())
    setDraft(getGoal())
    setNotifPerm(getStoredPermission())
    setNotifDisabledAlways(isDisabledAlways())
    setNotifDisabledTonight(isDisabledTonight())
    setSharePref(getSharingPreference() ?? 'score_duration')
    setAutoShareState(getAutoShare())
  }, [])

  function saveGoalDraft() {
    saveGoal(draft)
    setGoal(draft)
    setEditingGoal(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function enableNotifications() {
    const perm = await requestNotificationPermission()
    setNotifPerm(perm)
    setNotifDisabledAlways(false)
    setNotifDisabledTonight(false)
    if (perm === 'granted') scheduleWindDownNotification(goal)
  }

  function handleDisableTonight() {
    disableNotificationsTonight()
    setNotifDisabledTonight(true)
  }

  function handleDisableAlways() {
    disableNotificationsAlways()
    setNotifDisabledAlways(true)
  }

  function handleReEnable() {
    enableNotificationsFromDisabled()
    setNotifDisabledAlways(false)
    setNotifDisabledTonight(false)
    scheduleWindDownNotification(goal)
  }

  function handleAutoShareToggle() {
    const next = !autoShare
    setAutoShare(next)
    setAutoShareState(next)
  }

  function handleSharePrefChange(pref: SharePref) {
    setSharingPreference(pref)
    setSharePref(pref)
  }

  const bedtimeFormatted = (() => {
    const totalMin = draft.wakeHour * 60 + draft.wakeMinute - draft.durationGoalHours * 60
    const norm = ((totalMin % 1440) + 1440) % 1440
    const h = Math.floor(norm / 60)
    const m = (norm % 60).toString().padStart(2, '0')
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour}:${m} ${period}`
  })()

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 animate-fade-up">
      <h1 className="text-2xl font-bold text-slate-100">Profile</h1>

      {/* Sleep Goal */}
      <div className="bg-bg-secondary rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-100 font-semibold">Sleep Goal</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Wake {goal.wakeHour.toString().padStart(2,'0')}:{goal.wakeMinute.toString().padStart(2,'0')} · {goal.durationGoalHours}h sleep
            </p>
          </div>
          <button
            onClick={() => { setEditingGoal(!editingGoal); setDraft(goal) }}
            className="text-accent-teal text-sm font-medium"
          >
            {editingGoal ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingGoal && (
          <div className="space-y-5">
            {/* Wake time */}
            <div>
              <p className="text-slate-400 text-xs mb-2">Wake time</p>
              <div className="flex items-center gap-2">
                <select
                  value={draft.wakeHour}
                  onChange={e => setDraft({ ...draft, wakeHour: Number(e.target.value) })}
                  className="bg-bg-tertiary text-accent-teal text-2xl font-bold rounded-xl px-3 py-2 outline-none appearance-none text-center w-20"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-2xl font-bold text-slate-400">:</span>
                <select
                  value={draft.wakeMinute}
                  onChange={e => setDraft({ ...draft, wakeMinute: Number(e.target.value) })}
                  className="bg-bg-tertiary text-accent-teal text-2xl font-bold rounded-xl px-3 py-2 outline-none appearance-none text-center w-20"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-slate-400 text-xs">Sleep duration goal</p>
                <span className="text-accent-teal font-bold text-sm">{draft.durationGoalHours}h</span>
              </div>
              <input
                type="range" min={5} max={10} step={0.5}
                value={draft.durationGoalHours}
                onChange={e => setDraft({ ...draft, durationGoalHours: Number(e.target.value) })}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #5EEAD4 0%, #5EEAD4 ${((draft.durationGoalHours - 5) / 5) * 100}%, #1A2332 ${((draft.durationGoalHours - 5) / 5) * 100}%, #1A2332 100%)` }}
              />
            </div>

            {/* Derived bedtime */}
            <div className="bg-accent-teal/8 border border-accent-teal/20 rounded-xl p-3 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-accent-teal" />
              <p className="text-accent-teal text-sm font-medium">Ideal bedtime: {bedtimeFormatted}</p>
            </div>

            <button onClick={saveGoalDraft} className="w-full bg-accent-teal text-bg-primary font-semibold rounded-xl py-3 text-sm">
              Save Goal
            </button>
            {saved && <p className="text-green-400 text-xs text-center">Saved!</p>}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-bg-secondary rounded-2xl p-5">
        <h2 className="text-slate-100 font-semibold mb-1">Bedtime Reminder</h2>
        <p className="text-slate-500 text-xs mb-4">Get a gentle nudge 30 min before your ideal bedtime.</p>
        {!notificationsSupported() ? (
          <p className="text-slate-500 text-xs">Not supported in this browser.</p>
        ) : notifPerm === 'granted' && !notifDisabledAlways ? (
          <div className="space-y-3">
            {notifDisabledTonight ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Skipped for tonight</span>
                <button onClick={handleReEnable} className="text-accent-teal text-xs font-medium">Re-enable</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                <CheckCircle2 className="w-4 h-4" /> Reminders active
              </div>
            )}
            {!notifDisabledTonight && (
              <div className="flex gap-2">
                <button
                  onClick={handleDisableTonight}
                  className="flex-1 bg-bg-tertiary text-slate-300 text-xs font-medium py-2 rounded-xl"
                >
                  Skip tonight
                </button>
                <button
                  onClick={handleDisableAlways}
                  className="flex-1 bg-bg-tertiary text-slate-400 text-xs font-medium py-2 rounded-xl"
                >
                  Turn off
                </button>
              </div>
            )}
          </div>
        ) : notifPerm === 'granted' && notifDisabledAlways ? (
          <div className="space-y-2">
            <p className="text-slate-500 text-xs">Reminders are turned off.</p>
            <button
              onClick={handleReEnable}
              className="bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-sm font-medium px-4 py-2.5 rounded-xl"
            >
              Turn reminders back on
            </button>
          </div>
        ) : notifPerm === 'denied' ? (
          <p className="text-slate-500 text-xs">Permission denied. Enable notifications in your browser settings.</p>
        ) : (
          <button
            onClick={enableNotifications}
            className="bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-sm font-medium px-4 py-2.5 rounded-xl"
          >
            Enable bedtime reminder
          </button>
        )}
      </div>

      {/* Sharing preference */}
      <div className="bg-bg-secondary rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-slate-100 font-semibold">Community Sharing</h2>
          {/* Toggle */}
          <button
            onClick={handleAutoShareToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${autoShare ? 'bg-accent-teal' : 'bg-bg-tertiary'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoShare ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <p className="text-slate-500 text-xs mb-4">
          {autoShare ? 'New sessions automatically post to the community feed.' : 'Sessions stay private. You can share individually from History or after tracking.'}
        </p>

        {autoShare && (
          <div className="space-y-1.5">
            <p className="text-slate-400 text-xs font-medium mb-2">What to share</p>
            {([
              { pref: 'score_only', label: 'Score only', desc: 'Just the number' },
              { pref: 'score_duration', label: 'Score + Duration', desc: 'How long + score' },
              { pref: 'full', label: 'Full details', desc: 'Score, times & duration' },
            ] as { pref: SharePref; label: string; desc: string }[]).map(opt => (
              <button
                key={opt.pref}
                onClick={() => handleSharePrefChange(opt.pref)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-left ${
                  sharePref === opt.pref ? 'bg-accent-teal/10 border border-accent-teal/30' : 'bg-bg-tertiary'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${sharePref === opt.pref ? 'text-accent-teal' : 'text-slate-300'}`}>{opt.label}</p>
                  <p className="text-slate-500 text-xs">{opt.desc}</p>
                </div>
                {sharePref === opt.pref && (
                  <svg className="w-4 h-4 text-accent-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="bg-bg-secondary rounded-2xl overflow-hidden mt-6">
        {[
          { href: '/wellness', icon: <Heart className="w-5 h-5 text-green-400" />, label: 'Mental Wellness' },
          { href: '/guidelines', icon: <BookOpen className="w-5 h-5 text-blue-400" />, label: 'Sleep Guidelines' },
          { href: '/report', icon: <BarChart3 className="w-5 h-5 text-purple-400" />, label: 'Insights & PDF Report' },
          { href: '/music', icon: <Music2 className="w-5 h-5 text-pink-400" />, label: 'Sleep Music' },
          { href: '/games', icon: <Gamepad2 className="w-5 h-5 text-orange-400" />, label: 'Sleep Game' },
        ].map((item, i, arr) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-5 py-4 hover:bg-bg-tertiary transition-colors ${i < arr.length - 1 ? 'border-b border-bg-tertiary' : ''}`}
          >
            {item.icon}
            <span className="text-slate-300 text-sm flex-1">{item.label}</span>
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
