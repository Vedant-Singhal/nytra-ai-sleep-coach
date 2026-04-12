'use client'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Medal, Award, Trophy, Star, Moon, Target, Sparkles, Newspaper } from 'lucide-react'
import { formatDuration, formatTime, scoreColor, scoreLabel, computeStreak } from '@/lib/scorer'
import { getSessions } from '@/lib/storage'
import { getCommunityFeed, searchUsers, setReaction, toggleFollow } from '@/lib/community'
import { getClient } from '@/lib/supabase'
import type { CommunityUser, FeedEntry, ReactionEmoji, SleepSession } from '@/types'

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_LEADERBOARD_WEEK = [
  { username: 'ryan_k', avgScore: 91, streak: 14, nights: 7, badge: <Medal className="w-4 h-4 text-yellow-500" /> },
  { username: 'alex_m', avgScore: 85, streak: 9, nights: 7, badge: <Medal className="w-4 h-4 text-slate-400" /> },
  { username: 'priya_s', avgScore: 78, streak: 7, nights: 6, badge: <Award className="w-4 h-4 text-amber-600" /> },
  { username: 'james_t', avgScore: 63, streak: 5, nights: 5, badge: null },
  { username: 'sara_b', avgScore: 59, streak: 2, nights: 4, badge: null },
  { username: 'leo_p', avgScore: 55, streak: 1, nights: 3, badge: null },
  { username: 'nina_w', avgScore: 51, streak: 0, nights: 2, badge: null },
]

const MOCK_LEADERBOARD_MONTH = [
  { username: 'ryan_k', avgScore: 88, streak: 28, nights: 30, badge: <Medal className="w-4 h-4 text-yellow-500" /> },
  { username: 'priya_s', avgScore: 81, streak: 22, nights: 28, badge: <Medal className="w-4 h-4 text-slate-400" /> },
  { username: 'alex_m', avgScore: 79, streak: 18, nights: 27, badge: <Award className="w-4 h-4 text-amber-600" /> },
  { username: 'mei_l', avgScore: 67, streak: 10, nights: 24, badge: null },
  { username: 'james_t', avgScore: 64, streak: 12, nights: 22, badge: null },
  { username: 'sara_b', avgScore: 61, streak: 8, nights: 20, badge: null },
  { username: 'nina_w', avgScore: 53, streak: 4, nights: 15, badge: null },
]

const CHALLENGES = [
  {
    id: 'c1',
    title: '7-Hour Club',
    desc: 'Sleep 7+ hours for 5 nights this week',
    icon: <Star className="w-5 h-5 text-teal-400" />,
    color: '#5EEAD4',
    endDays: 3,
    participants: 147,
    communityProgress: 68, // % of participants hitting it
    target: 5,
    unit: 'nights',
  },
  {
    id: 'c2',
    title: 'Lights Out Early',
    desc: 'Be in bed before 11 PM for 3 nights',
    icon: <Moon className="w-5 h-5 text-indigo-400" />,
    color: '#818CF8',
    endDays: 3,
    participants: 89,
    communityProgress: 54,
    target: 3,
    unit: 'nights',
  },
  {
    id: 'c3',
    title: 'Consistency King',
    desc: 'Same bedtime (±15 min) for 7 nights straight',
    icon: <Target className="w-5 h-5 text-amber-500" />,
    color: '#F59E0B',
    endDays: 6,
    participants: 62,
    communityProgress: 31,
    target: 7,
    unit: 'nights',
  },
]

const PAST_CHALLENGES = [
  { title: 'Weekend Warrior', winner: 'ryan_k', desc: 'Best sleep score on a Saturday', icon: <Trophy className="w-5 h-5 text-yellow-500" />, weekAgo: 1 },
  { title: 'Perfect Week', winner: 'alex_m', desc: '7 tracked nights in a row', icon: <Sparkles className="w-5 h-5 text-teal-400" />, weekAgo: 2 },
]

type Tab = 'feed' | 'leaderboard' | 'challenges'
type FeedScope = 'following' | 'discover'
type FeedItem = FeedEntry & { streak: number; isPB: boolean; badges: string[]; isLocal?: boolean }

