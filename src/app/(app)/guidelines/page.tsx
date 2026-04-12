import Link from 'next/link'

const sections = [
  {
    icon: '📱',
    title: 'How to Track Sleep',
    tips: [
      'Tap "Track Sleep" on the home screen before you get into bed.',
      'Place your phone face-down on your nightstand, plugged into a charger.',
      'Keep the phone within ~50 cm of your body for accurate motion detection.',
      'Do not move or pick up your phone until you wake up — motion will be counted.',
      'Tap "Stop Tracking" in the morning after you wake up to save your session.',
    ],
  },
  {
    icon: '📊',
    title: 'Understanding Your Score',
    tips: [
      'Your score (0–100) is calculated from three signals: sleep duration, bedtime consistency, and phone stillness.',
      'Duration accounts for 40% of your score — NSF recommends 7–9 hours for adults.',
      'Consistency (20%) rewards keeping a stable bedtime night over night.',
      'Phone stillness (20%) is a proxy for sleep — if your phone didn\'t move, you likely were asleep.',
      'Bedtime alignment (20%) rewards sleeping during the optimal circadian window (10 PM–1 AM).',
      'Scores are estimates based on phone sensors, not medical-grade sleep staging.',
    ],
  },
  {
    icon: '🔒',
    title: 'Your Data & Privacy',
    tips: [
      'All your sleep data is stored locally on this device only — nothing is sent to any server.',
      'Your sessions, goals, and preferences live in your browser\'s localStorage.',
      'Clearing your browser data or uninstalling the app will permanently delete all sessions.',
      'When you share a session to the Community feed, only what you chose (score, duration, or full details) is posted.',
      'The AI Sleep Analysis feature sends anonymised session summaries (no raw motion data) to the Claude API.',
    ],
  },
  {
    icon: '⚙️',
    title: 'Tips for Accurate Results',
    tips: [
      'Always charge your phone overnight — low battery can cause the app to be killed by the OS.',
      'Grant motion permissions when prompted — this is required for tracking.',
      'Avoid placing the phone in a drawer or under the mattress; the nightstand gives best results.',
      'Use "Exclude from score" on History sessions that were abnormal (travel, illness, unusual schedule).',
      'Your AI insights improve as you log more nights — aim for at least 7 sessions.',
    ],
  },
  {
    icon: '⚠️',
    title: 'Limitations & Disclaimer',
    tips: [
      'This app uses phone accelerometer data as a proxy for sleep — it cannot measure actual sleep stages (REM, deep sleep, etc.).',
      'Results are not a substitute for professional medical advice, diagnosis, or treatment.',
      'If you regularly experience poor sleep, daytime fatigue, or suspect a sleep disorder, please consult a licensed healthcare provider.',
      'Scores may be inaccurate if your phone moves for reasons unrelated to sleep (pets, children, partners).',
      'This tool is intended for personal wellness tracking only and is not FDA-cleared or CE-marked as a medical device.',
    ],
  },
]

export default function GuidelinesPage() {
  return (
    <div className="px-4 pt-6 pb-4 animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-slate-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">How to Use Somnus</h1>
          <p className="text-slate-500 text-xs mt-0.5">App guide, privacy info & limitations</p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <div key={section.title} className="bg-bg-secondary rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{section.icon}</span>
              <h2 className="text-slate-100 font-semibold">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.tips.map((tip, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="text-accent-teal text-xs mt-1 flex-shrink-0">•</span>
                  <span className="text-slate-400 text-sm leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <p className="text-red-400 text-xs font-semibold mb-1.5">Medical Disclaimer</p>
        <p className="text-slate-500 text-xs leading-relaxed">
          Somnus is a personal wellness tool and is <strong className="text-slate-400">not a medical device</strong>. It does not diagnose, treat, or monitor any medical condition. Sleep scores are estimates based on phone sensor data and should not be used as the basis for medical decisions. Always consult a qualified healthcare professional regarding any concerns about your sleep health.
        </p>
      </div>

      <p className="text-slate-600 text-xs text-center mt-5 leading-relaxed px-2">
        Version 1.0 · Built for Anthropic Hackathon 2025
      </p>
    </div>
  )
}