const REACTIONS: ReactionEmoji[] = ['💤', '💪', '🔥']

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ username, score, size = 36 }: { username: string; score: number; size?: number }) {
  const color = scoreColor(score)
  const initials = username.slice(0, 2).toUpperCase()
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-bg-primary text-xs"
        style={{ background: `${color}30`, border: `2px solid ${color}50`, fontSize: size * 0.3 }}>
        {initials}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [tab, setTab] = useState<Tab>('feed')
  const [scope, setScope] = useState<FeedScope>('following')
  const [lbPeriod, setLbPeriod] = useState<'week' | 'month'>('week')
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<CommunityUser[]>([])
  const [mySessions, setMySessions] = useState<SleepSession[]>([])
  const [myShared, setMyShared] = useState<FeedItem[]>([])

  useEffect(() => {
    const sessions = getSessions()
    const bestScore = sessions.length > 0 ? Math.max(...sessions.map(x => x.score)) : -1
    setMySessions(sessions)
    const shared = sessions.filter(s => s.isShared).slice(0, 3).map(s => ({
      username: 'you',
      avatarUrl: undefined,
      userId: 'local_me',
      session: s,
      reactionCounts: { '💤': 0, '💪': 0, '🔥': 0 },
      viewerReaction: null,
      isFollowingAuthor: false,
      streak: computeStreak(sessions.filter(x => !x.isExcluded)),
      isPB: s.score === bestScore,
      badges: s.score >= 90 ? ['🌟'] : [],
      isLocal: true,
    }))
    setMyShared(shared)

    let mounted = true
    getClient().auth.getUser().then(({ data }) => {
      if (!mounted) return
      setViewerId(data.user?.id ?? null)
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!viewerId) return

    let mounted = true
    setFeedLoading(true)
    setFeedError(null)

    getCommunityFeed(viewerId, scope)
      .then(rows => {
        if (!mounted) return
        setFeed(rows.map(entry => ({
          ...entry,
          streak: 0,
          isPB: false,
          badges: [],
        })))
      })
      .catch(() => {
        if (!mounted) return
        setFeedError('Could not load community feed right now.')
      })
      .finally(() => {
        if (mounted) setFeedLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [viewerId, scope])

  function applyReaction(entry: FeedItem, nextReaction: ReactionEmoji) {
    const current = entry.viewerReaction
    const finalReaction = current === nextReaction ? null : nextReaction
    const nextCounts = { ...entry.reactionCounts }
    if (current) nextCounts[current] = Math.max(0, nextCounts[current] - 1)
    if (finalReaction) nextCounts[finalReaction] += 1
    return {
      ...entry,
      viewerReaction: finalReaction,
      reactionCounts: nextCounts,
    }
  }

  async function handleReaction(id: string, nextReaction: ReactionEmoji) {
    if (!viewerId) {
      setActionError('Sign in to react to community posts.')
      return
    }

    const snapshot = feed
    const target = snapshot.find(x => x.session.id === id)
    if (!target || target.userId === viewerId || target.isLocal) return

    const optimistic = applyReaction(target, nextReaction)
    setFeed(prev => prev.map(e => (e.session.id === id ? optimistic : e)))
    setActionError(null)

    try {
      await setReaction(id, viewerId, optimistic.viewerReaction)
    } catch {
      setFeed(snapshot)
      setActionError('Could not save your reaction. Please try again.')
    }
  }

  async function handleToggleFollow(targetUserId: string, isFollowing: boolean) {
    if (!viewerId) {
      setActionError('Sign in to follow people.')
      return
    }
    if (targetUserId === viewerId) return

    setActionError(null)
    setFeed(prev => prev.map(entry =>
      entry.userId === targetUserId ? { ...entry, isFollowingAuthor: !isFollowing } : entry
    ))
    setSearchResults(prev => prev.map(entry =>
      entry.id === targetUserId ? { ...entry, isFollowing: !isFollowing } : entry
    ))

    try {
      await toggleFollow(viewerId, targetUserId, isFollowing)
      if (scope === 'following' && isFollowing) {
        setFeed(prev => prev.filter(entry => entry.userId !== targetUserId))
      }
    } catch {
      setFeed(prev => prev.map(entry =>
        entry.userId === targetUserId ? { ...entry, isFollowingAuthor: isFollowing } : entry
      ))
      setSearchResults(prev => prev.map(entry =>
        entry.id === targetUserId ? { ...entry, isFollowing } : entry
      ))
      setActionError('Could not update follow status. Please retry.')
    }
  }

  async function runSearch() {
    if (!viewerId || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    setActionError(null)
    try {
      const users = await searchUsers(viewerId, searchQuery)
      setSearchResults(users)
    } catch {
      setActionError('User search failed. Try again in a moment.')
    } finally {
      setSearchLoading(false)
    }
  }

  const myStreak = mySessions.length ? computeStreak(mySessions.filter(s => !s.isExcluded)) : 0
  const myAvgScore = mySessions.length
    ? Math.round(mySessions.slice(0, 7).reduce((s, x) => s + x.score, 0) / Math.min(7, mySessions.length))
    : 0

  const lb = lbPeriod === 'week' ? MOCK_LEADERBOARD_WEEK : MOCK_LEADERBOARD_MONTH

  // Insert "You" into leaderboard if we have data
  const myLbEntry = mySessions.length > 0
    ? { username: 'you', avgScore: myAvgScore, streak: myStreak, nights: mySessions.length, badge: null, isMe: true }
    : null

  const fullLb = myLbEntry
    ? [...lb.map(e => ({ ...e, isMe: false })), myLbEntry]
        .sort((a, b) => b.avgScore - a.avgScore)
        .map((e, i) => ({ ...e, rank: i + 1 }))
    : lb.map((e, i) => ({ ...e, isMe: false, rank: i + 1 }))

  const allFeed = [...myShared, ...feed].sort(
    (a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime()
  )

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Community</h1>
            <p className="text-slate-500 text-xs mt-0.5">Sleep better, together</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-slate-100 font-bold text-sm flex items-center justify-end gap-1">{myStreak} <Sparkles className="w-4 h-4 text-orange-500" /></p>
              <p className="text-slate-600 text-[10px]">your streak</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-bg-secondary rounded-xl p-1">
          {([
            { id: 'feed', label: 'Feed', icon: <Newspaper className="w-4 h-4" /> },
            { id: 'leaderboard', label: 'Ranks', icon: <Trophy className="w-4 h-4" /> },
            { id: 'challenges', label: 'Challenges', icon: <Target className="w-4 h-4" /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-accent-teal text-bg-primary' : 'text-slate-400'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEED ── */}
      {tab === 'feed' && (
        <div className="px-4 space-y-3 pb-4">
          <div className="bg-bg-secondary rounded-2xl p-3.5 border border-bg-tertiary space-y-3">
            <div className="flex gap-1 bg-bg-tertiary rounded-xl p-1">
              {([
                { id: 'following', label: 'Following' },
                { id: 'discover', label: 'Discover' },
              ] as { id: FeedScope; label: string }[]).map(option => (
                <button
                  key={option.id}
                  onClick={() => setScope(option.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    scope === option.id ? 'bg-accent-teal text-bg-primary' : 'text-slate-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={event => {
                event.preventDefault()
                void runSearch()
              }}
              className="flex items-center gap-2"
            >
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Find friends by username"
                className="flex-1 rounded-xl bg-bg-tertiary px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-accent-teal"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-accent-teal text-bg-primary disabled:opacity-60"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center gap-3 bg-bg-tertiary rounded-xl px-3 py-2.5">
                    <Avatar username={user.username} score={72} size={34} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">@{user.username}</p>
                      <p className="text-[11px] text-slate-500">Strava-style friend discovery</p>
                    </div>
                    <button
                      onClick={() => void handleToggleFollow(user.id, user.isFollowing)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                        user.isFollowing
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-accent-teal text-bg-primary'
                      }`}
                    >
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {actionError && (
            <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {actionError}
            </div>
          )}

          {feedError && (
            <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
              {feedError}
            </div>
          )}

          {feedLoading && (
            <div className="rounded-xl bg-bg-secondary border border-bg-tertiary px-3 py-6 text-center text-xs text-slate-500">
              Loading community posts...
            </div>
          )}

          {allFeed.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <span className="text-4xl mb-3">😴</span>
              <p className="text-slate-400 text-sm">
                {scope === 'following' ? 'No followed posts yet.' : 'No discover posts yet.'}
              </p>
              <p className="text-slate-600 text-xs mt-1">
                {scope === 'following'
                  ? 'Search and follow friends to build your feed.'
                  : 'Ask friends to share their latest sleep sessions.'}
              </p>
            </div>
          )}
          {allFeed.map(entry => (
            <FeedCard
              key={entry.session.id}
              entry={entry}
              viewerId={viewerId}
              onReact={emoji => void handleReaction(entry.session.id, emoji)}
              onToggleFollow={() => void handleToggleFollow(entry.userId, entry.isFollowingAuthor)}
            />
          ))}
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {tab === 'leaderboard' && (
        <div className="px-4 pb-6">
          {/* Period toggle */}
          <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 mb-5">
            {(['week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setLbPeriod(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  lbPeriod === p ? 'bg-bg-tertiary text-slate-100' : 'text-slate-500'
                }`}
              >
                This {p}
              </button>
            ))}
          </div>

          {/* Podium for top 3 */}
          <div className="flex items-end justify-center gap-3 mb-6 px-4">
            {[fullLb[1], fullLb[0], fullLb[2]].map((entry, i) => {
              if (!entry) return null
              const heights = [84, 108, 68]
              const isCenter = i === 1
              return (
                <div key={entry.username} className="flex-1 flex flex-col items-center">
                  <p className="text-xs font-semibold text-slate-300 mb-1 truncate">{entry.username === 'you' ? 'You' : entry.username}</p>
                  <p className="font-bold mb-1" style={{ color: scoreColor(entry.avgScore), fontSize: isCenter ? 20 : 16 }}>
                    {entry.avgScore}
                  </p>
                  <div
                    className="w-full rounded-t-xl flex items-center justify-center"
                    style={{
                      height: heights[i],
                      background: isCenter
                        ? 'linear-gradient(180deg, rgba(94,234,212,0.25) 0%, rgba(94,234,212,0.08) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: isCenter ? '1px solid rgba(94,234,212,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-2xl">{isCenter ? '🥇' : i === 0 ? '🥈' : '🥉'}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full ranked list */}
          <div className="space-y-2">
            {fullLb.map(entry => (
              <div
                key={entry.username}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${
                  entry.isMe
                    ? 'border border-accent-teal/30 bg-accent-teal/5'
                    : 'bg-bg-secondary'
                }`}
              >
                <div className="w-7 text-center flex-shrink-0">
                  {entry.rank <= 3
                    ? <span className="text-base">{['🥇','🥈','🥉'][entry.rank - 1]}</span>
                    : <span className="text-slate-500 font-bold text-sm">#{entry.rank}</span>}
                </div>
                <Avatar username={entry.username === 'you' ? 'YO' : entry.username} score={entry.avgScore} />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${entry.isMe ? 'text-accent-teal' : 'text-slate-100'}`}>
                    {entry.username === 'you' ? 'You' : `@${entry.username}`}
                  </p>
                  <p className="text-slate-500 text-xs">{entry.nights} nights · {entry.streak > 0 ? `${entry.streak}🔥` : 'no streak'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg" style={{ color: scoreColor(entry.avgScore) }}>{entry.avgScore}</p>
                  <p className="text-slate-500 text-[10px]">{scoreLabel(entry.avgScore)}</p>
                </div>
              </div>
            ))}
          </div>

          {!myLbEntry && (
            <p className="text-slate-600 text-xs text-center mt-4">Track sleep sessions to appear on the leaderboard</p>
          )}
        </div>
      )}

      {/* ── CHALLENGES ── */}
      {tab === 'challenges' && (
        <div className="px-4 pb-6 space-y-4">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Active This Week</p>
            <div className="space-y-3">
              {CHALLENGES.map(ch => (
                <ChallengeCard key={ch.id} challenge={ch} sessions={mySessions} />
              ))}
            </div>
          </div>

          {/* Past challenges */}
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Past Challenges</p>
            <div className="space-y-2">
              {PAST_CHALLENGES.map(ch => (
                <div key={ch.title} className="bg-bg-secondary rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 text-sm font-semibold">{ch.title}</p>
                    <p className="text-slate-500 text-xs">{ch.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-amber-400 font-medium">🏆 @{ch.winner}</p>
                    <p className="text-slate-600 text-[10px]">{ch.weekAgo}w ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(94,234,212,0.05)', border: '1px solid rgba(94,234,212,0.12)' }}>
            <p className="text-slate-400 text-xs leading-relaxed">
              Challenges reset every Monday at midnight. Your progress is calculated from tracked sessions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Feed card ──────────────────────────────────────────────────────────────────

function FeedCard({
  entry,
  viewerId,
  onReact,
  onToggleFollow,
}: {
  entry: FeedItem
  viewerId: string | null
  onReact: (emoji: ReactionEmoji) => void
  onToggleFollow: () => void
}) {
  const color = scoreColor(entry.session.score)
  const isMe = !!viewerId && entry.userId === viewerId
  const reactions = REACTIONS.map(emoji => ({ emoji, count: entry.reactionCounts[emoji] }))

  return (
    <div className="bg-bg-secondary rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}15` }}>
      {/* Top: avatar + name + time */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar username={isMe ? 'YO' : entry.username} score={entry.session.score} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-100 font-semibold text-sm">{isMe ? 'You' : `@${entry.username}`}</p>
            {entry.streak >= 7 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400/10 text-orange-400 font-medium">{entry.streak}🔥</span>
            )}
            {entry.isPB && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">🌟 PB</span>
            )}
            {entry.badges.filter(b => b !== '🔥' && b !== '🌟').map(b => (
              <span key={b} className="text-sm">{b}</span>
            ))}
          </div>
          <p className="text-slate-500 text-xs">
            {formatDistanceToNow(new Date(entry.session.date), { addSuffix: true })}
          </p>
        </div>
        {/* Score badge */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <div>
            <p className="text-center font-bold text-base leading-none" style={{ color }}>{entry.session.score}</p>
            <p className="text-center text-[9px] mt-0.5" style={{ color: `${color}80` }}>{scoreLabel(entry.session.score)}</p>
          </div>
        </div>

        {!isMe && !entry.isLocal && (
          <button
            onClick={onToggleFollow}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold ${
              entry.isFollowingAuthor
                ? 'bg-bg-tertiary text-slate-300'
                : 'bg-accent-teal text-bg-primary'
            }`}
          >
            {entry.isFollowingAuthor ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Score bar */}
      <div className="mx-4 h-1.5 bg-bg-tertiary rounded-full mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{
          width: `${entry.session.score}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`
        }} />
      </div>

      {/* Stats chips */}
      <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
        {[
          { icon: '⏱', label: formatDuration(entry.session.durationMinutes) },
          { icon: '🌙', label: formatTime(entry.session.bedtime) },
          { icon: '☀️', label: formatTime(entry.session.wakeTime) },
        ].map(chip => (
          <div key={chip.label} className="flex items-center gap-1 bg-bg-tertiary rounded-lg px-2 py-1">
            <span className="text-[11px]">{chip.icon}</span>
            <span className="text-slate-300 text-xs font-medium">{chip.label}</span>
          </div>
        ))}
      </div>

      {/* Reactions row */}
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-3.5 border-t border-bg-tertiary">
        {reactions.map(r => {
          const active = entry.viewerReaction === r.emoji
          return (
            <button
              key={r.emoji}
              onClick={() => onReact(r.emoji)}
              disabled={isMe || entry.isLocal}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'bg-accent-teal/15 text-accent-teal'
                  : 'bg-bg-tertiary text-slate-400 hover:text-slate-200'
              } ${(isMe || entry.isLocal) ? 'opacity-50 cursor-default' : ''}`}
            >
              <span>{r.emoji}</span>
              <span className="font-semibold">{r.count}</span>
            </button>
          )
        })}
        <div className="flex-1" />
        {isMe && <span className="text-slate-600 text-xs">Your post</span>}
      </div>
    </div>
  )
}

// ── Challenge card ──────────────────────────────────────────────────────────────

function ChallengeCard({ challenge: ch, sessions }: {
  challenge: typeof CHALLENGES[0]
  sessions: SleepSession[]
}) {
  // Calculate user's personal progress for this challenge
  const last7 = sessions.slice(0, 7)
  let myProgress = 0

  if (ch.id === 'c1') {
    myProgress = last7.filter(s => s.durationMinutes >= 420).length
  } else if (ch.id === 'c2') {
    myProgress = last7.filter(s => {
      const h = new Date(s.bedtime).getHours()
      return h < 23 || h >= 22
    }).length
  } else if (ch.id === 'c3') {
    myProgress = computeStreak(sessions.filter(s => !s.isExcluded))
  }

  const myPct = Math.min(100, (myProgress / ch.target) * 100)
  const done = myProgress >= ch.target

  return (
    <div className="bg-bg-secondary rounded-2xl p-4" style={{ border: `1px solid ${ch.color}20` }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: `${ch.color}15` }}>
          {ch.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-slate-100 font-semibold text-sm">{ch.title}</p>
            {done && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-400/10 text-green-400 font-medium">✓ Done</span>}
          </div>
          <p className="text-slate-500 text-xs mt-0.5">{ch.desc}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium" style={{ color: ch.color }}>{ch.endDays}d left</p>
          <p className="text-slate-600 text-[10px]">{ch.participants} joined</p>
        </div>
      </div>

      {/* My progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Your progress</span>
          <span className="font-medium" style={{ color: done ? '#22C55E' : ch.color }}>
            {myProgress}/{ch.target} {ch.unit}
          </span>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${myPct}%`, background: done ? '#22C55E' : ch.color }} />
        </div>
      </div>

      {/* Community progress */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-bg-tertiary">
        <div className="flex -space-x-1">
          {['A','B','C','D'].map((l, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-bg-tertiary border border-bg-secondary flex items-center justify-center text-[8px] text-slate-400 font-bold">{l}</div>
          ))}
        </div>
        <p className="text-slate-500 text-xs">
          <span className="text-slate-300 font-medium">{ch.communityProgress}%</span> of participants on track
        </p>
      </div>
    </div>
  )
}
